"""
Curriculum Integration Service

Integrates curriculum standards from curriculum-py-svc into the learner's brain.
Handles location-based curriculum detection and skill alignment.
"""

import httpx
import structlog
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.config.settings import get_settings
from src.services.brain_manager import (
    BrainState,
    CurriculumAlignment,
    KnowledgeNode,
    KnowledgeEdge,
    MasteryLevel,
    get_brain_manager,
)

logger = structlog.get_logger()


# Default curriculum standards by state
STATE_STANDARDS_MAP: Dict[str, List[str]] = {
    "TX": ["TEKS"],
    "VA": ["SOL", "STATE_SPECIFIC"],
    "FL": ["B.E.S.T", "STATE_SPECIFIC"],
    "IN": ["IAS", "STATE_SPECIFIC"],
    "OK": ["OAS", "STATE_SPECIFIC"],
    "SC": ["SCCCR", "STATE_SPECIFIC"],
    # Most states use Common Core
    "DEFAULT": ["COMMON_CORE", "NGSS", "C3"],
}

# Common Core adopters
COMMON_CORE_STATES = {
    "AL", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "GA", "HI",
    "ID", "IL", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI",
    "MN", "MS", "MO", "MT", "NV", "NH", "NJ", "NM", "NY", "NC",
    "ND", "OH", "OR", "PA", "RI", "SD", "TN", "UT", "VT", "WA",
    "WV", "WI", "WY",
}


