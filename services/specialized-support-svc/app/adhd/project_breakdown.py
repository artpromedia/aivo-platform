"""
Project Breakdown Service for ADHD learners.

Breaks down projects into ADHD-friendly chunks with clear start points,
completion indicators, and appropriate time estimates.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol

from pydantic import BaseModel, Field

from .models import (
    ADHDProfile,
    EnergyLevel,
    ProjectChunk,
    generate_id,
)

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM client interface."""

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> str:
        """Generate text from a prompt."""
        ...


class ProjectBreakdownConfig(BaseModel):
    """Configuration for project breakdown service."""

    min_chunk_minutes: int = Field(
        default=15,
        ge=10,
        le=30,
        description="Minimum duration for a chunk",
    )
    max_chunk_minutes: int = Field(
        default=45,
        ge=30,
        le=60,
        description="Maximum duration for a chunk",
    )
    target_chunk_minutes: int = Field(
        default=25,
        ge=15,
        le=45,
        description="Target duration for chunks",
    )
    include_buffer: bool = Field(
        default=True,
        description="Whether to add buffer time for transitions",
    )
    buffer_percentage: float = Field(
        default=0.2,
        ge=0.1,
        le=0.5,
        description="Buffer time as percentage of estimated time",
    )
    max_chunks_per_project: int = Field(
        default=20,
        ge=5,
        le=50,
        description="Maximum number of chunks to create",
    )


