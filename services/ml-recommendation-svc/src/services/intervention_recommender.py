"""
Intervention Recommender Service

Evidence-based intervention matching system for at-risk students:
- Maps risk factors to appropriate interventions
- Considers intervention effectiveness data
- Supports A/B testing for intervention optimization
- FERPA-compliant with educator oversight requirements

IMPORTANT: Interventions must be reviewed by qualified educators before implementation.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional
import json
import logging
import random
from collections import defaultdict

logger = logging.getLogger(__name__)


class InterventionType(str, Enum):
    """Types of interventions"""
    ACADEMIC = "academic"
    ENGAGEMENT = "engagement"
    BEHAVIORAL = "behavioral"
    SOCIAL_EMOTIONAL = "social_emotional"
    PARENT_INVOLVEMENT = "parent_involvement"
    PEER_SUPPORT = "peer_support"
    TEACHER_CONTACT = "teacher_contact"


class InterventionIntensity(str, Enum):
    """Intensity levels of interventions"""
    LIGHT = "light"  # Automated, low-touch
    MODERATE = "moderate"  # Some human involvement
    INTENSIVE = "intensive"  # Requires significant human resources


class InterventionUrgency(str, Enum):
    """Urgency of intervention"""
    IMMEDIATE = "immediate"
    SHORT_TERM = "short_term"
    MEDIUM_TERM = "medium_term"


class InterventionStatus(str, Enum):
    """Status of an intervention assignment"""
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DECLINED = "declined"


@dataclass
class InterventionDefinition:
    """Definition of an intervention strategy"""
    id: str
    name: str
    description: str
    intervention_type: InterventionType
    intensity: InterventionIntensity
    target_risk_factors: list[str]
    prerequisites: list[str]  # Other interventions that should be tried first
    exclusions: list[str]  # Interventions that conflict
    estimated_duration_days: int
    requires_parent_consent: bool
    requires_educator_approval: bool
    success_indicators: list[str]
    implementation_steps: list[str]
    resources_required: dict[str, Any]
    evidence_base: str
    effectiveness_score: float  # Historical effectiveness 0-1


@dataclass
class RecommendedIntervention:
    """A specific intervention recommendation for a student"""
    intervention_id: str
    intervention_name: str
    intervention_type: InterventionType
    intensity: InterventionIntensity
    urgency: InterventionUrgency
    relevance_score: float  # How well it matches risk factors
    expected_effectiveness: float  # Predicted effectiveness for this student
    confidence: float
    target_risk_factors: list[str]  # Which risk factors this addresses
    rationale: str  # Human-readable explanation
    implementation_notes: str
    estimated_duration_days: int
    requires_parent_consent: bool
    requires_educator_approval: bool
    success_indicators: list[str]
    experiment_group: Optional[str] = None  # For A/B testing


@dataclass
class InterventionPlan:
    """Complete intervention plan for a student"""
    student_id: str
    created_at: datetime
    risk_level: str
    primary_recommendations: list[RecommendedIntervention]
    secondary_recommendations: list[RecommendedIntervention]
    excluded_interventions: list[dict[str, str]]  # Interventions excluded with reasons
    review_date: datetime
    notes: str
    requires_immediate_action: bool
    educator_approval_required: bool


@dataclass
class InterventionOutcome:
    """Outcome tracking for an intervention"""
    intervention_id: str
    student_id: str
    tenant_id: str
    started_at: datetime
    ended_at: Optional[datetime]
    status: InterventionStatus
    initial_risk_score: float
    final_risk_score: Optional[float]
    success_indicators_met: dict[str, bool]
    educator_notes: Optional[str]
    effectiveness_rating: Optional[float]  # Educator-provided rating


# Evidence-based intervention catalog
INTERVENTION_CATALOG: list[InterventionDefinition] = [
    # Academic interventions
    InterventionDefinition(
        id="int_targeted_practice",
        name="Targeted Skill Practice",
        description="Personalized practice focused on specific skill gaps",
        intervention_type=InterventionType.ACADEMIC,
        intensity=InterventionIntensity.LIGHT,
        target_risk_factors=["skill_gaps_count", "current_mastery", "correct_first_attempt_rate"],
        prerequisites=[],
        exclusions=[],
        estimated_duration_days=14,
        requires_parent_consent=False,
        requires_educator_approval=False,
        success_indicators=["mastery_improvement", "skill_gap_reduction"],
        implementation_steps=[
            "Identify top 3 skill gaps",
            "Generate focused practice problems",
            "Provide immediate feedback and explanations",
            "Track progress and adjust difficulty"
        ],
        resources_required={"automated": True},
        evidence_base="Research shows targeted practice improves mastery by 20-30%",
        effectiveness_score=0.72
    ),
    InterventionDefinition(
        id="int_scaffolded_content",
        name="Scaffolded Content Delivery",
        description="Break content into smaller, manageable chunks with additional support",
        intervention_type=InterventionType.ACADEMIC,
        intensity=InterventionIntensity.LIGHT,
        target_risk_factors=["frustration_signals", "help_request_rate", "session_abandonment_rate"],
        prerequisites=[],
        exclusions=[],
        estimated_duration_days=21,
        requires_parent_consent=False,
        requires_educator_approval=False,
        success_indicators=["reduced_frustration", "improved_completion"],
        implementation_steps=[
            "Reduce content chunk size by 50%",
            "Add visual aids and examples",
            "Provide progress indicators",
            "Celebrate small wins"
        ],
        resources_required={"automated": True},
        evidence_base="Chunking content reduces cognitive load and improves retention",
        effectiveness_score=0.68
    ),
    InterventionDefinition(
        id="int_prerequisite_review",
        name="Prerequisite Skills Review",
        description="Review and strengthen prerequisite skills before advancing",
        intervention_type=InterventionType.ACADEMIC,
        intensity=InterventionIntensity.MODERATE,
        target_risk_factors=["correct_first_attempt_rate", "mastery_vs_class"],
        prerequisites=[],
        exclusions=["int_advanced_content"],
        estimated_duration_days=10,
        requires_parent_consent=False,
        requires_educator_approval=True,
        success_indicators=["prerequisite_mastery", "improved_first_attempt_rate"],
        implementation_steps=[
            "Identify missing prerequisite skills",
            "Create review pathway",
            "Monitor progress on prerequisites",
            "Reassess readiness for current content"
        ],
        resources_required={"educator_time_minutes": 30},
        evidence_base="Addressing prerequisite gaps improves overall learning outcomes",
        effectiveness_score=0.75
    ),
    
    # Engagement interventions
    InterventionDefinition(
        id="int_engagement_boost",
        name="Engagement Boost Program",
        description="Gamification and motivation enhancements to increase engagement",
        intervention_type=InterventionType.ENGAGEMENT,
        intensity=InterventionIntensity.LIGHT,
        target_risk_factors=["days_since_last_session", "session_frequency_7d", "completion_rate"],
        prerequisites=[],
        exclusions=[],
        estimated_duration_days=14,
        requires_parent_consent=False,
        requires_educator_approval=False,
        success_indicators=["increased_session_frequency", "improved_completion_rate"],
        implementation_steps=[
            "Enable streak bonuses and achievements",
            "Add progress celebrations",
            "Send engaging reminder notifications",
            "Introduce optional challenges"
        ],
        resources_required={"automated": True},
        evidence_base="Gamification increases engagement by 40% on average",
        effectiveness_score=0.65
    ),
    InterventionDefinition(
        id="int_choice_autonomy",
        name="Increase Learner Choice",
        description="Provide more options for learning activities to increase autonomy",
        intervention_type=InterventionType.ENGAGEMENT,
        intensity=InterventionIntensity.LIGHT,
        target_risk_factors=["completion_rate", "session_abandonment_rate", "avg_session_duration"],
        prerequisites=[],
        exclusions=[],
        estimated_duration_days=21,
        requires_parent_consent=False,
        requires_educator_approval=False,
        success_indicators=["increased_engagement", "improved_completion"],
        implementation_steps=[
            "Offer activity type choices (video, interactive, reading)",
            "Allow topic selection within standards",
            "Enable pace customization",
            "Provide break scheduling options"
        ],
        resources_required={"automated": True},
        evidence_base="Learner autonomy correlates with intrinsic motivation",
        effectiveness_score=0.60
    ),
    
    # Teacher contact interventions
    InterventionDefinition(
        id="int_teacher_checkin",
        name="Teacher Check-In",
        description="Regular teacher check-ins to provide support and accountability",
        intervention_type=InterventionType.TEACHER_CONTACT,
        intensity=InterventionIntensity.MODERATE,
        target_risk_factors=["days_since_last_session", "mastery_trend_7d", "session_frequency_7d"],
        prerequisites=[],
        exclusions=[],
        estimated_duration_days=14,
        requires_parent_consent=False,
        requires_educator_approval=True,
        success_indicators=["re_engagement", "progress_improvement"],
        implementation_steps=[
            "Schedule 10-minute check-in with student",
            "Review recent progress and challenges",
            "Set achievable short-term goals",
            "Schedule follow-up"
        ],
        resources_required={"educator_time_minutes": 30},
        evidence_base="Teacher relationships are strongest predictor of student success",
        effectiveness_score=0.82
    ),
    InterventionDefinition(
        id="int_small_group",
        name="Small Group Instruction",
        description="Targeted small group instruction for struggling students",
        intervention_type=InterventionType.TEACHER_CONTACT,
        intensity=InterventionIntensity.INTENSIVE,
        target_risk_factors=["current_mastery", "skill_gaps_count", "mastery_vs_class"],
        prerequisites=["int_targeted_practice"],
        exclusions=[],
        estimated_duration_days=28,
        requires_parent_consent=False,
        requires_educator_approval=True,
        success_indicators=["mastery_improvement", "confidence_increase"],
        implementation_steps=[
            "Form small group of 3-5 students with similar needs",
            "Design targeted mini-lessons",
            "Provide additional practice opportunities",
            "Monitor progress weekly"
        ],
        resources_required={"educator_time_minutes": 120},
        evidence_base="Small group instruction shows 0.3-0.5 effect size on achievement",
        effectiveness_score=0.78
    ),
    
    # Parent involvement
    InterventionDefinition(
        id="int_parent_notification",
        name="Parent Progress Update",
        description="Send detailed progress report to parents with actionable suggestions",
        intervention_type=InterventionType.PARENT_INVOLVEMENT,
        intensity=InterventionIntensity.LIGHT,
        target_risk_factors=["days_since_last_session", "completion_rate"],
        prerequisites=[],
        exclusions=[],
        estimated_duration_days=7,
        requires_parent_consent=False,
        requires_educator_approval=True,
        success_indicators=["increased_engagement", "parent_acknowledgment"],
        implementation_steps=[
            "Generate progress summary",
            "Include specific suggestions for home support",
            "Send via preferred parent communication channel",
            "Track parent engagement with report"
        ],
        resources_required={"educator_time_minutes": 15},
        evidence_base="Parent involvement improves outcomes across all demographics",
        effectiveness_score=0.55
    ),
    InterventionDefinition(
        id="int_parent_conference",
        name="Parent-Teacher Conference",
        description="Schedule conference to discuss concerns and create support plan",
        intervention_type=InterventionType.PARENT_INVOLVEMENT,
        intensity=InterventionIntensity.INTENSIVE,
        target_risk_factors=["current_mastery", "mastery_trend_7d", "frustration_signals"],
        prerequisites=["int_parent_notification"],
        exclusions=[],
        estimated_duration_days=14,
        requires_parent_consent=True,
        requires_educator_approval=True,
        success_indicators=["aligned_support_plan", "improved_home_engagement"],
        implementation_steps=[
            "Schedule conference at parent-preferred time",
            "Prepare progress data and examples",
            "Collaboratively develop support plan",
            "Establish follow-up communication"
        ],
        resources_required={"educator_time_minutes": 60},
        evidence_base="Collaborative family-school plans show strong outcomes",
        effectiveness_score=0.70
    ),
    
    # Peer support
    InterventionDefinition(
        id="int_peer_tutoring",
        name="Peer Tutoring Program",
        description="Pair struggling student with peer tutor for collaborative learning",
        intervention_type=InterventionType.PEER_SUPPORT,
        intensity=InterventionIntensity.MODERATE,
        target_risk_factors=["current_mastery", "mastery_vs_class", "frustration_signals"],
        prerequisites=[],
        exclusions=[],
        estimated_duration_days=21,
        requires_parent_consent=True,
        requires_educator_approval=True,
        success_indicators=["mastery_improvement", "social_engagement"],
        implementation_steps=[
            "Identify compatible peer tutor",
            "Train peer tutor on effective support",
            "Schedule regular tutoring sessions",
            "Monitor relationship and progress"
        ],
        resources_required={"educator_time_minutes": 45},
        evidence_base="Peer tutoring benefits both tutor and tutee academically and socially",
        effectiveness_score=0.68
    ),
    
    # Social-emotional
    InterventionDefinition(
        id="int_sel_support",
        name="Social-Emotional Learning Support",
        description="Targeted SEL activities to address anxiety or frustration",
        intervention_type=InterventionType.SOCIAL_EMOTIONAL,
        intensity=InterventionIntensity.MODERATE,
        target_risk_factors=["frustration_signals", "session_abandonment_rate"],
        prerequisites=[],
        exclusions=[],
        estimated_duration_days=28,
        requires_parent_consent=True,
        requires_educator_approval=True,
        success_indicators=["reduced_frustration", "improved_persistence"],
        implementation_steps=[
            "Assess specific SEL needs",
            "Introduce mindfulness/calming activities",
            "Teach growth mindset strategies",
            "Monitor emotional indicators"
        ],
        resources_required={"educator_time_minutes": 60, "counselor_involvement": True},
        evidence_base="SEL interventions improve both emotional well-being and academics",
        effectiveness_score=0.72
    ),
]


class InterventionRecommender:
    """
    Recommends evidence-based interventions based on student risk profiles.
    
    ETHICAL GUIDELINES:
    - All interventions require human oversight
    - Recommendations are suggestions, not mandates
    - Student privacy and dignity are paramount
    - Interventions should never be punitive
    """
    
    def __init__(
        self,
        redis_client: Optional[Any] = None,
        experiment_config: Optional[dict] = None
    ):
        self.redis = redis_client
        self.experiment_config = experiment_config or {}
        self.intervention_map = {i.id: i for i in INTERVENTION_CATALOG}
        
        # Build risk factor to intervention index
        self.risk_to_interventions: dict[str, list[str]] = defaultdict(list)
        for intervention in INTERVENTION_CATALOG:
            for risk_factor in intervention.target_risk_factors:
                self.risk_to_interventions[risk_factor].append(intervention.id)
    
    async def recommend_interventions(
        self,
        student_id: str,
        tenant_id: str,
        risk_prediction: Any,  # RiskPrediction from student_risk_model
        student_context: Optional[dict] = None
    ) -> InterventionPlan:
        """
        Generate intervention recommendations based on risk prediction.
        
        Args:
            student_id: Student identifier
            tenant_id: Tenant context
            risk_prediction: Risk prediction from StudentRiskModel
            student_context: Additional context (demographics, IEP status, etc.)
        
        Returns:
            InterventionPlan with prioritized recommendations
        """
        student_context = student_context or {}
        
        # Get previous interventions to avoid repetition
        previous_interventions = await self._get_intervention_history(
            student_id, tenant_id
        )
        active_interventions = [
            i for i in previous_interventions 
            if i.get("status") in ["approved", "in_progress"]
        ]
        
        # Score all interventions
        scored_interventions = self._score_interventions(
            risk_prediction,
            previous_interventions,
            student_context
        )
        
        # Apply A/B testing if configured
        if self.experiment_config:
            scored_interventions = self._apply_experiments(
                student_id, scored_interventions
            )
        
        # Filter and sort
        valid_interventions = [
            i for i in scored_interventions
            if i["score"] > 0.3 and not self._is_excluded(i, active_interventions)
        ]
        valid_interventions.sort(key=lambda x: x["score"], reverse=True)
        
        # Create recommendations
        primary = self._create_recommendations(
            valid_interventions[:3],
            risk_prediction
        )
        secondary = self._create_recommendations(
            valid_interventions[3:6],
            risk_prediction
        )
        
        # Identify excluded interventions with reasons
        excluded = self._get_excluded_interventions(
            scored_interventions,
            active_interventions
        )
        
        # Determine urgency
        requires_immediate = risk_prediction.risk_level.value in ["critical", "high"]
        educator_approval = any(
            self.intervention_map[r.intervention_id].requires_educator_approval
            for r in primary + secondary
        )
        
        plan = InterventionPlan(
            student_id=student_id,
            created_at=datetime.utcnow(),
            risk_level=risk_prediction.risk_level.value,
            primary_recommendations=primary,
            secondary_recommendations=secondary,
            excluded_interventions=excluded,
            review_date=datetime.utcnow() + timedelta(days=7),
            notes=self._generate_plan_notes(risk_prediction, primary),
            requires_immediate_action=requires_immediate,
            educator_approval_required=educator_approval
        )
        
        # Store plan for tracking
        await self._store_plan(plan, tenant_id)
        
        return plan
    
    def _score_interventions(
        self,
        risk_prediction: Any,
        previous_interventions: list[dict],
        student_context: dict
    ) -> list[dict]:
        """Score all interventions based on relevance and expected effectiveness"""
        scored = []
        
        # Extract active risk factors
        risk_factors = {f.feature: f.contribution for f in risk_prediction.top_risk_factors}
        
        for intervention in INTERVENTION_CATALOG:
            # Calculate relevance score based on matching risk factors
            relevance = 0.0
            matched_factors = []
            for target in intervention.target_risk_factors:
                if target in risk_factors:
                    relevance += risk_factors[target]
                    matched_factors.append(target)
            
            if not matched_factors:
                continue
            
            # Normalize relevance
            relevance = min(relevance / len(intervention.target_risk_factors), 1.0)
            
            # Adjust for historical effectiveness
            effectiveness = intervention.effectiveness_score
            
            # Check if prerequisites are met
            prereq_met = all(
                any(p.get("intervention_id") == prereq and p.get("status") == "completed"
                    for p in previous_interventions)
                for prereq in intervention.prerequisites
            ) if intervention.prerequisites else True
            
            # Penalize if recently tried unsuccessfully
            recent_failure = any(
                p.get("intervention_id") == intervention.id
                and p.get("status") == "completed"
                and p.get("effectiveness_rating", 1.0) < 0.5
                and (datetime.utcnow() - datetime.fromisoformat(p.get("ended_at", datetime.min.isoformat()))).days < 30
                for p in previous_interventions
            )
            
            # Calculate final score
            score = relevance * 0.5 + effectiveness * 0.5
            
            if not prereq_met:
                score *= 0.3  # Heavily discount if prerequisites not met
            if recent_failure:
                score *= 0.5  # Discount if recently failed
            
            # Adjust for student context
            if student_context.get("has_iep") and intervention.intensity == InterventionIntensity.INTENSIVE:
                score *= 1.1  # Boost intensive interventions for IEP students
            
            scored.append({
                "intervention_id": intervention.id,
                "score": score,
                "relevance": relevance,
                "effectiveness": effectiveness,
                "matched_factors": matched_factors,
                "prereq_met": prereq_met,
                "recent_failure": recent_failure
            })
        
        return scored
    
    def _apply_experiments(
        self,
        student_id: str,
        interventions: list[dict]
    ) -> list[dict]:
        """Apply A/B testing experiments to intervention selection"""
        for intervention in interventions:
            for experiment_name, config in self.experiment_config.items():
                if intervention["intervention_id"] in config.get("interventions", []):
                    # Deterministic assignment based on student_id
                    hash_input = f"{student_id}:{experiment_name}"
                    hash_val = int.from_bytes(hash_input.encode(), 'little') % 100
                    
                    if hash_val < config.get("treatment_percent", 50):
                        intervention["experiment_group"] = f"{experiment_name}:treatment"
                        intervention["score"] *= config.get("treatment_boost", 1.2)
                    else:
                        intervention["experiment_group"] = f"{experiment_name}:control"
        
        return interventions
    
    def _is_excluded(
        self,
        intervention: dict,
        active_interventions: list[dict]
    ) -> bool:
        """Check if intervention is excluded due to active interventions"""
        int_def = self.intervention_map[intervention["intervention_id"]]
        
        active_ids = {a.get("intervention_id") for a in active_interventions}
        
        # Check if already active
        if intervention["intervention_id"] in active_ids:
            return True
        
        # Check for conflicting interventions
        return any(exc in active_ids for exc in int_def.exclusions)
    
    def _create_recommendations(
        self,
        scored: list[dict],
        risk_prediction: Any
    ) -> list[RecommendedIntervention]:
        """Create recommendation objects from scored interventions"""
        recommendations = []
        
        for item in scored:
            int_def = self.intervention_map[item["intervention_id"]]
            
            # Determine urgency
            if risk_prediction.risk_level.value == "critical":
                urgency = InterventionUrgency.IMMEDIATE
            elif risk_prediction.risk_level.value == "high":
                urgency = InterventionUrgency.SHORT_TERM
            else:
                urgency = InterventionUrgency.MEDIUM_TERM
            
            # Generate rationale
            rationale = self._generate_rationale(int_def, item["matched_factors"])
            
            recommendations.append(RecommendedIntervention(
                intervention_id=int_def.id,
                intervention_name=int_def.name,
                intervention_type=int_def.intervention_type,
                intensity=int_def.intensity,
                urgency=urgency,
                relevance_score=item["relevance"],
                expected_effectiveness=item["effectiveness"],
                confidence=item["relevance"] * 0.5 + item["effectiveness"] * 0.5,
                target_risk_factors=item["matched_factors"],
                rationale=rationale,
                implementation_notes="\n".join(int_def.implementation_steps),
                estimated_duration_days=int_def.estimated_duration_days,
                requires_parent_consent=int_def.requires_parent_consent,
                requires_educator_approval=int_def.requires_educator_approval,
                success_indicators=int_def.success_indicators,
                experiment_group=item.get("experiment_group")
            ))
        
        return recommendations
    
    def _generate_rationale(
        self,
        intervention: InterventionDefinition,
        matched_factors: list[str]
    ) -> str:
        """Generate human-readable rationale for recommendation"""
        factors_text = ", ".join(
            f.replace("_", " ") for f in matched_factors
        )
        
        return (
            f"Recommended based on concerns about {factors_text}. "
            f"This intervention has shown {int(intervention.effectiveness_score * 100)}% "
            f"effectiveness in similar situations. {intervention.evidence_base}"
        )
    
    def _get_excluded_interventions(
        self,
        all_scored: list[dict],
        active: list[dict]
    ) -> list[dict[str, str]]:
        """Get list of excluded interventions with reasons"""
        excluded = []
        active_ids = {a.get("intervention_id") for a in active}
        
        for item in all_scored:
            if item["score"] <= 0.3:
                continue
            
            int_def = self.intervention_map[item["intervention_id"]]
            
            if item["intervention_id"] in active_ids:
                excluded.append({
                    "intervention_id": item["intervention_id"],
                    "name": int_def.name,
                    "reason": "Already active"
                })
            elif not item.get("prereq_met", True):
                prereq_names = [
                    self.intervention_map[p].name 
                    for p in int_def.prerequisites
                ]
                excluded.append({
                    "intervention_id": item["intervention_id"],
                    "name": int_def.name,
                    "reason": f"Prerequisites not met: {', '.join(prereq_names)}"
                })
            elif item.get("recent_failure"):
                excluded.append({
                    "intervention_id": item["intervention_id"],
                    "name": int_def.name,
                    "reason": "Recently tried with limited success"
                })
            elif any(exc in active_ids for exc in int_def.exclusions):
                excluded.append({
                    "intervention_id": item["intervention_id"],
                    "name": int_def.name,
                    "reason": "Conflicts with active intervention"
                })
        
        return excluded
    
    def _generate_plan_notes(
        self,
        risk_prediction: Any,
        primary: list[RecommendedIntervention]
    ) -> str:
        """Generate summary notes for the intervention plan"""
        notes = [
            f"Student identified at {risk_prediction.risk_level.value} risk level.",
            f"Risk score: {risk_prediction.risk_score:.2f} (confidence: {risk_prediction.confidence:.2f})",
        ]
        
        if risk_prediction.risk_trend.value == "increasing":
            notes.append("ALERT: Risk is trending upward.")
        elif risk_prediction.risk_trend.value == "decreasing":
            notes.append("Positive: Risk is trending downward.")
        
        if primary:
            notes.append(f"Recommended {len(primary)} primary intervention(s).")
            
            consent_required = [r for r in primary if r.requires_parent_consent]
            if consent_required:
                notes.append(
                    f"Parent consent required for: "
                    f"{', '.join(r.intervention_name for r in consent_required)}"
                )
        
        return " ".join(notes)
    
    async def _get_intervention_history(
        self,
        student_id: str,
        tenant_id: str
    ) -> list[dict]:
        """Get historical interventions for a student"""
        if not self.redis:
            return []
        
        key = f"intervention_history:{tenant_id}:{student_id}"
        history = await self.redis.lrange(key, 0, 50)
        
        return [json.loads(h) for h in history] if history else []
    
    async def _store_plan(
        self,
        plan: InterventionPlan,
        tenant_id: str
    ) -> None:
        """Store intervention plan for tracking"""
        if not self.redis:
            return
        
        key = f"intervention_plans:{tenant_id}:{plan.student_id}"
        
        plan_data = {
            "created_at": plan.created_at.isoformat(),
            "risk_level": plan.risk_level,
            "recommendations": [
                {
                    "intervention_id": r.intervention_id,
                    "name": r.intervention_name,
                    "relevance": r.relevance_score,
                    "effectiveness": r.expected_effectiveness
                }
                for r in plan.primary_recommendations
            ]
        }
        
        await self.redis.lpush(key, json.dumps(plan_data))
        await self.redis.ltrim(key, 0, 19)  # Keep last 20 plans
    
    async def record_outcome(
        self,
        outcome: InterventionOutcome
    ) -> None:
        """Record intervention outcome for effectiveness tracking"""
        if not self.redis:
            logger.warning("No Redis client - cannot record outcome")
            return
        
        # Store in student history
        history_key = f"intervention_history:{outcome.tenant_id}:{outcome.student_id}"
        
        outcome_data = {
            "intervention_id": outcome.intervention_id,
            "started_at": outcome.started_at.isoformat(),
            "ended_at": outcome.ended_at.isoformat() if outcome.ended_at else None,
            "status": outcome.status.value,
            "initial_risk_score": outcome.initial_risk_score,
            "final_risk_score": outcome.final_risk_score,
            "effectiveness_rating": outcome.effectiveness_rating
        }
        
        await self.redis.lpush(history_key, json.dumps(outcome_data))
        await self.redis.ltrim(history_key, 0, 99)  # Keep last 100 interventions
        
        # Update aggregated effectiveness data
        await self._update_effectiveness_stats(outcome)
        
        logger.info(
            f"Recorded intervention outcome: {outcome.intervention_id} "
            f"for student {outcome.student_id} - {outcome.status.value}"
        )
    
    async def _update_effectiveness_stats(
        self,
        outcome: InterventionOutcome
    ) -> None:
        """Update aggregated intervention effectiveness statistics"""
        if outcome.status != InterventionStatus.COMPLETED:
            return
        
        if outcome.effectiveness_rating is None and outcome.final_risk_score is None:
            return
        
        # Calculate effectiveness score
        if outcome.effectiveness_rating is not None:
            effectiveness = outcome.effectiveness_rating
        elif outcome.final_risk_score is not None:
            # Score based on risk reduction
            risk_reduction = outcome.initial_risk_score - outcome.final_risk_score
            effectiveness = max(0, min(1, 0.5 + risk_reduction))
        else:
            return
        
        # Update running average
        stats_key = f"intervention_effectiveness:{outcome.intervention_id}"
        
        current = await self.redis.hgetall(stats_key)
        count = int(current.get("count", 0)) + 1
        avg = float(current.get("avg", 0))
        
        # Running average calculation
        new_avg = avg + (effectiveness - avg) / count
        
        await self.redis.hset(stats_key, mapping={
            "count": count,
            "avg": new_avg,
            "last_updated": datetime.utcnow().isoformat()
        })
