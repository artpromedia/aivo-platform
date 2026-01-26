"""
Hierarchical Task Planning using HTN (Hierarchical Task Networks)

Enables agents to:
- Decompose complex learning goals into sub-tasks
- Plan multi-step learning sequences
- Coordinate between multiple specialist agents
- Adapt plans based on learner progress

Based on HTN planning literature and applied to educational domain.
"""

import torch
import torch.nn as nn
import numpy as np
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Status of a task in the plan"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


class TaskPriority(Enum):
    """Priority levels for tasks"""
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4
    OPTIONAL = 5


@dataclass
class Task:
    """A single task in the hierarchy"""
    task_id: str
    name: str
    description: str
    task_type: str  # "primitive" or "compound"
    preconditions: List[str] = field(default_factory=list)  # Required task IDs
    postconditions: List[str] = field(default_factory=list)  # Effects of completion
    estimated_duration_minutes: int = 15
    difficulty: float = 0.5  # 0-1 scale
    agent_type: str = "tutor"  # Which agent should handle this
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    subtasks: Optional[List['Task']] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization"""
        return {
            "task_id": self.task_id,
            "name": self.name,
            "description": self.description,
            "task_type": self.task_type,
            "preconditions": self.preconditions,
            "postconditions": self.postconditions,
            "estimated_duration_minutes": self.estimated_duration_minutes,
            "difficulty": self.difficulty,
            "agent_type": self.agent_type,
            "status": self.status.value,
            "priority": self.priority.value,
            "subtasks": [s.to_dict() for s in self.subtasks] if self.subtasks else None,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Task':
        """Create from dictionary"""
        return cls(
            task_id=data["task_id"],
            name=data["name"],
            description=data["description"],
            task_type=data["task_type"],
            preconditions=data.get("preconditions", []),
            postconditions=data.get("postconditions", []),
            estimated_duration_minutes=data.get("estimated_duration_minutes", 15),
            difficulty=data.get("difficulty", 0.5),
            agent_type=data.get("agent_type", "tutor"),
            status=TaskStatus(data.get("status", "pending")),
            priority=TaskPriority(data.get("priority", 3)),
            subtasks=[cls.from_dict(s) for s in data["subtasks"]] if data.get("subtasks") else None,
            metadata=data.get("metadata", {}),
            created_at=datetime.fromisoformat(data["created_at"]) if "created_at" in data else datetime.utcnow(),
            completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
        )


@dataclass
class LearningPlan:
    """Complete learning plan with tasks"""
    plan_id: str
    goal: str
    learner_id: str
    tasks: List[Task]
    total_duration_minutes: int
    estimated_completion: datetime
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "active"
    
    def to_dict(self) -> Dict:
        return {
            "plan_id": self.plan_id,
            "goal": self.goal,
            "learner_id": self.learner_id,
            "tasks": [t.to_dict() for t in self.tasks],
            "total_duration_minutes": self.total_duration_minutes,
            "estimated_completion": self.estimated_completion.isoformat(),
            "created_at": self.created_at.isoformat(),
            "status": self.status,
        }


class TaskSequenceEncoder(nn.Module):
    """
    Transformer encoder for learning optimal task sequences
    
    Learns to predict which task ordering leads to better outcomes
    """
    
    def __init__(
        self,
        task_embedding_dim: int = 128,
        d_model: int = 256,
        nhead: int = 8,
        num_layers: int = 4,
        num_task_types: int = 50,
        dropout: float = 0.1
    ):
        super().__init__()
        
        self.task_embedding = nn.Embedding(num_task_types, task_embedding_dim)
        self.difficulty_encoder = nn.Linear(1, task_embedding_dim // 4)
        self.duration_encoder = nn.Linear(1, task_embedding_dim // 4)
        
        # Project to d_model
        self.input_projection = nn.Linear(
            task_embedding_dim + task_embedding_dim // 2,
            d_model
        )
        
        # Positional encoding
        self.pos_encoder = nn.Parameter(torch.randn(1, 100, d_model))
        
        # Transformer
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        # Output head for task ordering scores
        self.ordering_head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, 1)
        )
    
    def forward(
        self,
        task_types: torch.Tensor,      # [batch, seq_len]
        difficulties: torch.Tensor,     # [batch, seq_len]
        durations: torch.Tensor,        # [batch, seq_len]
        mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Encode task sequence and predict ordering scores
        
        Returns:
            Ordering scores [batch, seq_len]
        """
        batch_size, seq_len = task_types.shape
        
        # Embed task types
        task_emb = self.task_embedding(task_types)
        
        # Encode difficulty and duration
        diff_emb = self.difficulty_encoder(difficulties.unsqueeze(-1))
        dur_emb = self.duration_encoder(durations.unsqueeze(-1))
        
        # Combine embeddings
        combined = torch.cat([task_emb, diff_emb, dur_emb], dim=-1)
        x = self.input_projection(combined)
        
        # Add positional encoding
        x = x + self.pos_encoder[:, :seq_len, :]
        
        # Transform
        x = self.transformer(x, src_key_padding_mask=mask)
        
        # Get ordering scores
        scores = self.ordering_head(x).squeeze(-1)
        
        return scores