class ProjectBreakdownService:
    """
    Breaks projects into ADHD-friendly chunks.

    Uses LLM to analyze projects and create appropriately-sized chunks
    with clear task initiation support and completion indicators.
    """

    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        config: Optional[ProjectBreakdownConfig] = None,
    ):
        """
        Initialize the project breakdown service.

        Args:
            llm_client: LLM client for AI-powered breakdown. Optional for fallback mode.
            config: Configuration for chunk sizing and buffer settings.
        """
        self.llm = llm_client
        self.config = config or ProjectBreakdownConfig()

    async def breakdown_project(
        self,
        project_description: str,
        deadline: datetime,
        profile: ADHDProfile,
        subject_area: str = "general",
    ) -> List[ProjectChunk]:
        """
        Break a project into ADHD-friendly chunks.

        Rules:
        - Each chunk 15-45 minutes (25 target)
        - Clear start and end points
        - Varied energy requirements
        - Built-in stopping points
        - Materials listed upfront

        Args:
            project_description: Full description of the project
            deadline: When the project is due
            profile: Learner's ADHD profile
            subject_area: Academic subject (affects breakdown strategy)

        Returns:
            List of project chunks in recommended sequence
        """
        project_id = generate_id()

        if self.llm:
            try:
                chunks = await self._llm_breakdown(
                    project_id=project_id,
                    project_description=project_description,
                    deadline=deadline,
                    profile=profile,
                    subject_area=subject_area,
                )
            except Exception as e:
                logger.warning(f"LLM breakdown failed, using fallback: {e}")
                chunks = self._fallback_breakdown(
                    project_id=project_id,
                    project_description=project_description,
                    deadline=deadline,
                    profile=profile,
                )
        else:
            chunks = self._fallback_breakdown(
                project_id=project_id,
                project_description=project_description,
                deadline=deadline,
                profile=profile,
            )

        # Validate and adjust chunk sizes
        chunks = self._adjust_chunk_sizes(chunks, profile)

        # Add buffer time if configured
        if self.config.include_buffer:
            chunks = self._add_buffer_to_estimates(chunks)

        # Optimize sequence for energy and complexity
        chunks = self._optimize_sequence(chunks, profile)

        # Assign sequence numbers
        for i, chunk in enumerate(chunks):
            chunk.sequence = i + 1

        return chunks

    async def _llm_breakdown(
        self,
        project_id: str,
        project_description: str,
        deadline: datetime,
        profile: ADHDProfile,
        subject_area: str,
    ) -> List[ProjectChunk]:
        """Use LLM to analyze and break down the project."""
        prompt = self._build_breakdown_prompt(
            project_description=project_description,
            deadline=deadline,
            profile=profile,
            subject_area=subject_area,
        )

        response = await self.llm.generate(prompt, temperature=0.3)
        chunks = self._parse_llm_response(response, project_id)

        return chunks

    def _build_breakdown_prompt(
        self,
        project_description: str,
        deadline: datetime,
        profile: ADHDProfile,
        subject_area: str,
    ) -> str:
        """Build prompt for LLM project breakdown."""
        ef_challenges = ", ".join([d.value for d in profile.primary_ef_challenges])
        ef_strengths = ", ".join([d.value for d in profile.ef_strengths])

        return f"""You are an expert at breaking down projects for students with ADHD.
Break down this project into ADHD-friendly work chunks.

PROJECT: {project_description}
SUBJECT: {subject_area}
DEADLINE: {deadline.strftime('%Y-%m-%d')}
DAYS UNTIL DEADLINE: {(deadline - datetime.now()).days}

LEARNER PROFILE:
- Optimal focus duration: {profile.optimal_focus_duration_minutes} minutes
- EF challenges: {ef_challenges or 'not specified'}
- EF strengths: {ef_strengths or 'not specified'}
- Needs external deadlines: {profile.needs_external_deadlines}
- Benefits from gamification: {profile.benefits_from_gamification}
- Time estimation multiplier: {profile.time_estimation_multiplier}x

REQUIREMENTS FOR EACH CHUNK:
1. Clear, specific title starting with an action verb (e.g., "Write", "Research", "Create")
2. Exactly what to do first (task initiation support - be very specific)
3. How to know when done (clear completion indicator)
4. Estimated time ({self.config.min_chunk_minutes}-{self.config.max_chunk_minutes} minutes, target {self.config.target_chunk_minutes})
5. Materials needed before starting
6. Energy level required (high/medium/low)
7. Whether the chunk can be interrupted and resumed

CHUNKING GUIDELINES:
- Start with a medium-difficulty task (not the hardest or easiest)
- Alternate between energy levels when possible
- Group related tasks but keep chunks completable in one session
- Include "quick win" chunks early to build momentum
- Save creative/generative tasks for when energy is highest
- Put tedious tasks after engaging ones

Output your response as a JSON array of chunk objects with these fields:
{{
    "title": "Action verb + specific task",
    "description": "What this chunk accomplishes",
    "estimated_minutes": <number 15-45>,
    "materials_needed": ["item1", "item2"],
    "start_prompt": "Open [specific thing] and [very specific first action]",
    "completion_indicator": "You're done when [specific measurable outcome]",
    "energy_level_required": "high" | "medium" | "low",
    "can_be_interrupted": true | false
}}

Return ONLY the JSON array, no other text."""

    def _parse_llm_response(
        self,
        response: str,
        project_id: str,
    ) -> List[ProjectChunk]:
        """Parse LLM response into ProjectChunk objects."""
        chunks = []

        try:
            # Clean up response - extract JSON if wrapped in markdown
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            response = response.strip()

            chunk_data = json.loads(response)

            for i, data in enumerate(chunk_data):
                # Map energy level string to enum
                energy_str = data.get("energy_level_required", "medium").lower()
                energy_level = EnergyLevel(energy_str)

                chunk = ProjectChunk(
                    chunk_id=generate_id(),
                    project_id=project_id,
                    sequence=i + 1,
                    title=data.get("title", f"Step {i + 1}"),
                    description=data.get("description", ""),
                    estimated_minutes=min(
                        max(data.get("estimated_minutes", 25), self.config.min_chunk_minutes),
                        self.config.max_chunk_minutes,
                    ),
                    materials_needed=data.get("materials_needed", []),
                    start_prompt=data.get("start_prompt", "Open your materials and begin"),
                    completion_indicator=data.get(
                        "completion_indicator",
                        "You've completed the task",
                    ),
                    energy_level_required=energy_level,
                    can_be_interrupted=data.get("can_be_interrupted", True),
                )
                chunks.append(chunk)

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            raise ValueError(f"Failed to parse LLM breakdown response: {e}")

        return chunks

    def _fallback_breakdown(
        self,
        project_id: str,
        project_description: str,
        deadline: datetime,
        profile: ADHDProfile,
    ) -> List[ProjectChunk]:
        """
        Fallback breakdown when LLM is unavailable.

        Creates a generic but structured breakdown based on common
        project phases and the learner's profile.
        """
        target_minutes = profile.optimal_focus_duration_minutes
        days_until_deadline = max(1, (deadline - datetime.now()).days)

        # Generic project phases
        phases = [
            {
                "title": "Gather and review materials",
                "description": "Collect all materials and read through requirements",
                "start_prompt": "Open the assignment instructions and read them completely",
                "completion_indicator": "You have a list of what you need and understand the requirements",
                "energy": EnergyLevel.LOW,
                "minutes": target_minutes,
            },
            {
                "title": "Create outline or plan",
                "description": "Map out the structure and main points",
                "start_prompt": "Open a blank document and write the main sections as headers",
                "completion_indicator": "You have a clear outline with all major sections identified",
                "energy": EnergyLevel.MEDIUM,
                "minutes": target_minutes,
            },
            {
                "title": "Research and gather information",
                "description": "Find sources and take notes",
                "start_prompt": "Open your browser and search for your first key topic",
                "completion_indicator": "You have notes on at least 3 sources",
                "energy": EnergyLevel.MEDIUM,
                "minutes": target_minutes,
            },
            {
                "title": "Write first draft - Part 1",
                "description": "Write the introduction and first section",
                "start_prompt": "Go to your outline and start writing the introduction - just get words down",
                "completion_indicator": "You have a rough intro and first section written",
                "energy": EnergyLevel.HIGH,
                "minutes": target_minutes,
            },
            {
                "title": "Write first draft - Part 2",
                "description": "Continue writing middle sections",
                "start_prompt": "Re-read the last paragraph you wrote, then continue from there",
                "completion_indicator": "You've completed the middle sections",
                "energy": EnergyLevel.HIGH,
                "minutes": target_minutes,
            },
            {
                "title": "Write first draft - Part 3",
                "description": "Write conclusion and wrap up",
                "start_prompt": "Read your main points and start summarizing them in the conclusion",
                "completion_indicator": "You have a complete first draft",
                "energy": EnergyLevel.MEDIUM,
                "minutes": target_minutes,
            },
            {
                "title": "Take a break, then review",
                "description": "Step away, then come back to review with fresh eyes",
                "start_prompt": "Print or read through your draft from beginning to end",
                "completion_indicator": "You've marked all areas that need improvement",
                "energy": EnergyLevel.LOW,
                "minutes": target_minutes,
            },
            {
                "title": "Revise and improve",
                "description": "Make improvements based on your review",
                "start_prompt": "Go to the first marked area and make your revision",
                "completion_indicator": "All marked areas have been addressed",
                "energy": EnergyLevel.MEDIUM,
                "minutes": target_minutes,
            },
            {
                "title": "Final polish and formatting",
                "description": "Check formatting, citations, and final details",
                "start_prompt": "Check the formatting requirements and compare to your document",
                "completion_indicator": "Document matches all requirements and is ready to submit",
                "energy": EnergyLevel.LOW,
                "minutes": target_minutes,
            },
        ]

        # Adjust number of phases based on deadline
        if days_until_deadline <= 2:
            # Compress to essential phases
            phases = [phases[0], phases[3], phases[5], phases[8]]
        elif days_until_deadline <= 4:
            # Medium compression
            phases = [phases[0], phases[1], phases[3], phases[5], phases[7], phases[8]]

        chunks = []
        for i, phase in enumerate(phases):
            chunk = ProjectChunk(
                chunk_id=generate_id(),
                project_id=project_id,
                sequence=i + 1,
                title=phase["title"],
                description=phase["description"],
                estimated_minutes=phase["minutes"],
                materials_needed=[],
                start_prompt=phase["start_prompt"],
                completion_indicator=phase["completion_indicator"],
                energy_level_required=phase["energy"],
                can_be_interrupted=True,
            )
            chunks.append(chunk)

        return chunks

    def _adjust_chunk_sizes(
        self,
        chunks: List[ProjectChunk],
        profile: ADHDProfile,
    ) -> List[ProjectChunk]:
        """Adjust chunks to fit learner's optimal focus duration."""
        adjusted = []
        max_duration = profile.optimal_focus_duration_minutes

        for chunk in chunks:
            if chunk.estimated_minutes > max_duration:
                # Split large chunks
                split_chunks = self._split_chunk(chunk, max_duration)
                adjusted.extend(split_chunks)
            elif chunk.estimated_minutes < self.config.min_chunk_minutes:
                # Chunk is too small - will be handled in merge step if needed
                adjusted.append(chunk)
            else:
                adjusted.append(chunk)

        # Merge tiny adjacent chunks if they're for the same energy level
        adjusted = self._merge_tiny_chunks(adjusted, profile)

        return adjusted

    def _split_chunk(
        self,
        chunk: ProjectChunk,
        max_duration: int,
    ) -> List[ProjectChunk]:
        """Split a chunk that's too large into smaller chunks."""
        num_parts = (chunk.estimated_minutes + max_duration - 1) // max_duration
        minutes_per_part = chunk.estimated_minutes // num_parts

        split_chunks = []
        for i in range(num_parts):
            part_chunk = ProjectChunk(
                chunk_id=generate_id(),
                project_id=chunk.project_id,
                sequence=chunk.sequence,  # Will be reassigned later
                title=f"{chunk.title} (Part {i + 1} of {num_parts})",
                description=chunk.description,
                estimated_minutes=minutes_per_part,
                materials_needed=chunk.materials_needed if i == 0 else [],
                start_prompt=(
                    chunk.start_prompt
                    if i == 0
                    else f"Continue from where you left off on {chunk.title}"
                ),
                completion_indicator=(
                    chunk.completion_indicator
                    if i == num_parts - 1
                    else f"Complete approximately {100 // num_parts}% of {chunk.title}"
                ),
                energy_level_required=chunk.energy_level_required,
                can_be_interrupted=True,
            )
            split_chunks.append(part_chunk)

        return split_chunks

    def _merge_tiny_chunks(
        self,
        chunks: List[ProjectChunk],
        profile: ADHDProfile,
    ) -> List[ProjectChunk]:
        """Merge very small adjacent chunks of similar energy level."""
        if len(chunks) <= 1:
            return chunks

        merged = []
        i = 0

        while i < len(chunks):
            current = chunks[i]

            # Check if current chunk is tiny
            if current.estimated_minutes < self.config.min_chunk_minutes and i + 1 < len(chunks):
                next_chunk = chunks[i + 1]

                # Check if next chunk can be merged
                combined_time = current.estimated_minutes + next_chunk.estimated_minutes
                same_energy = current.energy_level_required == next_chunk.energy_level_required

                if same_energy and combined_time <= profile.optimal_focus_duration_minutes:
                    # Merge chunks
                    merged_chunk = ProjectChunk(
                        chunk_id=generate_id(),
                        project_id=current.project_id,
                        sequence=current.sequence,
                        title=f"{current.title} + {next_chunk.title}",
                        description=f"{current.description}\n\nThen: {next_chunk.description}",
                        estimated_minutes=combined_time,
                        materials_needed=list(
                            set(current.materials_needed + next_chunk.materials_needed)
                        ),
                        start_prompt=current.start_prompt,
                        completion_indicator=next_chunk.completion_indicator,
                        energy_level_required=current.energy_level_required,
                        can_be_interrupted=current.can_be_interrupted and next_chunk.can_be_interrupted,
                    )
                    merged.append(merged_chunk)
                    i += 2
                    continue

            merged.append(current)
            i += 1

        return merged

    def _add_buffer_to_estimates(
        self,
        chunks: List[ProjectChunk],
    ) -> List[ProjectChunk]:
        """Add buffer time to estimates to account for time blindness."""
        for chunk in chunks:
            buffer_minutes = int(chunk.estimated_minutes * self.config.buffer_percentage)
            chunk.estimated_minutes = min(
                chunk.estimated_minutes + buffer_minutes,
                self.config.max_chunk_minutes,
            )
        return chunks

    def _optimize_sequence(
        self,
        chunks: List[ProjectChunk],
        profile: ADHDProfile,
    ) -> List[ProjectChunk]:
        """
        Sequence chunks optimally for ADHD.

        Principles:
        - Start with medium-energy task (not hardest or easiest)
        - Alternate energy levels when possible
        - Quick wins early for momentum
        - Creative tasks when energy allows
        - Boring tasks sandwiched between engaging ones
        """
        if len(chunks) <= 2:
            return chunks

        # Categorize by energy level
        high_energy = [c for c in chunks if c.energy_level_required == EnergyLevel.HIGH]
        medium_energy = [c for c in chunks if c.energy_level_required == EnergyLevel.MEDIUM]
        low_energy = [c for c in chunks if c.energy_level_required == EnergyLevel.LOW]

        optimized = []

        # Start with a medium energy "warm-up" task if available
        if medium_energy:
            optimized.append(medium_energy.pop(0))

        # Interleave: high, low, medium, repeat
        while high_energy or medium_energy or low_energy:
            if high_energy:
                optimized.append(high_energy.pop(0))
            if low_energy:
                optimized.append(low_energy.pop(0))
            if medium_energy:
                optimized.append(medium_energy.pop(0))

        return optimized

    def estimate_total_time(
        self,
        chunks: List[ProjectChunk],
        profile: ADHDProfile,
    ) -> Dict[str, Any]:
        """
        Estimate total project time including breaks.

        Args:
            chunks: List of project chunks
            profile: Learner's ADHD profile

        Returns:
            Dictionary with time estimates and breakdown
        """
        total_work_minutes = sum(c.estimated_minutes for c in chunks)

        # Calculate breaks
        num_focus_sessions = len(chunks)
        short_breaks = num_focus_sessions - 1
        long_breaks = num_focus_sessions // profile.sessions_before_long_break

        short_break_minutes = short_breaks * profile.break_duration_minutes
        long_break_minutes = long_breaks * profile.long_break_duration_minutes

        total_break_minutes = short_break_minutes + long_break_minutes
        total_minutes = total_work_minutes + total_break_minutes

        # Apply time blindness multiplier
        adjusted_total = int(total_minutes * profile.time_estimation_multiplier)

        return {
            "total_work_minutes": total_work_minutes,
            "total_break_minutes": total_break_minutes,
            "total_minutes_raw": total_minutes,
            "total_minutes_adjusted": adjusted_total,
            "num_chunks": len(chunks),
            "num_short_breaks": short_breaks,
            "num_long_breaks": long_breaks,
            "estimated_hours": round(adjusted_total / 60, 1),
            "recommended_sessions_per_day": min(profile.sessions_before_long_break, len(chunks)),
        }
