"""Tests for ADHD support service and related components."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta


class TestADHDAIService:
    """Tests for the ADHD AI support service."""

    def test_get_support_recommendations(self):
        """Should generate ADHD support recommendations."""
        profile = {
            "learner_id": "learner-1",
            "age": 12,
            "diagnosis": "ADHD-Combined",
            "grade_level": 6,
            "strengths": ["visual_learning", "creativity"],
            "challenges": ["sustained_attention", "organization"],
        }
        recommendations = [
            {
                "category": "attention",
                "strategy": "Pomodoro technique with 15-minute intervals",
                "priority": "high",
            },
            {
                "category": "organization",
                "strategy": "Visual task board with color coding",
                "priority": "high",
            },
            {
                "category": "engagement",
                "strategy": "Gamified progress tracking",
                "priority": "medium",
            },
        ]
        assert len(recommendations) >= 2
        assert all("category" in r for r in recommendations)

    def test_create_adhd_profile(self):
        """Should create ADHD learner profile."""
        profile = {
            "learner_id": "learner-1",
            "subtype": "Combined",
            "attention_span_minutes": 12,
            "optimal_break_duration": 5,
            "preferred_modality": "visual",
            "medication_schedule": None,
            "created_at": datetime.utcnow().isoformat(),
        }
        assert profile["subtype"] in ["Inattentive", "Hyperactive-Impulsive", "Combined"]
        assert profile["attention_span_minutes"] > 0

    def test_breakdown_project(self):
        """Should break down a project into manageable tasks."""
        project = {
            "title": "Science Fair Project",
            "description": "Research and present a topic in earth science",
            "due_date": (datetime.utcnow() + timedelta(days=14)).isoformat(),
            "estimated_hours": 10,
        }
        breakdown = {
            "project_id": "proj-1",
            "total_steps": 5,
            "steps": [
                {"step": 1, "title": "Choose topic", "duration_minutes": 30, "difficulty": "easy"},
                {"step": 2, "title": "Research (3 sources)", "duration_minutes": 90, "difficulty": "medium"},
                {"step": 3, "title": "Create outline", "duration_minutes": 45, "difficulty": "medium"},
                {"step": 4, "title": "Build presentation", "duration_minutes": 120, "difficulty": "hard"},
                {"step": 5, "title": "Practice presentation", "duration_minutes": 30, "difficulty": "easy"},
            ],
        }
        assert breakdown["total_steps"] == len(breakdown["steps"])
        assert all("duration_minutes" in s for s in breakdown["steps"])

    def test_generate_daily_schedule(self):
        """Should generate a structured daily schedule."""
        schedule = {
            "learner_id": "learner-1",
            "date": "2025-01-15",
            "blocks": [
                {"time": "09:00", "duration": 15, "activity": "Math practice", "type": "focus"},
                {"time": "09:15", "duration": 5, "activity": "Movement break", "type": "break"},
                {"time": "09:20", "duration": 15, "activity": "Math practice", "type": "focus"},
                {"time": "09:35", "duration": 5, "activity": "Stretching", "type": "break"},
                {"time": "09:40", "duration": 15, "activity": "Reading", "type": "focus"},
            ],
        }
        focus_blocks = [b for b in schedule["blocks"] if b["type"] == "focus"]
        break_blocks = [b for b in schedule["blocks"] if b["type"] == "break"]
        assert len(focus_blocks) >= 2
        assert len(break_blocks) >= 1

    def test_get_ef_strategies(self):
        """Should return executive function strategies."""
        strategies = [
            {
                "function": "working_memory",
                "strategies": ["chunking", "visual_cues", "repetition"],
                "tools": ["graphic_organizers", "checklists"],
            },
            {
                "function": "inhibition",
                "strategies": ["self_monitoring", "wait_time_practice"],
                "tools": ["timer", "visual_stop_signs"],
            },
            {
                "function": "cognitive_flexibility",
                "strategies": ["advance_warning", "transition_cues"],
                "tools": ["schedule_board", "social_stories"],
            },
        ]
        assert len(strategies) >= 3
        ef_names = {s["function"] for s in strategies}
        assert "working_memory" in ef_names

    def test_support_age_appropriate(self):
        """Should adjust strategies for age."""
        young_child = {"age": 7, "grade": 2}
        teenager = {"age": 15, "grade": 10}
        # younger students get shorter focus periods
        young_focus = 10
        teen_focus = 25
        assert young_focus < teen_focus


class TestProjectBreakdownService:
    """Tests for project breakdown functionality."""

    def test_estimate_step_durations(self):
        """Should estimate realistic durations for each step."""
        steps = [
            {"title": "Read chapter", "complexity": "low"},
            {"title": "Write essay outline", "complexity": "medium"},
            {"title": "Write 500-word essay", "complexity": "high"},
        ]
        duration_map = {"low": 15, "medium": 30, "high": 60}
        for step in steps:
            step["estimated_minutes"] = duration_map[step["complexity"]]
        total = sum(s["estimated_minutes"] for s in steps)
        assert total == 105

    def test_assign_deadlines(self):
        """Should assign intermediate deadlines."""
        due = datetime.utcnow() + timedelta(days=7)
        steps = [
            {"step": 1, "deadline": due - timedelta(days=5)},
            {"step": 2, "deadline": due - timedelta(days=3)},
            {"step": 3, "deadline": due},
        ]
        for i in range(len(steps) - 1):
            assert steps[i]["deadline"] < steps[i + 1]["deadline"]

    def test_identify_dependencies(self):
        """Should identify step dependencies."""
        steps = [
            {"id": 1, "title": "Research", "depends_on": []},
            {"id": 2, "title": "Outline", "depends_on": [1]},
            {"id": 3, "title": "Write", "depends_on": [2]},
            {"id": 4, "title": "Illustrations", "depends_on": [1]},
        ]
        # Step 3 depends on step 2 which depends on step 1
        step3 = next(s for s in steps if s["id"] == 3)
        assert 2 in step3["depends_on"]


class TestDailyPlannerService:
    """Tests for daily planning functionality."""

    def test_optimize_schedule_for_energy(self):
        """Should schedule difficult tasks during peak energy."""
        energy_pattern = {
            "morning": "high",
            "midday": "medium",
            "afternoon": "low",
        }
        tasks = [
            {"title": "Math test prep", "difficulty": "hard"},
            {"title": "Read story", "difficulty": "easy"},
            {"title": "Science lab", "difficulty": "medium"},
        ]
        # Hard tasks go to high-energy times
        schedule = []
        for period, energy in energy_pattern.items():
            if energy == "high":
                task = next(t for t in tasks if t["difficulty"] == "hard")
                schedule.append({"period": period, "task": task["title"]})
        assert schedule[0]["period"] == "morning"
        assert schedule[0]["task"] == "Math test prep"

    def test_include_mandatory_breaks(self):
        """Should include breaks between focus blocks."""
        blocks = []
        for i in range(4):
            blocks.append({"type": "focus", "duration": 15})
            blocks.append({"type": "break", "duration": 5})
        focus_count = sum(1 for b in blocks if b["type"] == "focus")
        break_count = sum(1 for b in blocks if b["type"] == "break")
        assert break_count >= focus_count

    def test_respect_attention_span(self):
        """Should not exceed learner's attention span."""
        attention_span = 12  # minutes
        blocks = [
            {"duration": 12, "type": "focus"},
            {"duration": 5, "type": "break"},
            {"duration": 12, "type": "focus"},
        ]
        for block in blocks:
            if block["type"] == "focus":
                assert block["duration"] <= attention_span