class CurriculumIntegrationService:
    """
    Service for integrating curriculum standards into learner brains.
    
    Responsibilities:
    1. Detect curriculum standards based on location (ZIP/state)
    2. Fetch curriculum details from curriculum-py-svc
    3. Align brain knowledge graph with curriculum skills
    4. Update brain with curriculum-specific learning paths
    """

    def __init__(self):
        self.settings = get_settings()
        self.curriculum_svc_url = self.settings.curriculum_service_url
        self._http_client: Optional[httpx.AsyncClient] = None

    def get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client

    async def close(self):
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()

    # ══════════════════════════════════════════════════════════════════════════
    # CURRICULUM DETECTION
    # ══════════════════════════════════════════════════════════════════════════

    def detect_curriculum_standards(
        self,
        state_code: Optional[str] = None,
        _zip_code: Optional[str] = None,
    ) -> List[str]:
        """
        Detect applicable curriculum standards based on location.
        
        Args:
            state_code: 2-letter state code (e.g., "TX", "CA")
            _zip_code: 5-digit ZIP code (reserved for future district-specific curricula)
            
        Returns:
            List of curriculum standard codes (e.g., ["TEKS"], ["COMMON_CORE", "NGSS"])
        """
        if not state_code:
            return STATE_STANDARDS_MAP["DEFAULT"]

        state_code = state_code.upper()

        # Check state-specific standards first
        if state_code in STATE_STANDARDS_MAP:
            return STATE_STANDARDS_MAP[state_code]

        # Check if Common Core state
        if state_code in COMMON_CORE_STATES:
            return ["COMMON_CORE", "NGSS", "C3"]

        return STATE_STANDARDS_MAP["DEFAULT"]

    async def lookup_district_curriculum(
        self,
        zip_code: Optional[str] = None,
        state_code: Optional[str] = None,
        district_id: Optional[str] = None,
        district_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Look up district-specific curriculum from curriculum-py-svc.
        
        Args:
            zip_code: 5-digit ZIP code
            state_code: Optional 2-letter state code
            district_id: NCES district ID (overrides ZIP lookup)
            district_name: District name (used if district_id not provided)
            
        Returns:
            District curriculum info including standards and aligned skills
        """
        try:
            client = self.get_http_client()
            
            # Try lookup by district ID first
            if district_id:
                result = await self._lookup_by_district_id(
                    client, district_id, district_name, state_code
                )
                if result:
                    return result
            
            # Try lookup by ZIP code
            if zip_code:
                result = await self._lookup_by_zip(client, zip_code, state_code)
                if result:
                    return result
            
            # Fallback to state-based standards
            return self._create_fallback_response(district_id, district_name, state_code)
            
        except Exception as e:
            logger.warning(
                "curriculum_lookup_failed",
                zip_code=zip_code,
                district_id=district_id,
                error=str(e),
            )
            return self._create_fallback_response(district_id, district_name, state_code)

    async def _lookup_by_district_id(
        self,
        client: httpx.AsyncClient,
        district_id: str,
        district_name: Optional[str],
        state_code: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Look up curriculum by district ID."""
        try:
            curriculum_response = await client.get(
                f"{self.curriculum_svc_url}/api/v1/districts/{district_id}/curriculum"
            )
            if curriculum_response.status_code == 200:
                curriculum_data = curriculum_response.json()
                return {
                    "district_id": district_id,
                    "district_name": district_name,
                    "state_code": curriculum_data.get("state", state_code),
                    "curriculum": curriculum_data.get("curriculum", []),
                    "standards": self.detect_curriculum_standards(
                        curriculum_data.get("state", state_code)
                    ),
                }
        except Exception:
            pass
        return None

    async def _lookup_by_zip(
        self,
        client: httpx.AsyncClient,
        zip_code: str,
        state_code: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Look up curriculum by ZIP code."""
        try:
            response = await client.get(
                f"{self.curriculum_svc_url}/api/v1/districts",
                params={"zip_code": zip_code},
            )
            
            if response.status_code != 200:
                return None

            data = response.json()
            districts = data.get("items", [])
            
            if not districts:
                return None

            district = districts[0]
            
            # Get curriculum for this district
            curriculum_response = await client.get(
                f"{self.curriculum_svc_url}/api/v1/districts/{district['id']}/curriculum"
            )
            
            if curriculum_response.status_code == 200:
                curriculum_data = curriculum_response.json()
                return {
                    "district_id": district["id"],
                    "district_name": district["name"],
                    "state_code": district.get("state", state_code),
                    "curriculum": curriculum_data.get("curriculum", []),
                    "standards": self.detect_curriculum_standards(
                        district.get("state", state_code)
                    ),
                }
        except Exception:
            pass
        return None

    def _create_fallback_response(
        self,
        district_id: Optional[str],
        district_name: Optional[str],
        state_code: Optional[str]
    ) -> Dict[str, Any]:
        """Create fallback response with state-based standards."""
        return {
            "district_id": district_id,
            "district_name": district_name,
            "state_code": state_code,
            "curriculum": [],
            "standards": self.detect_curriculum_standards(state_code),
        }

    async def fetch_standards(
        self,
        curriculum_standards: List[str],
        grade_band: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch educational standards from curriculum-py-svc.
        
        Args:
            curriculum_standards: List of standard frameworks (e.g., ["TEKS", "NGSS"])
            grade_band: Grade band filter (e.g., "K_2", "G3_5")
            domain: Subject domain filter (e.g., "MATH", "ELA")
            
        Returns:
            List of standard definitions
        """
        try:
            client = self.get_http_client()
            all_standards = []
            
            for framework in curriculum_standards:
                params = {"framework": framework}
                if grade_band:
                    params["grade_band"] = grade_band
                if domain:
                    params["domain"] = domain
                
                response = await client.get(
                    f"{self.curriculum_svc_url}/api/v1/standards",
                    params=params,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_standards.extend(data.get("items", []))
            
            return all_standards
            
        except Exception as e:
            logger.warning("standards_fetch_failed", error=str(e))
            return []

    # ══════════════════════════════════════════════════════════════════════════
    # BRAIN CURRICULUM ALIGNMENT
    # ══════════════════════════════════════════════════════════════════════════

    async def align_brain_with_curriculum(
        self,
        brain_state: BrainState,
        state_code: Optional[str] = None,
        zip_code: Optional[str] = None,
        _nces_district_id: Optional[str] = None,
        curriculum_standards: Optional[List[str]] = None,
    ) -> BrainState:
        """
        Align a learner's brain with their curriculum standards.
        
        This method:
        1. Detects or uses provided curriculum standards
        2. Fetches relevant standards from curriculum service
        3. Adds curriculum skills to knowledge graph
        4. Initializes mastery levels for new skills
        5. Creates prerequisite edges based on standards hierarchy
        
        Args:
            brain_state: Current brain state to update
            state_code: 2-letter state code
            zip_code: 5-digit ZIP code
            nces_district_id: NCES district ID for precise matching
            curriculum_standards: Override curriculum standards
            
        Returns:
            Updated brain state with curriculum alignment
        """
        # Detect curriculum if not provided
        if not curriculum_standards:
            if zip_code:
                district_info = await self.lookup_district_curriculum(
                    zip_code, state_code
                )
                curriculum_standards = district_info["standards"]
                brain_state.curriculum_alignment.district_name = district_info.get(
                    "district_name"
                )
                brain_state.curriculum_alignment.nces_district_id = district_info.get(
                    "district_id"
                )
            else:
                curriculum_standards = self.detect_curriculum_standards(state_code)

        # Update curriculum alignment
        brain_state.curriculum_alignment.state_code = state_code
        brain_state.curriculum_alignment.zip_code = zip_code
        brain_state.curriculum_alignment.curriculum_standards = curriculum_standards
        brain_state.curriculum_alignment.last_synced = datetime.now(timezone.utc)

        # Fetch standards for the learner's grade band
        grade_band = self._infer_grade_band(brain_state)
        standards = await self.fetch_standards(curriculum_standards, grade_band)

        # Add standards to knowledge graph
        aligned_skills = []
        for standard in standards:
            skill_id = standard.get("id") or standard.get("code", "")
            if not skill_id:
                continue

            aligned_skills.append(skill_id)

            # Add knowledge node if not exists
            existing_node = brain_state.knowledge_graph.get_node(skill_id)
            if not existing_node:
                node = KnowledgeNode(
                    id=skill_id,
                    type="skill",
                    mastery=0.0,
                    last_updated=datetime.now(timezone.utc),
                    metadata={
                        "name": standard.get("name", ""),
                        "description": standard.get("description", ""),
                        "domain": standard.get("domain", ""),
                        "grade_band": standard.get("grade_band", ""),
                        "framework": standard.get("framework", ""),
                        "source": "curriculum_alignment",
                    },
                )
                brain_state.knowledge_graph.add_node(node)

                # Initialize mastery level
                brain_state.mastery_levels[skill_id] = MasteryLevel(
                    current_level=0.0,
                    target_level=0.8,
                    progress_rate=0.0,
                    last_practiced=None,
                )

            # Add prerequisite edge if parent exists
            parent_id = standard.get("parent_id")
            if parent_id:
                edge = KnowledgeEdge(
                    source=parent_id,
                    target=skill_id,
                    relationship="prerequisite",
                    weight=1.0,
                )
                brain_state.knowledge_graph.add_edge(edge)

        brain_state.curriculum_alignment.aligned_skills = aligned_skills
        brain_state.updated_at = datetime.now(timezone.utc)

        logger.info(
            "brain_curriculum_aligned",
            learner_id=brain_state.learner_id,
            state_code=state_code,
            standards_count=len(curriculum_standards),
            skills_aligned=len(aligned_skills),
        )

        return brain_state

    def _infer_grade_band(self, brain_state: BrainState) -> Optional[str]:
        """Infer grade band from brain state metadata."""
        # Check knowledge graph nodes for grade band hints
        for node in brain_state.knowledge_graph.nodes:
            grade_band = node.metadata.get("grade_band")
            if grade_band:
                return grade_band
        return None

    # ══════════════════════════════════════════════════════════════════════════
    # BRAIN TRAINING INTEGRATION
    # ══════════════════════════════════════════════════════════════════════════

    def create_curriculum_learning_path(
        self,
        brain_state: BrainState,
    ) -> List[Dict[str, Any]]:
        """
        Create a personalized learning path based on curriculum and current mastery.
        
        Orders skills by:
        1. Prerequisites (topological sort)
        2. Current mastery level (lowest first)
        3. Curriculum sequence
        
        Returns:
            Ordered list of skills with recommended activities
        """
        curriculum = brain_state.curriculum_alignment

        if not curriculum.aligned_skills:
            return []

        # Build prerequisite map and topologically sort
        path_order = self._topological_sort_skills(curriculum.aligned_skills, brain_state)

        # Create learning path entries
        learning_path = self._build_learning_path_entries(path_order, brain_state)

        # Sort by priority and mastery
        learning_path.sort(key=lambda x: (-x["priority"], x["current_mastery"]))

        return learning_path

    def _topological_sort_skills(
        self, skill_ids: List[str], brain_state: BrainState
    ) -> List[str]:
        """Topologically sort skills by prerequisites."""
        prereq_map: Dict[str, List[str]] = {}
        for skill_id in skill_ids:
            prereqs = brain_state.knowledge_graph.get_prerequisites(skill_id)
            prereq_map[skill_id] = prereqs

        visited = set()
        path_order = []

        def visit(skill_id: str):
            if skill_id in visited:
                return
            visited.add(skill_id)

            # Visit prerequisites first
            for prereq in prereq_map.get(skill_id, []):
                if prereq in skill_ids:
                    visit(prereq)

            path_order.append(skill_id)

        for skill_id in skill_ids:
            visit(skill_id)

        return path_order

    def _build_learning_path_entries(
        self, skill_ids: List[str], brain_state: BrainState
    ) -> List[Dict[str, Any]]:
        """Build learning path entry dictionaries for skills."""
        learning_path = []

        for skill_id in skill_ids:
            mastery = brain_state.mastery_levels.get(skill_id)
            node = brain_state.knowledge_graph.get_node(skill_id)

            learning_path.append({
                "skill_id": skill_id,
                "name": node.metadata.get("name", skill_id) if node else skill_id,
                "domain": node.metadata.get("domain", "unknown") if node else "unknown",
                "current_mastery": mastery.current_level if mastery else 0.0,
                "target_mastery": mastery.target_level if mastery else 0.8,
                "priority": self._calculate_skill_priority(skill_id, brain_state),
                "recommended_activities": [],  # To be filled by activity service
            })

        return learning_path

    def _calculate_skill_priority(
        self,
        skill_id: str,
        brain_state: BrainState,
    ) -> float:
        """Calculate priority score for a skill."""
        priority = 0.5  # Base priority

        mastery = brain_state.mastery_levels.get(skill_id)
        if mastery:
            # Lower mastery = higher priority
            priority += (1.0 - mastery.current_level) * 0.3

            # Check if skill is being struggled with
            node = brain_state.knowledge_graph.get_node(skill_id)
            if node and node.metadata.get("domain"):
                domain = node.metadata["domain"]
                if domain in brain_state.engagement_profile.struggle_subjects:
                    priority += 0.2

        return min(1.0, priority)


# Global service instance
_curriculum_integration: Optional[CurriculumIntegrationService] = None


def get_curriculum_integration() -> CurriculumIntegrationService:
    """Get global Curriculum Integration Service instance."""
    global _curriculum_integration
    if _curriculum_integration is None:
        _curriculum_integration = CurriculumIntegrationService()
    return _curriculum_integration
