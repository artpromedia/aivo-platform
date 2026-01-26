"""
IEP Extractor

AI-powered extraction of structured data from IEP documents using LLM + pattern matching.
"""

import re
import json
import logging
import uuid
from typing import Dict, List, Optional, Tuple, Any, Protocol
from datetime import datetime

from .models import (
    IEPDomain,
    ServiceType,
    AccommodationCategory,
    ExtractedGoal,
    ExtractedService,
    ExtractedAccommodation,
    PresentLevel,
    IEPExtractionResult,
    DocumentSection,
    StudentInfo,
)

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


class PDFProcessorProtocol(Protocol):
    """Protocol for PDF processor interface."""

    def process(self, pdf_path: str) -> Any:
        """Process PDF and return content."""
        ...

    def process_bytes(self, pdf_bytes: bytes) -> Any:
        """Process PDF from bytes."""
        ...


def generate_id() -> str:
    """Generate a unique identifier."""
    return str(uuid.uuid4())


class IEPExtractor:
    """
    Extracts structured data from IEP documents using LLM + pattern matching.

    Combines:
    - Pattern-based section detection for reliability
    - LLM-based content extraction for flexibility
    - Confidence scoring for quality assessment
    """

    # Section detection patterns
    SECTION_PATTERNS = {
        "goals": [
            re.compile(r"annual\s+goals?", re.IGNORECASE),
            re.compile(r"measurable\s+goals?", re.IGNORECASE),
            re.compile(r"iep\s+goals?", re.IGNORECASE),
            re.compile(r"goal\s*#?\d+", re.IGNORECASE),
            re.compile(r"goals?\s+and\s+objectives?", re.IGNORECASE),
        ],
        "services": [
            re.compile(r"special\s+education\s+services?", re.IGNORECASE),
            re.compile(r"related\s+services?", re.IGNORECASE),
            re.compile(r"service\s+delivery", re.IGNORECASE),
            re.compile(r"minutes\s+per\s+week", re.IGNORECASE),
            re.compile(r"service\s+hours?", re.IGNORECASE),
        ],
        "accommodations": [
            re.compile(r"accommodations?", re.IGNORECASE),
            re.compile(r"modifications?", re.IGNORECASE),
            re.compile(r"supplementary\s+aids?", re.IGNORECASE),
            re.compile(r"testing\s+accommodations?", re.IGNORECASE),
            re.compile(r"classroom\s+accommodations?", re.IGNORECASE),
        ],
        "present_levels": [
            re.compile(r"present\s+levels?", re.IGNORECASE),
            re.compile(r"current\s+performance", re.IGNORECASE),
            re.compile(r"plaafp", re.IGNORECASE),
            re.compile(r"plop", re.IGNORECASE),
            re.compile(r"baseline", re.IGNORECASE),
            re.compile(r"present\s+levels?\s+of\s+(?:academic\s+)?(?:achievement|performance)", re.IGNORECASE),
        ],
    }

    # Domain classification keywords
    DOMAIN_KEYWORDS = {
        IEPDomain.READING: [
            "reading", "comprehension", "decoding", "fluency", "phonics",
            "phonemic", "vocabulary", "sight words", "lexile", "literacy"
        ],
        IEPDomain.WRITING: [
            "writing", "composition", "handwriting", "spelling", "grammar",
            "written expression", "sentence", "paragraph", "essay"
        ],
        IEPDomain.MATH: [
            "math", "mathematics", "computation", "problem solving", "numeracy",
            "arithmetic", "calculation", "number sense", "algebra", "geometry"
        ],
        IEPDomain.COMMUNICATION: [
            "speech", "articulation", "language", "communication", "expressive",
            "receptive", "phonology", "pragmatic", "AAC", "augmentative"
        ],
        IEPDomain.SOCIAL_EMOTIONAL: [
            "social", "emotional", "peer interaction", "friendship",
            "self-awareness", "relationship", "empathy", "cooperation"
        ],
        IEPDomain.BEHAVIOR: [
            "behavior", "conduct", "self-regulation", "impulse control",
            "attention", "on-task", "compliance", "following directions"
        ],
        IEPDomain.MOTOR: [
            "motor", "fine motor", "gross motor", "coordination", "physical",
            "cutting", "grip", "balance", "mobility", "OT", "PT"
        ],
        IEPDomain.DAILY_LIVING: [
            "daily living", "self-care", "independence", "functional",
            "life skills", "self-help", "hygiene", "dressing"
        ],
        IEPDomain.VOCATIONAL: [
            "vocational", "career", "job", "employment", "work",
            "transition", "post-secondary", "occupation"
        ],
        IEPDomain.EXECUTIVE_FUNCTION: [
            "executive function", "organization", "planning", "time management",
            "working memory", "task initiation", "flexibility", "self-monitoring"
        ],
    }

    # Service type classification
    SERVICE_KEYWORDS = {
        ServiceType.SPECIAL_EDUCATION: ["special education", "specialized instruction", "resource"],
        ServiceType.SPEECH_LANGUAGE: ["speech", "language therapy", "SLP", "speech-language"],
        ServiceType.OCCUPATIONAL_THERAPY: ["occupational therapy", "OT", "fine motor"],
        ServiceType.PHYSICAL_THERAPY: ["physical therapy", "PT", "gross motor", "mobility"],
        ServiceType.COUNSELING: ["counseling", "therapy", "mental health", "psychological"],
        ServiceType.BEHAVIORAL_SUPPORT: ["behavioral", "behavior support", "ABA", "BCBA"],
        ServiceType.ASSISTIVE_TECHNOLOGY: ["assistive technology", "AT", "AAC"],
        ServiceType.TRANSPORTATION: ["transportation", "bus", "transport"],
        ServiceType.VISION_SERVICES: ["vision", "TVI", "orientation and mobility"],
        ServiceType.HEARING_SERVICES: ["hearing", "audiology", "deaf", "hard of hearing"],
        ServiceType.NURSING: ["nursing", "health services", "medical"],
        ServiceType.SOCIAL_WORK: ["social work", "family support"],
        ServiceType.PSYCHOLOGY: ["psychology", "psychologist", "psychological services"],
    }

    # Accommodation category keywords
    ACCOMMODATION_KEYWORDS = {
        AccommodationCategory.PRESENTATION: [
            "read aloud", "audio", "large print", "braille", "visual supports",
            "graphic organizer", "highlighted", "simplified language"
        ],
        AccommodationCategory.RESPONSE: [
            "scribe", "speech-to-text", "word processor", "calculator",
            "spell check", "verbal response", "pointing", "dictation"
        ],
        AccommodationCategory.SETTING: [
            "preferential seating", "small group", "separate location",
            "reduced distractions", "quiet", "individual", "private"
        ],
        AccommodationCategory.TIMING: [
            "extended time", "breaks", "multiple sessions", "flexible schedule",
            "time and a half", "double time", "additional time"
        ],
        AccommodationCategory.SCHEDULING: [
            "flexible scheduling", "time of day", "order of activities",
            "duration", "frequent breaks"
        ],
        AccommodationCategory.ORGANIZATION: [
            "checklist", "planner", "visual schedule", "assignment notebook",
            "color coding", "organizational tools"
        ],
    }

    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        pdf_processor: Optional[PDFProcessorProtocol] = None,
    ):
        """
        Initialize IEP Extractor.

        Args:
            llm_client: LLM client for AI-based extraction (optional for pattern-only mode)
            pdf_processor: PDF processor for text extraction
        """
        self.llm = llm_client
        self.pdf = pdf_processor

    async def extract(
        self,
        document_path: Optional[str] = None,
        document_bytes: Optional[bytes] = None,
        learner_id: Optional[str] = None,
        use_llm: bool = True,
    ) -> IEPExtractionResult:
        """
        Extract all IEP components from document.

        Process:
        1. Extract text from PDF with page numbers
        2. Identify sections using patterns
        3. Extract goals, services, accommodations, present levels
        4. Validate and score confidence
        5. Return structured result

        Args:
            document_path: Path to PDF file
            document_bytes: PDF as bytes (alternative to path)
            learner_id: Optional learner ID to associate
            use_llm: Whether to use LLM for extraction (falls back to pattern-only if False or no LLM)

        Returns:
            IEPExtractionResult with all extracted data
        """
        start_time = datetime.utcnow()

        # Validate input
        if not document_path and not document_bytes:
            raise ValueError("Either document_path or document_bytes must be provided")

        # Extract text from PDF
        if self.pdf:
            if document_bytes:
                pdf_content = self.pdf.process_bytes(document_bytes)
            else:
                pdf_content = self.pdf.process(document_path)
            pages = self._convert_pdf_content_to_pages(pdf_content)
        else:
            # Fallback: try to import and create processor
            from ..extractors.pdf_processor import PDFProcessor
            processor = PDFProcessor()
            if document_bytes:
                pdf_content = processor.process_bytes(document_bytes)
            else:
                pdf_content = processor.process(document_path)
            pages = self._convert_pdf_content_to_pages(pdf_content)

        total_pages = len(pages)
        ocr_pages = [p["page_number"] for p in pages if p.get("ocr_used", False)]

        # Identify sections
        sections = self._identify_sections(pages)

        # Extract each component
        should_use_llm = use_llm and self.llm is not None

        goals = await self._extract_goals(sections.get("goals", []), should_use_llm)
        services = await self._extract_services(sections.get("services", []), should_use_llm)
        accommodations = await self._extract_accommodations(sections.get("accommodations", []), should_use_llm)
        present_levels = await self._extract_present_levels(sections.get("present_levels", []), should_use_llm)

        # Extract student info and metadata
        full_text = "\n\n".join([p["text"] for p in pages])
        student_info = self._extract_student_info(full_text)
        metadata = self._extract_metadata(full_text)

        # Calculate overall confidence
        all_confidences = (
            [g.confidence_score for g in goals] +
            [s.confidence_score for s in services] +
            [a.confidence_score for a in accommodations] +
            [p.confidence_score for p in present_levels]
        )
        overall_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

        # Generate warnings
        warnings = self._generate_warnings(goals, services, accommodations, present_levels)

        # Calculate processing time
        processing_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        return IEPExtractionResult(
            document_id=generate_id(),
            learner_id=learner_id,
            student=student_info,
            goals=goals,
            services=services,
            accommodations=accommodations,
            present_levels=present_levels,
            iep_date=metadata.get("iep_date"),
            annual_review_date=metadata.get("review_date"),
            eligibility_category=metadata.get("eligibility"),
            placement=metadata.get("placement"),
            time_in_general_ed_percent=metadata.get("time_in_general_ed"),
            total_pages=total_pages,
            extraction_timestamp=datetime.utcnow(),
            overall_confidence=overall_confidence,
            extraction_warnings=warnings,
            ocr_pages=ocr_pages,
            processing_time_ms=processing_time_ms,
        )

    def _convert_pdf_content_to_pages(self, pdf_content) -> List[Dict[str, Any]]:
        """Convert PDFContent to list of page dictionaries."""
        pages = []
        for page in pdf_content.pages:
            pages.append({
                "page_number": page.page_number,
                "text": page.text,
                "ocr_used": page.ocr_used,
                "confidence": page.confidence,
            })
        return pages

    def _identify_sections(self, pages: List[Dict[str, Any]]) -> Dict[str, List[DocumentSection]]:
        """
        Identify IEP sections within the document.

        Uses pattern matching to detect section boundaries and classify content.
        """
        sections: Dict[str, List[DocumentSection]] = {
            "goals": [],
            "services": [],
            "accommodations": [],
            "present_levels": [],
        }

        for page in pages:
            page_text = page["text"]
            page_num = page["page_number"]

            for section_type, patterns in self.SECTION_PATTERNS.items():
                for pattern in patterns:
                    for match in pattern.finditer(page_text):
                        # Extract surrounding context (up to 3000 chars after match)
                        start = match.start()
                        end = min(start + 3000, len(page_text))

                        # Try to find natural section end
                        next_section = self._find_next_section_start(page_text, match.end())
                        if next_section and next_section < end:
                            end = next_section

                        section_text = page_text[start:end]

                        section = DocumentSection(
                            section_type=section_type,
                            text=section_text,
                            page_number=page_num,
                            start_position=start,
                            end_position=end,
                            confidence=0.8 if len(section_text) > 100 else 0.5,
                        )

                        # Avoid duplicates
                        if not self._is_duplicate_section(section, sections[section_type]):
                            sections[section_type].append(section)

        return sections

    def _find_next_section_start(self, text: str, start: int) -> Optional[int]:
        """Find where the next major section starts."""
        # Look for common section headers
        section_headers = [
            r"\n\s*(?:SECTION|PART)\s+[IVX\d]+",
            r"\n\s*[A-Z][A-Z\s]{10,}(?:\n|:)",
            r"\n\s*(?:Goals?|Services?|Accommodations?|Present Levels?)\s*(?:\n|:)",
        ]

        earliest = None
        for pattern in section_headers:
            match = re.search(pattern, text[start:], re.IGNORECASE)
            if match:
                pos = start + match.start()
                if earliest is None or pos < earliest:
                    earliest = pos

        return earliest

    def _is_duplicate_section(self, new_section: DocumentSection, existing: List[DocumentSection]) -> bool:
        """Check if section is duplicate based on text overlap."""
        for section in existing:
            if (section.page_number == new_section.page_number and
                abs(section.start_position - new_section.start_position) < 100):
                return True
            # Check text similarity
            if len(new_section.text) > 50 and new_section.text[:50] in section.text:
                return True
        return False

    async def _extract_goals(
        self,
        goal_sections: List[DocumentSection],
        use_llm: bool,
    ) -> List[ExtractedGoal]:
        """Extract goals using LLM and/or pattern matching."""
        goals = []

        for section in goal_sections:
            if use_llm:
                extracted = await self._llm_extract_goals(section)
                goals.extend(extracted)
            else:
                extracted = self._pattern_extract_goals(section)
                goals.extend(extracted)

        # Deduplicate goals
        return self._deduplicate_goals(goals)

    async def _llm_extract_goals(self, section: DocumentSection) -> List[ExtractedGoal]:
        """Extract goals using LLM."""
        if not self.llm:
            return self._pattern_extract_goals(section)

        prompt = f"""Extract IEP goals from the following text. For each goal, identify:
1. Goal number/identifier (e.g., "1", "1.a", "Reading Goal 1")
2. Domain (one of: reading, writing, math, communication, social_emotional, behavior, motor, daily_living, vocational, executive_function, other)
3. Complete goal text
4. Baseline (current performance level if stated)
5. Target (expected outcome if stated)
6. Measurement method (how progress will be measured)
7. Measurement frequency (how often progress will be measured)
8. Any objectives/benchmarks (short-term objectives)

TEXT:
{section.text}

Return as JSON array with structure:
[{{
    "goal_number": "string",
    "domain": "string",
    "goal_text": "string",
    "baseline": "string or null",
    "target": "string or null",
    "measurement_method": "string or null",
    "measurement_frequency": "string or null",
    "objectives": ["string"]
}}]

Return ONLY the JSON array, no other text."""

        try:
            response = await self.llm.generate(prompt, temperature=0.1)
            goals_data = self._parse_json_response(response)

            goals = []
            for data in goals_data:
                domain = self._parse_domain(data.get("domain", "other"))
                goals.append(ExtractedGoal(
                    goal_number=str(data.get("goal_number", str(len(goals) + 1))),
                    domain=domain,
                    goal_text=data.get("goal_text", ""),
                    baseline=data.get("baseline"),
                    target=data.get("target"),
                    measurement_method=data.get("measurement_method"),
                    measurement_frequency=data.get("measurement_frequency"),
                    page_reference=section.page_number,
                    confidence_score=0.85,  # High confidence for LLM extraction
                    objectives=data.get("objectives", []),
                ))
            return goals

        except Exception as e:
            logger.warning(f"LLM goal extraction failed: {e}, falling back to pattern matching")
            return self._pattern_extract_goals(section)

    def _pattern_extract_goals(self, section: DocumentSection) -> List[ExtractedGoal]:
        """Extract goals using pattern matching."""
        goals = []
        text = section.text

        # Pattern for goal headers
        goal_pattern = re.compile(
            r"(?:Annual\s+)?Goal\s*[#:]?\s*(\d+(?:\.\d+)?(?:[a-z])?)[:\s]+(.+?)(?=(?:Annual\s+)?Goal\s*[#:]?\s*\d|$)",
            re.IGNORECASE | re.DOTALL
        )

        matches = goal_pattern.findall(text)

        if not matches:
            # Try numbered list pattern
            numbered_pattern = re.compile(
                r"(\d+)\.\s+(.+?)(?=\n\d+\.|$)",
                re.DOTALL
            )
            matches = numbered_pattern.findall(text)

        for num, content in matches:
            content = content.strip()
            if len(content) < 20:
                continue

            domain = self._classify_domain(content)
            baseline = self._extract_baseline(content)
            target = self._extract_target(content)
            measurement = self._extract_measurement(content)

            goals.append(ExtractedGoal(
                goal_number=str(num),
                domain=domain,
                goal_text=content[:500],
                baseline=baseline,
                target=target,
                measurement_method=measurement,
                measurement_frequency=self._extract_frequency(content),
                page_reference=section.page_number,
                confidence_score=self._calculate_goal_confidence(baseline, target, measurement),
                objectives=self._extract_objectives(content),
            ))

        return goals

    async def _extract_services(
        self,
        service_sections: List[DocumentSection],
        use_llm: bool,
    ) -> List[ExtractedService]:
        """Extract services using LLM and/or pattern matching."""
        services = []

        for section in service_sections:
            # Try pattern extraction first (often more reliable for structured tables)
            pattern_services = self._pattern_extract_services(section)

            if pattern_services:
                services.extend(pattern_services)
            elif use_llm:
                llm_services = await self._llm_extract_services(section)
                services.extend(llm_services)

        return services

    async def _llm_extract_services(self, section: DocumentSection) -> List[ExtractedService]:
        """Extract services using LLM."""
        if not self.llm:
            return []

        prompt = f"""Extract special education and related services from this text.
For each service, identify:
1. Service type (special_education, speech_language, occupational_therapy, physical_therapy, counseling, behavioral_support, assistive_technology, transportation, other)
2. Description
3. Minutes per session
4. Sessions per week
5. Total minutes per week
6. Provider type (specialist, teacher, aide)
7. Location/setting (general_ed, resource, separate)

TEXT:
{section.text}

Return as JSON array:
[{{
    "service_type": "string",
    "description": "string",
    "minutes_per_session": number or null,
    "sessions_per_week": number or null,
    "total_minutes_per_week": number or null,
    "provider_type": "string or null",
    "location": "string or null"
}}]

Return ONLY the JSON array."""

        try:
            response = await self.llm.generate(prompt, temperature=0.1)
            services_data = self._parse_json_response(response)

            services = []
            for data in services_data:
                service_type = self._parse_service_type(data.get("service_type", "other"))
                services.append(ExtractedService(
                    service_type=service_type,
                    service_description=data.get("description", ""),
                    minutes_per_session=data.get("minutes_per_session"),
                    sessions_per_week=data.get("sessions_per_week"),
                    total_minutes_per_week=data.get("total_minutes_per_week"),
                    provider_type=data.get("provider_type"),
                    location=data.get("location"),
                    page_reference=section.page_number,
                    confidence_score=0.85,
                ))
            return services

        except Exception as e:
            logger.warning(f"LLM service extraction failed: {e}")
            return []

    def _pattern_extract_services(self, section: DocumentSection) -> List[ExtractedService]:
        """Extract services using regex patterns for common formats."""
        services = []
        text = section.text

        # Pattern: "30 minutes/week of Speech-Language"
        pattern1 = re.compile(
            r"(\d+)\s*(?:minutes?|mins?)\s*(?:per|/)\s*(?:week|wk)\s*(?:of)?\s*([A-Za-z\s\-]+)",
            re.IGNORECASE
        )

        # Pattern: "Speech-Language: 30 minutes/week"
        pattern2 = re.compile(
            r"([A-Za-z\s\-]+?):\s*(\d+)\s*(?:minutes?|mins?)\s*(?:per|/)\s*(?:week|wk)",
            re.IGNORECASE
        )

        # Pattern: "Speech Therapy - 2x30 min/week" or "OT 2 x 30 minutes per week"
        pattern3 = re.compile(
            r"([A-Za-z\s\-]+?)[\s\-:]+(\d+)\s*[xX]\s*(\d+)\s*(?:min|minutes?)\s*(?:per|/)\s*(?:week|wk)?",
            re.IGNORECASE
        )

        for minutes, service_name in pattern1.findall(text):
            service_type = self._classify_service_type(service_name)
            services.append(ExtractedService(
                service_type=service_type,
                service_description=service_name.strip(),
                total_minutes_per_week=int(minutes),
                page_reference=section.page_number,
                confidence_score=0.85,
            ))

        for service_name, minutes in pattern2.findall(text):
            if not any(s.service_description.lower() == service_name.lower().strip() for s in services):
                service_type = self._classify_service_type(service_name)
                services.append(ExtractedService(
                    service_type=service_type,
                    service_description=service_name.strip(),
                    total_minutes_per_week=int(minutes),
                    page_reference=section.page_number,
                    confidence_score=0.85,
                ))

        for service_name, sessions, minutes in pattern3.findall(text):
            if not any(s.service_description.lower() == service_name.lower().strip() for s in services):
                service_type = self._classify_service_type(service_name)
                services.append(ExtractedService(
                    service_type=service_type,
                    service_description=service_name.strip(),
                    minutes_per_session=int(minutes),
                    sessions_per_week=float(sessions),
                    total_minutes_per_week=int(sessions) * int(minutes),
                    page_reference=section.page_number,
                    confidence_score=0.80,
                ))

        return services

    async def _extract_accommodations(
        self,
        accommodation_sections: List[DocumentSection],
        use_llm: bool,
    ) -> List[ExtractedAccommodation]:
        """Extract accommodations using LLM and/or pattern matching."""
        accommodations = []

        for section in accommodation_sections:
            if use_llm:
                extracted = await self._llm_extract_accommodations(section)
                accommodations.extend(extracted)
            else:
                extracted = self._pattern_extract_accommodations(section)
                accommodations.extend(extracted)

        return accommodations

    async def _llm_extract_accommodations(self, section: DocumentSection) -> List[ExtractedAccommodation]:
        """Extract accommodations using LLM."""
        if not self.llm:
            return self._pattern_extract_accommodations(section)

        prompt = f"""Extract accommodations and modifications from this text.
For each accommodation, identify:
1. Category (presentation, response, setting, timing, scheduling, organization, assignment, other)
2. Description
3. What it applies to (tests, classwork, homework, all)
4. Whether it's a modification (changes what is learned) vs accommodation (changes how it's learned)

TEXT:
{section.text}

Return as JSON array:
[{{
    "category": "string",
    "description": "string",
    "applies_to": ["string"],
    "is_modification": boolean
}}]

Return ONLY the JSON array."""

        try:
            response = await self.llm.generate(prompt, temperature=0.1)
            accommodations_data = self._parse_json_response(response)

            accommodations = []
            for data in accommodations_data:
                category = self._parse_accommodation_category(data.get("category", "other"))
                accommodations.append(ExtractedAccommodation(
                    category=category,
                    description=data.get("description", ""),
                    applies_to=data.get("applies_to", ["all"]),
                    page_reference=section.page_number,
                    confidence_score=0.85,
                    is_modification=data.get("is_modification", False),
                ))
            return accommodations

        except Exception as e:
            logger.warning(f"LLM accommodation extraction failed: {e}")
            return self._pattern_extract_accommodations(section)

    def _pattern_extract_accommodations(self, section: DocumentSection) -> List[ExtractedAccommodation]:
        """Extract accommodations using pattern matching."""
        accommodations = []
        text = section.text

        # Extract bullet points
        bullet_pattern = re.compile(r"[•\-\*]\s*(.+?)(?=\n[•\-\*]|\n\n|$)")
        bullets = bullet_pattern.findall(text)

        for bullet in bullets:
            bullet = bullet.strip()
            if len(bullet) < 10:
                continue

            category = self._classify_accommodation_category(bullet)
            applies_to = self._extract_applies_to(bullet)

            accommodations.append(ExtractedAccommodation(
                category=category,
                description=bullet,
                applies_to=applies_to,
                page_reference=section.page_number,
                confidence_score=0.70,
                name=bullet[:50],
            ))

        # Also check for keyword matches in running text
        for category, keywords in self.ACCOMMODATION_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text.lower():
                    # Check if not already captured
                    if not any(keyword.lower() in a.description.lower() for a in accommodations):
                        # Find context
                        pattern = rf".{{0,30}}{re.escape(keyword)}.{{0,100}}"
                        match = re.search(pattern, text, re.IGNORECASE)
                        description = match.group(0).strip() if match else keyword

                        accommodations.append(ExtractedAccommodation(
                            category=category,
                            description=description,
                            applies_to=["all"],
                            page_reference=section.page_number,
                            confidence_score=0.65,
                            name=keyword,
                        ))

        return accommodations

    async def _extract_present_levels(
        self,
        present_level_sections: List[DocumentSection],
        use_llm: bool,
    ) -> List[PresentLevel]:
        """Extract present levels using LLM and/or pattern matching."""
        present_levels = []

        for section in present_level_sections:
            if use_llm:
                extracted = await self._llm_extract_present_levels(section)
                present_levels.extend(extracted)
            else:
                extracted = self._pattern_extract_present_levels(section)
                present_levels.extend(extracted)

        return present_levels

    async def _llm_extract_present_levels(self, section: DocumentSection) -> List[PresentLevel]:
        """Extract present levels using LLM."""
        if not self.llm:
            return self._pattern_extract_present_levels(section)

        prompt = f"""Extract present levels of performance from this text.
For each domain area, identify:
1. Domain (reading, writing, math, communication, social_emotional, behavior, motor, daily_living, vocational, executive_function, other)
2. Description of current performance
3. Strengths
4. Needs/areas for growth
5. Any assessment data mentioned

TEXT:
{section.text}

Return as JSON array:
[{{
    "domain": "string",
    "description": "string",
    "strengths": ["string"],
    "needs": ["string"],
    "assessment_data": {{"test_name": "score/result"}}
}}]

Return ONLY the JSON array."""

        try:
            response = await self.llm.generate(prompt, temperature=0.1)
            levels_data = self._parse_json_response(response)

            present_levels = []
            for data in levels_data:
                domain = self._parse_domain(data.get("domain", "other"))
                present_levels.append(PresentLevel(
                    domain=domain,
                    description=data.get("description", ""),
                    strengths=data.get("strengths", []),
                    needs=data.get("needs", []),
                    assessment_data=data.get("assessment_data", {}),
                    page_reference=section.page_number,
                    confidence_score=0.85,
                ))
            return present_levels

        except Exception as e:
            logger.warning(f"LLM present level extraction failed: {e}")
            return self._pattern_extract_present_levels(section)

    def _pattern_extract_present_levels(self, section: DocumentSection) -> List[PresentLevel]:
        """Extract present levels using pattern matching."""
        present_levels = []
        text = section.text

        # Look for domain-specific sections
        for domain in IEPDomain:
            if domain == IEPDomain.OTHER:
                continue

            domain_name = domain.value.replace("_", " ")
            pattern = rf"{domain_name}[:\s]+(.{{50,500}}?)(?=\n[A-Z]|$)"
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)

            if match:
                description = match.group(1).strip()
                present_levels.append(PresentLevel(
                    domain=domain,
                    description=description,
                    strengths=self._extract_strengths(description),
                    needs=self._extract_needs(description),
                    assessment_data={},
                    page_reference=section.page_number,
                    confidence_score=0.60,
                ))

        return present_levels

    def _extract_student_info(self, text: str) -> StudentInfo:
        """Extract student information from document text."""
        header_text = text[:5000]

        student = StudentInfo()

        # Extract student ID
        id_pattern = re.compile(r"(?:Student\s+ID|ID\s*#?|Student\s*#)[:\s]+([A-Z0-9]+)", re.IGNORECASE)
        id_match = id_pattern.search(header_text)
        if id_match:
            student.student_id = id_match.group(1)

        # Extract grade level
        grade_pattern = re.compile(r"Grade[:\s]+(\d+|K|PK|Pre-?K|Kindergarten)", re.IGNORECASE)
        grade_match = grade_pattern.search(header_text)
        if grade_match:
            grade = grade_match.group(1)
            if grade.lower() in ["k", "kindergarten"]:
                grade = "K"
            elif grade.lower() in ["pk", "pre-k", "prek"]:
                grade = "PK"
            student.grade_level = grade

        # Extract date of birth
        dob_pattern = re.compile(
            r"(?:DOB|Date\s+of\s+Birth|Birth\s*date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            re.IGNORECASE
        )
        dob_match = dob_pattern.search(header_text)
        if dob_match:
            student.date_of_birth = self._parse_date(dob_match.group(1))

        # Extract disability categories
        disability_keywords = [
            "Autism", "ASD", "Specific Learning Disability", "SLD",
            "ADHD", "Emotional Disturbance", "Speech or Language Impairment",
            "Intellectual Disability", "Other Health Impairment", "OHI",
            "Orthopedic Impairment", "Visual Impairment", "Hearing Impairment",
            "Multiple Disabilities", "Traumatic Brain Injury", "Developmental Delay"
        ]

        found_disabilities = []
        text_lower = text.lower()
        for disability in disability_keywords:
            if disability.lower() in text_lower:
                if not any(d.lower() in disability.lower() or disability.lower() in d.lower()
                          for d in found_disabilities):
                    found_disabilities.append(disability)

        student.disability_categories = found_disabilities[:3]

        # Extract school name
        school_patterns = [
            r"School[:\s]+([A-Z][A-Za-z\s]+(?:Elementary|Middle|High|School))",
            r"([A-Z][A-Za-z\s]+(?:Elementary|Middle|High)\s+School)",
        ]
        for pattern in school_patterns:
            match = re.search(pattern, header_text)
            if match:
                student.school = match.group(1).strip()
                break

        return student

    def _extract_metadata(self, text: str) -> Dict[str, Any]:
        """Extract IEP metadata from document."""
        metadata = {}
        header_text = text[:3000]

        # IEP date
        date_patterns = {
            "iep_date": ["IEP Date", "Meeting Date", "IEP Meeting"],
            "review_date": ["Review Date", "Annual Review", "Next Review"],
        }

        for key, labels in date_patterns.items():
            for label in labels:
                pattern = rf"{label}[:\s]+(\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{2,4}})"
                match = re.search(pattern, header_text, re.IGNORECASE)
                if match:
                    date = self._parse_date(match.group(1))
                    if date:
                        metadata[key] = date
                        break

        # Placement
        placement_patterns = [
            "general education", "regular education", "inclusion",
            "resource room", "self-contained", "special class",
        ]
        text_lower = text.lower()
        for placement in placement_patterns:
            if placement in text_lower:
                metadata["placement"] = placement
                break

        # Time in general ed percentage
        gen_ed_pattern = re.compile(
            r"(\d+)\s*%\s*(?:of\s+time\s+)?(?:in\s+)?(?:general|regular)\s+education",
            re.IGNORECASE
        )
        match = gen_ed_pattern.search(text)
        if match:
            metadata["time_in_general_ed"] = float(match.group(1))

        return metadata

    def _generate_warnings(
        self,
        goals: List[ExtractedGoal],
        services: List[ExtractedService],
        accommodations: List[ExtractedAccommodation],
        present_levels: List[PresentLevel],
    ) -> List[str]:
        """Generate extraction warnings for quality assessment."""
        warnings = []

        # Check for missing components
        if not goals:
            warnings.append("No goals extracted from document")
        elif len(goals) < 2:
            warnings.append("Fewer than expected goals found (typically IEPs have 2+ goals)")

        if not services:
            warnings.append("No services extracted from document")

        if not accommodations:
            warnings.append("No accommodations extracted from document")

        if not present_levels:
            warnings.append("No present levels extracted from document")

        # Check for low confidence items
        low_confidence_goals = [g for g in goals if g.confidence_score < 0.5]
        if low_confidence_goals:
            warnings.append(f"{len(low_confidence_goals)} goal(s) have low extraction confidence")

        # Check for goals missing key components
        for goal in goals:
            if not goal.measurement_method:
                warnings.append(f"Goal {goal.goal_number}: No measurement method specified")
            if not goal.baseline and not goal.target:
                warnings.append(f"Goal {goal.goal_number}: Missing baseline and target")

        return warnings

    # Helper methods

    def _classify_domain(self, text: str) -> IEPDomain:
        """Classify domain using keyword matching."""
        text_lower = text.lower()
        scores = {}

        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw.lower() in text_lower)
            if score > 0:
                scores[domain] = score

        if scores:
            return max(scores, key=scores.get)
        return IEPDomain.OTHER

    def _classify_service_type(self, text: str) -> ServiceType:
        """Classify service type using keyword matching."""
        text_lower = text.lower()

        for service_type, keywords in self.SERVICE_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    return service_type

        return ServiceType.OTHER

    def _classify_accommodation_category(self, text: str) -> AccommodationCategory:
        """Classify accommodation category."""
        text_lower = text.lower()

        for category, keywords in self.ACCOMMODATION_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    return category

        return AccommodationCategory.OTHER

    def _parse_domain(self, domain_str: str) -> IEPDomain:
        """Parse domain string to enum."""
        domain_str = domain_str.lower().replace(" ", "_")
        try:
            return IEPDomain(domain_str)
        except ValueError:
            return IEPDomain.OTHER

    def _parse_service_type(self, service_str: str) -> ServiceType:
        """Parse service type string to enum."""
        service_str = service_str.lower().replace(" ", "_").replace("-", "_")
        try:
            return ServiceType(service_str)
        except ValueError:
            return ServiceType.OTHER

    def _parse_accommodation_category(self, category_str: str) -> AccommodationCategory:
        """Parse accommodation category string to enum."""
        category_str = category_str.lower().replace(" ", "_")
        try:
            return AccommodationCategory(category_str)
        except ValueError:
            return AccommodationCategory.OTHER

    def _parse_date(self, date_str: str) -> Optional[Any]:
        """Parse date string to date object."""
        from datetime import date as date_type
        formats = [
            "%m/%d/%Y", "%m-%d-%Y", "%m/%d/%y", "%m-%d-%y",
            "%Y-%m-%d", "%d/%m/%Y",
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return date_type(dt.year, dt.month, dt.day)
            except ValueError:
                continue

        return None

    def _parse_json_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse JSON response from LLM."""
        # Clean response
        response = response.strip()

        # Remove markdown code blocks if present
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        # Try to find JSON array
        start = response.find("[")
        end = response.rfind("]") + 1

        if start != -1 and end > start:
            json_str = response[start:end]
            return json.loads(json_str)

        return []

    def _extract_baseline(self, text: str) -> Optional[str]:
        """Extract baseline from goal text."""
        patterns = [
            r"(?:current(?:ly)?|baseline|present(?:ly)?)[:\s]+(.{20,200}?)(?=\.|target|goal|will)",
            r"from\s+(?:a\s+)?(?:current\s+)?(?:level\s+of\s+)?(.{10,100}?)\s+to",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def _extract_target(self, text: str) -> Optional[str]:
        """Extract target from goal text."""
        patterns = [
            r"(?:target|goal|will\s+(?:achieve|reach|attain))[:\s]+(.{20,200}?)(?=\.|$)",
            r"to\s+(?:a\s+)?(?:level\s+of\s+)?(.{10,100})(?=\s+(?:as\s+)?measured|\.|$)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def _extract_measurement(self, text: str) -> Optional[str]:
        """Extract measurement method from text."""
        patterns = [
            r"(?:measured\s+by|assessment|evaluation|progress\s+monitoring)[:\s]+(.{20,200}?)(?=\.|$)",
            r"(\d+%\s+accuracy)",
            r"(\d+\s+(?:out\s+of|/)\s+\d+\s+(?:trials?|attempts?|opportunities))",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def _extract_frequency(self, text: str) -> Optional[str]:
        """Extract measurement frequency from text."""
        patterns = [
            r"(?:weekly|monthly|quarterly|daily|bi-weekly)",
            r"every\s+(\d+)\s+(?:day|week|month)s?",
            r"(\d+)\s+times?\s+per\s+(?:day|week|month)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0).strip()

        return None

    def _extract_objectives(self, text: str) -> List[str]:
        """Extract short-term objectives/benchmarks."""
        objectives = []

        patterns = [
            r"(?:Objective|Benchmark)\s*[#:]?\s*\d+[.:]\s*(.+?)(?=\n(?:Objective|Benchmark)|$)",
            r"(?:Short[- ]term\s+)?Objective[:\s]+(.+?)(?=\n|$)",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            for match in matches[:5]:
                clean = match.strip()
                if len(clean) > 20:
                    objectives.append(clean[:300])

        return objectives

    def _extract_applies_to(self, text: str) -> List[str]:
        """Extract what an accommodation applies to."""
        applies_to = []

        if any(kw in text.lower() for kw in ["test", "assessment", "exam"]):
            applies_to.append("tests")
        if any(kw in text.lower() for kw in ["classwork", "class work", "classroom"]):
            applies_to.append("classwork")
        if any(kw in text.lower() for kw in ["homework", "home work"]):
            applies_to.append("homework")

        if not applies_to or "all" in text.lower():
            applies_to = ["all"]

        return applies_to

    def _extract_strengths(self, text: str) -> List[str]:
        """Extract strengths from present level text."""
        strengths = []

        patterns = [
            r"strength[s]?[:\s]+(.+?)(?=\.|need|weakness|$)",
            r"(?:excels?|strong|good)\s+(?:at|in|with)\s+(.+?)(?=\.|$)",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches[:3]:
                strengths.append(match.strip())

        return strengths

    def _extract_needs(self, text: str) -> List[str]:
        """Extract needs from present level text."""
        needs = []

        patterns = [
            r"need[s]?[:\s]+(.+?)(?=\.|strength|$)",
            r"(?:struggles?|difficulty|challenge)\s+(?:with|in)\s+(.+?)(?=\.|$)",
            r"requires?\s+(?:support|assistance)\s+(?:with|in|for)\s+(.+?)(?=\.|$)",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches[:3]:
                needs.append(match.strip())

        return needs

    def _calculate_goal_confidence(
        self,
        baseline: Optional[str],
        target: Optional[str],
        measurement: Optional[str],
    ) -> float:
        """Calculate confidence score for goal extraction."""
        score = 0.25  # Base score

        if baseline and len(baseline) > 20:
            score += 0.25
        if target and len(target) > 20:
            score += 0.25
        if measurement:
            score += 0.25

        return score

    def _deduplicate_goals(self, goals: List[ExtractedGoal]) -> List[ExtractedGoal]:
        """Remove duplicate goals based on text similarity."""
        unique_goals = []

        for goal in goals:
            is_duplicate = False
            for existing in unique_goals:
                # Check for similar goal numbers or text
                if (goal.goal_number == existing.goal_number or
                    (len(goal.goal_text) > 50 and goal.goal_text[:50] in existing.goal_text)):
                    is_duplicate = True
                    # Keep the one with higher confidence
                    if goal.confidence_score > existing.confidence_score:
                        unique_goals.remove(existing)
                        unique_goals.append(goal)
                    break

            if not is_duplicate:
                unique_goals.append(goal)

        return unique_goals