class HierarchicalPlanner:
    """
    HTN-based planner for decomposing learning goals
    
    Example:
    Goal: "Master 5th grade fractions"
    → Task 1: Learn fraction basics
      → Subtask 1.1: Understand numerator/denominator
      → Subtask 1.2: Compare fractions
    → Task 2: Practice operations
      → Subtask 2.1: Add like fractions
      → Subtask 2.2: Add unlike fractions
    
    Usage:
        planner = HierarchicalPlanner()
        plan = planner.plan(
            goal="Master fractions",
            learner_state={"mastery": {"basic_math": 0.8}},
            constraints={"max_time_minutes": 60}
        )
    """
    
    def __init__(self, device: str = "cpu"):
        self.device = torch.device(device)
        self.task_decomposition_rules = self._init_decomposition_rules()
        self.planning_model = TaskSequenceEncoder().to(self.device)
        self.task_type_to_id: Dict[str, int] = {}
        self.next_task_type_id = 0
        
        # Agent specializations
        self.agent_capabilities = {
            "tutor": ["explain", "scaffold", "question", "demonstrate"],
            "goal_planner": ["plan", "track_progress", "adjust_goals", "milestone"],
            "focus_monitor": ["detect_distraction", "intervene", "suggest_break", "timer"],
            "emotional_support": ["detect_emotion", "encourage", "coping_strategy", "celebrate"],
            "assessment": ["generate_question", "grade", "analyze", "feedback"],
            "content_selector": ["recommend", "sequence", "adapt_difficulty", "personalize"],
            "writing_assistant": ["review", "suggest", "structure", "grammar"],
            "social_story": ["create_story", "personalize", "adapt_autism", "visual_support"],
        }
    
    def _init_decomposition_rules(self) -> Dict[str, List]:
        """
        HTN decomposition rules for educational tasks
        
        Each rule maps a compound task to a sequence of subtasks
        """
        return {
            # Math skills
            "master_fractions": [
                ("understand_basics", ["fraction_definition", "visual_representation", "fraction_parts"]),
                ("compare_fractions", ["common_denominators", "visual_comparison", "ordering"]),
                ("operations", ["add_like_fractions", "add_unlike_fractions", "subtract_fractions", "multiply_fractions"]),
                ("word_problems", ["translate_problem", "solve_problem", "check_answer", "explain_reasoning"])
            ],
            "master_multiplication": [
                ("understand_concept", ["groups_of", "repeated_addition", "arrays"]),
                ("memorize_facts", ["times_2", "times_5", "times_10", "times_3_4", "times_6_7_8_9"]),
                ("multi_digit", ["place_value", "partial_products", "standard_algorithm"]),
                ("applications", ["area_model", "word_problems", "estimation"])
            ],
            "master_algebra": [
                ("variables", ["variable_concept", "expressions", "substitution"]),
                ("equations", ["one_step", "two_step", "multi_step"]),
                ("inequalities", ["inequality_symbols", "graphing", "compound"]),
                ("functions", ["function_concept", "input_output", "graphing_functions"])
            ],
            
            # Reading skills
            "learn_reading_comprehension": [
                ("identify_main_idea", ["read_passage", "extract_key_points", "summarize"]),
                ("analyze_details", ["find_evidence", "make_inferences", "draw_conclusions"]),
                ("vocabulary", ["context_clues", "word_relationships", "academic_vocabulary"]),
                ("synthesize", ["connect_ideas", "compare_texts", "form_opinions"])
            ],
            "improve_fluency": [
                ("decoding", ["phonics_review", "syllable_types", "morphemes"]),
                ("prosody", ["phrasing", "expression", "punctuation_cues"]),
                ("speed", ["timed_reading", "repeated_reading", "phrase_reading"]),
                ("comprehension_check", ["retelling", "questioning", "self_monitoring"])
            ],
            
            # Writing skills
            "master_essay_writing": [
                ("planning", ["brainstorm", "outline", "thesis_statement"]),
                ("drafting", ["introduction", "body_paragraphs", "conclusion"]),
                ("revising", ["organization", "clarity", "evidence"]),
                ("editing", ["grammar", "spelling", "punctuation"])
            ],
            
            # Science skills
            "learn_scientific_method": [
                ("observation", ["make_observations", "ask_questions", "research"]),
                ("hypothesis", ["form_hypothesis", "identify_variables", "predictions"]),
                ("experiment", ["design_experiment", "collect_data", "record_results"]),
                ("analysis", ["analyze_data", "draw_conclusions", "communicate_findings"])
            ],
            
            # Social-emotional
            "develop_self_regulation": [
                ("awareness", ["identify_emotions", "recognize_triggers", "body_cues"]),
                ("strategies", ["breathing_exercises", "positive_self_talk", "taking_breaks"]),
                ("application", ["practice_scenarios", "real_situations", "reflection"]),
                ("generalization", ["multiple_contexts", "peer_support", "independence"])
            ]
        }
    
    def _get_task_type_id(self, task_name: str) -> int:
        """Get or create task type ID"""
        if task_name not in self.task_type_to_id:
            self.task_type_to_id[task_name] = self.next_task_type_id
            self.next_task_type_id += 1
        return self.task_type_to_id[task_name]
    
    def plan(
        self,
        goal: str,
        learner_state: Dict,
        constraints: Optional[Dict] = None
    ) -> LearningPlan:
        """
        Generate hierarchical plan for achieving goal
        
        Args:
            goal: High-level learning goal
            learner_state: Current mastery levels, preferences, IEP info
            constraints: Time, difficulty limits, session constraints
        
        Returns:
            Complete learning plan with ordered tasks
        """
        import uuid
        
        logger.info(f"Planning for goal: {goal}")
        
        # 1. Decompose goal into task hierarchy
        task_tree = self._decompose_goal(goal)
        
        # 2. Flatten hierarchy respecting dependencies
        ordered_tasks = self._topological_sort(task_tree)
        
        # 3. Personalize based on learner state
        personalized_tasks = self._personalize_plan(ordered_tasks, learner_state)
        
        # 4. Apply constraints
        if constraints:
            personalized_tasks = self._apply_constraints(personalized_tasks, constraints)
        
        # 5. Assign agents to tasks
        personalized_tasks = self._assign_agents(personalized_tasks, learner_state)
        
        # 6. Optimize task order using neural model
        if len(personalized_tasks) > 1:
            personalized_tasks = self._optimize_order(personalized_tasks, learner_state)
        
        # Calculate total duration
        total_duration = sum(t.estimated_duration_minutes for t in personalized_tasks)
        
        # Estimate completion time
        estimated_completion = datetime.utcnow() + timedelta(minutes=total_duration)
        
        plan = LearningPlan(
            plan_id=str(uuid.uuid4()),
            goal=goal,
            learner_id=learner_state.get("learner_id", "unknown"),
            tasks=personalized_tasks,
            total_duration_minutes=total_duration,
            estimated_completion=estimated_completion,
        )
        
        logger.info(f"Created plan with {len(personalized_tasks)} tasks, {total_duration} minutes total")
        
        return plan
    
    def _decompose_goal(self, goal: str) -> Task:
        """Recursively decompose goal using HTN rules"""
        goal_lower = goal.lower()
        
        # Match goal to decomposition rules
        for goal_pattern, subtask_specs in self.task_decomposition_rules.items():
            # Check for pattern match
            pattern_words = goal_pattern.replace("_", " ").split()
            if all(word in goal_lower for word in pattern_words):
                root_task = Task(
                    task_id=f"task_{goal_pattern}_{datetime.utcnow().timestamp():.0f}",
                    name=goal,
                    description=f"Master: {goal}",
                    task_type="compound",
                    preconditions=[],
                    postconditions=[f"mastered_{goal_pattern}"],
                    estimated_duration_minutes=0,  # Will be calculated from subtasks
                    difficulty=0.5,
                    agent_type="supervisor",
                    priority=TaskPriority.HIGH
                )
                
                subtasks = []
                prev_task_id = None
                
                for idx, (subtask_name, sub_subtasks) in enumerate(subtask_specs):
                    subtask = self._create_subtask(
                        subtask_name, 
                        sub_subtasks,
                        precondition=prev_task_id
                    )
                    subtasks.append(subtask)
                    prev_task_id = subtask.task_id
                
                root_task.subtasks = subtasks
                root_task.estimated_duration_minutes = sum(s.estimated_duration_minutes for s in subtasks)
                
                return root_task
        
        # Fallback: create primitive task
        return Task(
            task_id=f"task_generic_{datetime.utcnow().timestamp():.0f}",
            name=goal,
            description=goal,
            task_type="primitive",
            preconditions=[],
            postconditions=[f"completed_{goal.replace(' ', '_')}"],
            estimated_duration_minutes=20,
            difficulty=0.5,
            agent_type="tutor"
        )
    
    def _create_subtask(
        self, 
        name: str, 
        sub_subtasks: List[str],
        precondition: Optional[str] = None
    ) -> Task:
        """Create a subtask with its own subtasks"""
        task_id = f"subtask_{name}_{datetime.utcnow().timestamp():.0f}"
        
        subtask = Task(
            task_id=task_id,
            name=name.replace("_", " ").title(),
            description=f"Learn: {name.replace('_', ' ')}",
            task_type="compound" if sub_subtasks else "primitive",
            preconditions=[precondition] if precondition else [],
            postconditions=[f"completed_{name}"],
            estimated_duration_minutes=15 if not sub_subtasks else 0,
            difficulty=0.4,
            agent_type="tutor",
            priority=TaskPriority.MEDIUM
        )
        
        if sub_subtasks:
            children = []
            prev_id = None
            for sub in sub_subtasks:
                child = Task(
                    task_id=f"task_{sub}_{datetime.utcnow().timestamp():.0f}",
                    name=sub.replace("_", " ").title(),
                    description=f"Practice: {sub.replace('_', ' ')}",
                    task_type="primitive",
                    preconditions=[prev_id] if prev_id else [],
                    postconditions=[f"completed_{sub}"],
                    estimated_duration_minutes=10,
                    difficulty=0.3,
                    agent_type="tutor"
                )
                children.append(child)
                prev_id = child.task_id
            
            subtask.subtasks = children
            subtask.estimated_duration_minutes = sum(c.estimated_duration_minutes for c in children)
        
        return subtask
    
    def _topological_sort(self, root_task: Task) -> List[Task]:
        """Flatten hierarchy into dependency-respecting order"""
        result = []
        
        def dfs(task: Task):
            if task.subtasks:
                for subtask in task.subtasks:
                    dfs(subtask)
            # Only include primitive tasks (leaf nodes)
            if task.task_type == "primitive":
                result.append(task)
        
        dfs(root_task)
        return result
    
    def _personalize_plan(
        self,
        tasks: List[Task],
        learner_state: Dict
    ) -> List[Task]:
        """Adjust plan based on learner's current state"""
        personalized = []
        mastery = learner_state.get('mastery', {})
        iep_accommodations = learner_state.get('iep_accommodations', [])
        struggle_count = learner_state.get('struggle_count', 0)
        learning_pace = learner_state.get('learning_pace', 1.0)
        
        for task in tasks:
            # Skip tasks for already-mastered skills
            if task.postconditions:
                already_mastered = any(
                    mastery.get(pc.replace("completed_", ""), 0) > 0.85
                    for pc in task.postconditions
                )
                if already_mastered:
                    logger.debug(f"Skipping mastered task: {task.name}")
                    continue
            
            # Adjust difficulty based on struggle history
            if struggle_count > 3:
                task.difficulty = max(0.2, task.difficulty - 0.2)
                task.estimated_duration_minutes = int(task.estimated_duration_minutes * 1.2)
            
            # Adjust duration based on learning pace
            task.estimated_duration_minutes = int(task.estimated_duration_minutes / learning_pace)
            
            # Add IEP accommodations to metadata
            if iep_accommodations:
                task.metadata['accommodations'] = iep_accommodations
                
                # Extended time accommodation
                if "extended_time" in iep_accommodations:
                    task.estimated_duration_minutes = int(task.estimated_duration_minutes * 1.5)
                
                # Frequent breaks accommodation
                if "frequent_breaks" in iep_accommodations:
                    task.metadata['break_interval_minutes'] = 10
            
            personalized.append(task)
        
        return personalized
    
    def _apply_constraints(
        self,
        tasks: List[Task],
        constraints: Dict
    ) -> List[Task]:
        """Apply time/difficulty constraints"""
        max_time = constraints.get('max_time_minutes')
        max_difficulty = constraints.get('max_difficulty')
        max_tasks = constraints.get('max_tasks')
        session_type = constraints.get('session_type', 'regular')
        
        filtered = []
        total_time = 0
        
        for task in tasks:
            # Check time constraint
            if max_time and total_time + task.estimated_duration_minutes > max_time:
                break
            
            # Check difficulty constraint
            if max_difficulty and task.difficulty > max_difficulty:
                continue
            
            # Check max tasks constraint
            if max_tasks and len(filtered) >= max_tasks:
                break
            
            # Session type adjustments
            if session_type == 'quick':
                task.estimated_duration_minutes = min(10, task.estimated_duration_minutes)
            elif session_type == 'deep_dive':
                task.estimated_duration_minutes = int(task.estimated_duration_minutes * 1.5)
            
            filtered.append(task)
            total_time += task.estimated_duration_minutes
        
        return filtered
    
    def _assign_agents(
        self,
        tasks: List[Task],
        learner_state: Dict
    ) -> List[Task]:
        """Assign appropriate agents to each task"""
        needs_emotional_support = learner_state.get('anxiety_level', 0) > 0.5
        has_attention_issues = 'attention' in learner_state.get('iep_accommodations', [])
        
        for task in tasks:
            task_name_lower = task.name.lower()
            
            # Content selection tasks
            if any(word in task_name_lower for word in ['recommend', 'select', 'choose']):
                task.agent_type = 'content_selector'
            
            # Assessment tasks
            elif any(word in task_name_lower for word in ['test', 'quiz', 'assess', 'check']):
                task.agent_type = 'assessment'
            
            # Writing tasks
            elif any(word in task_name_lower for word in ['write', 'essay', 'draft', 'edit']):
                task.agent_type = 'writing_assistant'
            
            # Goal/planning tasks
            elif any(word in task_name_lower for word in ['plan', 'goal', 'progress']):
                task.agent_type = 'goal_planner'
            
            # Default to tutor
            else:
                task.agent_type = 'tutor'
            
            # Add support agents based on learner needs
            support_agents = []
            if needs_emotional_support:
                support_agents.append('emotional_support')
            if has_attention_issues:
                support_agents.append('focus_monitor')
            
            if support_agents:
                task.metadata['support_agents'] = support_agents
        
        return tasks
    
    def _optimize_order(
        self,
        tasks: List[Task],
        learner_state: Dict
    ) -> List[Task]:
        """Use neural model to optimize task ordering"""
        if not tasks:
            return tasks
        
        try:
            # Prepare input tensors
            task_types = torch.tensor([
                self._get_task_type_id(t.name) % 50  # Limit to embedding size
                for t in tasks
            ]).unsqueeze(0).to(self.device)
            
            difficulties = torch.tensor([t.difficulty for t in tasks]).float().unsqueeze(0).to(self.device)
            durations = torch.tensor([
                t.estimated_duration_minutes / 60.0  # Normalize to hours
                for t in tasks
            ]).float().unsqueeze(0).to(self.device)
            
            # Get ordering scores
            self.planning_model.eval()
            with torch.no_grad():
                scores = self.planning_model(task_types, difficulties, durations)
            
            # Sort tasks by score
            sorted_indices = torch.argsort(scores[0], descending=True).cpu().numpy()
            
            # Reorder while respecting hard dependencies
            optimized = self._reorder_with_dependencies(tasks, sorted_indices)
            
            return optimized
            
        except Exception as e:
            logger.warning(f"Neural ordering failed, using default order: {e}")
            return tasks
    
    def _reorder_with_dependencies(
        self,
        tasks: List[Task],
        preferred_order: np.ndarray
    ) -> List[Task]:
        """Reorder tasks while respecting dependencies"""
        # Build dependency graph
        task_by_id = {t.task_id: t for t in tasks}
        
        # Track which tasks have been scheduled
        scheduled = set()
        result = []
        
        for idx in preferred_order:
            task = tasks[idx]
            
            # Check if all preconditions are met
            preconditions_met = all(
                pre in scheduled or pre not in task_by_id
                for pre in task.preconditions
            )
            
            if preconditions_met:
                result.append(task)
                scheduled.add(task.task_id)
        
        # Add any remaining tasks
        for task in tasks:
            if task.task_id not in scheduled:
                result.append(task)
                scheduled.add(task.task_id)
        
        return result
    
    def update_task_status(
        self,
        plan: LearningPlan,
        task_id: str,
        new_status: TaskStatus,
        result: Optional[Dict] = None
    ) -> LearningPlan:
        """Update status of a task in the plan"""
        for task in plan.tasks:
            if task.task_id == task_id:
                task.status = new_status
                if new_status == TaskStatus.COMPLETED:
                    task.completed_at = datetime.utcnow()
                if result:
                    task.metadata['result'] = result
                break
        
        return plan
    
    def get_next_task(self, plan: LearningPlan) -> Optional[Task]:
        """Get the next task to execute"""
        for task in plan.tasks:
            if task.status == TaskStatus.PENDING:
                # Check if preconditions are met
                completed_ids = {
                    t.task_id for t in plan.tasks 
                    if t.status == TaskStatus.COMPLETED
                }
                
                preconditions_met = all(
                    pre in completed_ids
                    for pre in task.preconditions
                )
                
                if preconditions_met:
                    return task
        
        return None
    
    def adapt_plan(
        self,
        plan: LearningPlan,
        feedback: Dict
    ) -> LearningPlan:
        """
        Adapt plan based on learner feedback/performance
        
        Args:
            plan: Current plan
            feedback: Performance data, struggle indicators, etc.
        
        Returns:
            Adapted plan
        """
        # Check for struggle indicators
        if feedback.get('struggled', False):
            # Find related tasks and adjust difficulty
            related_skill = feedback.get('skill')
            for task in plan.tasks:
                if task.status == TaskStatus.PENDING:
                    if related_skill and related_skill in task.name.lower():
                        task.difficulty = max(0.2, task.difficulty - 0.15)
                        task.estimated_duration_minutes = int(task.estimated_duration_minutes * 1.25)
                        task.metadata['scaffolding_level'] = 'high'
        
        # Check for mastery indicators
        if feedback.get('mastered', False):
            mastered_skill = feedback.get('skill')
            # Remove redundant tasks
            plan.tasks = [
                t for t in plan.tasks
                if t.status != TaskStatus.PENDING or
                mastered_skill not in t.postconditions[0] if t.postconditions else True
            ]
        
        # Recalculate total duration
        plan.total_duration_minutes = sum(
            t.estimated_duration_minutes 
            for t in plan.tasks 
            if t.status == TaskStatus.PENDING
        )
        
        return plan
    
    def get_stats(self) -> Dict:
        """Get planner statistics"""
        return {
            "decomposition_rules_count": len(self.task_decomposition_rules),
            "task_types_tracked": len(self.task_type_to_id),
            "agent_types": list(self.agent_capabilities.keys()),
        }
