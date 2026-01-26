"""
IEP Extraction Service

High-level service for extracting and validating IEP documents.
"""

import logging
from typing import List, Optional, Dict, Any, Protocol
from datetime import datetime

from .models import (
    IEPExtractionResult,
    SMARTValidationResult,
    GoalWithValidation,
    ExtractedGoal,
    IEPExtractionRequest,
    IEPExtractionResponse,
)
from .extractor import IEPExtractor
from .validators import SMARTValidator, GoalQualityAnalyzer

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM client interface."""

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> str:
        """Generate text from prompt."""
        ...


class IEPExtractionService:
    """
    High-level service for IEP document extraction and validation.

    Coordinates:
    - PDF processing
    - Content extraction (goals, services, accommodations, present levels)
    - SMART goal validation
    - Quality analysis

    Example:
        >>> service = IEPExtractionService(llm_client=my_llm)
        >>> result = await service.extract_and_validate("path/to/iep.pdf")
        >>> print(f"Extracted {len(result.goals)} goals with {result.overall_confidence:.0%} confidence")
    """

    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        pdf_processor: Optional[Any] = None,
    ):
        """
        Initialize IEP Extraction Service.

        Args:
            llm_client: LLM client for AI-powered extraction and validation
            pdf_processor: PDF processor for text extraction
        """
        self.llm = llm_client
        self.extractor = IEPExtractor(llm_client=llm_client, pdf_processor=pdf_processor)
        self.validator = SMARTValidator(llm_client=llm_client)
        self.quality_analyzer = GoalQualityAnalyzer(self.validator)

    async def extract(
        self,
        document_path: Optional[str] = None,
        document_bytes: Optional[bytes] = None,
        learner_id: Optional[str] = None,
        use_llm: bool = True,
    ) -> IEPExtractionResult:
        """
        Extract structured data from IEP document.

        Args:
            document_path: Path to PDF file
            document_bytes: PDF content as bytes
            learner_id: Optional learner ID to associate
            use_llm: Whether to use LLM for extraction

        Returns:
            IEPExtractionResult with extracted content
        """
        return await self.extractor.extract(
            document_path=document_path,
            document_bytes=document_bytes,
            learner_id=learner_id,
            use_llm=use_llm,
        )

    async def validate_goals(
        self,
        goals: List[ExtractedGoal],
        use_llm: bool = True,
    ) -> List[SMARTValidationResult]:
        """
        Validate goals against SMART criteria.

        Args:
            goals: List of extracted goals
            use_llm: Whether to use LLM for validation

        Returns:
            List of SMART validation results
        """
        return await self.validator.validate_goals(goals, use_llm)

    async def extract_and_validate(
        self,
        document_path: Optional[str] = None,
        document_bytes: Optional[bytes] = None,
        learner_id: Optional[str] = None,
        use_llm: bool = True,
        validate_goals: bool = True,
    ) -> Dict[str, Any]:
        """
        Extract IEP data and validate goals in one operation.

        This is the primary method for complete IEP processing.

        Args:
            document_path: Path to PDF file
            document_bytes: PDF content as bytes
            learner_id: Optional learner ID to associate
            use_llm: Whether to use LLM for extraction/validation
            validate_goals: Whether to validate goals against SMART criteria

        Returns:
            Dictionary containing:
            - extraction: IEPExtractionResult
            - goal_validations: List of SMARTValidationResult (if validate_goals=True)
            - quality_analysis: Overall quality metrics (if validate_goals=True)
            - goals_with_validation: List of GoalWithValidation (if validate_goals=True)
        """
        start_time = datetime.utcnow()

        # Extract IEP content
        extraction = await self.extract(
            document_path=document_path,
            document_bytes=document_bytes,
            learner_id=learner_id,
            use_llm=use_llm,
        )

        result = {
            "extraction": extraction,
            "goal_validations": [],
            "quality_analysis": None,
            "goals_with_validation": [],
        }

        # Validate goals if requested
        if validate_goals and extraction.goals:
            quality_analysis = await self.quality_analyzer.analyze_goals(
                extraction.goals, use_llm
            )

            result["goal_validations"] = quality_analysis["goal_validations"]
            result["quality_analysis"] = {
                "total_goals": quality_analysis["total_goals"],
                "smart_goals": quality_analysis["smart_goals"],
                "non_smart_goals": quality_analysis["non_smart_goals"],
                "average_scores": quality_analysis["average_scores"],
                "weakest_criterion": quality_analysis["weakest_criterion"],
                "summary_recommendations": quality_analysis["summary_recommendations"],
            }

            # Create paired goal+validation objects
            for goal in extraction.goals:
                validation = next(
                    (v for v in result["goal_validations"] if v.goal_number == goal.goal_number),
                    None
                )
                if validation:
                    result["goals_with_validation"].append(
                        GoalWithValidation(
                            goal=goal,
                            validation=validation,
                            improvements=validation.recommendations,
                        )
                    )

        # Calculate total processing time
        total_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        result["processing_time_ms"] = total_time_ms

        return result

    async def process_request(
        self,
        request: IEPExtractionRequest,
    ) -> IEPExtractionResponse:
        """
        Process an IEP extraction request.

        This method is designed for API integration.

        Args:
            request: IEPExtractionRequest with document and options

        Returns:
            IEPExtractionResponse with results
        """
        start_time = datetime.utcnow()

        try:
            result = await self.extract_and_validate(
                document_path=request.document_path,
                document_bytes=request.document_bytes,
                learner_id=request.learner_id,
                use_llm=True,
                validate_goals=request.validate_goals,
            )

            processing_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            return IEPExtractionResponse(
                success=True,
                result=result["extraction"],
                goal_validations=result.get("goal_validations", []),
                error=None,
                processing_time_ms=processing_time_ms,
            )

        except Exception as e:
            logger.exception(f"IEP extraction failed: {e}")
            processing_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            return IEPExtractionResponse(
                success=False,
                result=None,
                goal_validations=[],
                error=str(e),
                processing_time_ms=processing_time_ms,
            )

    async def revalidate_goal(
        self,
        goal_text: str,
        baseline: Optional[str] = None,
        target: Optional[str] = None,
        measurement_method: Optional[str] = None,
        use_llm: bool = True,
    ) -> SMARTValidationResult:
        """
        Validate a single goal (useful for real-time feedback during goal writing).

        Args:
            goal_text: The goal text to validate
            baseline: Optional baseline/current performance
            target: Optional target/expected outcome
            measurement_method: Optional measurement description
            use_llm: Whether to use LLM for validation

        Returns:
            SMARTValidationResult
        """
        # Create a temporary goal object
        goal = ExtractedGoal(
            goal_number="1",
            domain="other",  # Will be classified during validation if using LLM
            goal_text=goal_text,
            baseline=baseline,
            target=target,
            measurement_method=measurement_method,
            page_reference=0,
            confidence_score=1.0,
        )

        return await self.validator.validate_goal(goal, use_llm)

    async def get_improvement_suggestions(
        self,
        goal: ExtractedGoal,
        validation: Optional[SMARTValidationResult] = None,
        use_llm: bool = True,
    ) -> List[str]:
        """
        Get specific improvement suggestions for a goal.

        Args:
            goal: The goal to improve
            validation: Existing validation (if None, will validate first)
            use_llm: Whether to use LLM

        Returns:
            List of improvement suggestions
        """
        if validation is None:
            validation = await self.validator.validate_goal(goal, use_llm)

        return validation.recommendations

    async def compare_goal_versions(
        self,
        original_goal_text: str,
        revised_goal_text: str,
        use_llm: bool = True,
    ) -> Dict[str, Any]:
        """
        Compare original and revised versions of a goal.

        Useful for showing improvement in goal quality.

        Args:
            original_goal_text: Original goal text
            revised_goal_text: Revised goal text
            use_llm: Whether to use LLM

        Returns:
            Comparison with both validations and improvement metrics
        """
        original_goal = ExtractedGoal(
            goal_number="original",
            domain="other",
            goal_text=original_goal_text,
            page_reference=0,
            confidence_score=1.0,
        )

        revised_goal = ExtractedGoal(
            goal_number="revised",
            domain="other",
            goal_text=revised_goal_text,
            page_reference=0,
            confidence_score=1.0,
        )

        original_validation = await self.validator.validate_goal(original_goal, use_llm)
        revised_validation = await self.validator.validate_goal(revised_goal, use_llm)

        # Calculate improvements
        improvements = {
            "specific": revised_validation.specific_score - original_validation.specific_score,
            "measurable": revised_validation.measurable_score - original_validation.measurable_score,
            "achievable": revised_validation.achievable_score - original_validation.achievable_score,
            "relevant": revised_validation.relevant_score - original_validation.relevant_score,
            "timebound": revised_validation.timebound_score - original_validation.timebound_score,
            "overall": revised_validation.overall_score - original_validation.overall_score,
        }

        return {
            "original": {
                "text": original_goal_text,
                "validation": original_validation,
            },
            "revised": {
                "text": revised_goal_text,
                "validation": revised_validation,
            },
            "improvements": improvements,
            "improved_criteria": [k for k, v in improvements.items() if v > 0],
            "declined_criteria": [k for k, v in improvements.items() if v < 0],
            "overall_improved": improvements["overall"] > 0,
        }


class BatchIEPProcessor:
    """
    Process multiple IEP documents in batch.
    """

    def __init__(self, service: IEPExtractionService):
        """Initialize with an IEP extraction service."""
        self.service = service

    async def process_batch(
        self,
        documents: List[Dict[str, Any]],
        validate_goals: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Process multiple IEP documents.

        Args:
            documents: List of dicts with 'path' or 'bytes' and optional 'learner_id'
            validate_goals: Whether to validate goals

        Returns:
            List of results for each document
        """
        results = []

        for doc in documents:
            try:
                result = await self.service.extract_and_validate(
                    document_path=doc.get("path"),
                    document_bytes=doc.get("bytes"),
                    learner_id=doc.get("learner_id"),
                    validate_goals=validate_goals,
                )
                results.append({
                    "success": True,
                    "document_id": result["extraction"].document_id,
                    "goals_count": len(result["extraction"].goals),
                    "confidence": result["extraction"].overall_confidence,
                    "result": result,
                })
            except Exception as e:
                logger.error(f"Failed to process document: {e}")
                results.append({
                    "success": False,
                    "error": str(e),
                    "document": doc.get("path") or "bytes",
                })

        return results

    async def get_batch_summary(
        self,
        results: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate summary statistics for batch processing results.

        Args:
            results: Results from process_batch

        Returns:
            Summary statistics
        """
        successful = [r for r in results if r.get("success")]
        failed = [r for r in results if not r.get("success")]

        if successful:
            avg_confidence = sum(r["confidence"] for r in successful) / len(successful)
            total_goals = sum(r["goals_count"] for r in successful)
            avg_goals_per_doc = total_goals / len(successful)
        else:
            avg_confidence = 0
            total_goals = 0
            avg_goals_per_doc = 0

        return {
            "total_documents": len(results),
            "successful": len(successful),
            "failed": len(failed),
            "average_confidence": round(avg_confidence, 2),
            "total_goals_extracted": total_goals,
            "average_goals_per_document": round(avg_goals_per_doc, 1),
            "errors": [r.get("error") for r in failed if r.get("error")],
        }
