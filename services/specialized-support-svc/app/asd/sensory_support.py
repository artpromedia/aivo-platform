"""
ASD Sensory Support Service.

Provides sensory accommodations, environment modifications,
and regulation strategies for learners with sensory processing differences.
"""

import logging
from typing import Any, Dict, List, Optional

from .models import (
    ASDProfile,
    SensoryDomain,
    SensoryProfile,
    SensoryResponse,
)

logger = logging.getLogger(__name__)


class SensorySupportService:
    """
    Service for managing sensory support and accommodations.
    
    Provides:
    - Sensory environment assessments
    - Accommodation recommendations
    - Regulation strategy suggestions
    - Sensory break scheduling
    """
    
    # Default sensory accommodations by domain
    DEFAULT_ACCOMMODATIONS = {
        SensoryDomain.VISUAL: {
            SensoryResponse.HYPERSENSITIVE: [
                "Reduce fluorescent lighting or use natural light",
                "Provide sunglasses or tinted lenses option",
                "Use low-contrast color schemes on screens",
                "Minimize visual clutter in workspace",
                "Offer a privacy screen or carrel",
            ],
            SensoryResponse.HYPOSENSITIVE: [
                "Use bright, high-contrast materials",
                "Incorporate visual movement in learning materials",
                "Provide fidget toys with visual interest",
                "Use highlighted text and color coding",
            ],
        },
        SensoryDomain.AUDITORY: {
            SensoryResponse.HYPERSENSITIVE: [
                "Provide noise-canceling headphones",
                "Offer quiet workspace away from noise",
                "Give advance warning of loud sounds",
                "Use visual alerts instead of audio alerts",
                "Allow breaks during noisy activities",
            ],
            SensoryResponse.HYPOSENSITIVE: [
                "Use audio-based learning materials",
                "Incorporate music or rhythm in lessons",
                "Provide verbal instructions clearly",
                "Use sound-based feedback systems",
            ],
        },
        SensoryDomain.TACTILE: {
            SensoryResponse.HYPERSENSITIVE: [
                "Allow clothing tag removal",
                "Provide seating with comfortable textures",
                "Avoid unexpected touch",
                "Offer alternative materials for hands-on activities",
                "Allow use of gloves or barriers if needed",
            ],
            SensoryResponse.HYPOSENSITIVE: [
                "Provide fidget toys with varied textures",
                "Incorporate hands-on learning activities",
                "Use weighted blankets or lap pads",
                "Allow standing or movement during lessons",
            ],
        },
        SensoryDomain.VESTIBULAR: {
            SensoryResponse.HYPERSENSITIVE: [
                "Provide stable seating without rocking",
                "Allow breaks during movement activities",
                "Avoid sudden position changes",
                "Offer alternative to physical activities",
            ],
            SensoryResponse.HYPOSENSITIVE: [
                "Allow rocking or wobble chairs",
                "Incorporate movement breaks",
                "Provide opportunities for spinning/swinging",
                "Use exercise ball seating option",
            ],
        },
        SensoryDomain.PROPRIOCEPTIVE: {
            SensoryResponse.HYPERSENSITIVE: [
                "Avoid heavy physical activities",
                "Provide gentle movement alternatives",
                "Allow self-selected activity intensity",
            ],
            SensoryResponse.HYPOSENSITIVE: [
                "Provide weighted items (vest, blanket, lap pad)",
                "Incorporate heavy work activities",
                "Allow wall pushes or chair push-ups",
                "Use resistance bands on chair legs",
            ],
        },
    }

    # Regulation strategies by domain
    REGULATION_STRATEGIES = {
        SensoryDomain.VISUAL: [
            "Close eyes for 30 seconds",
            "Look at calming images",
            "Focus on a single point",
            "Use dimmer lighting temporarily",
        ],
        SensoryDomain.AUDITORY: [
            "Listen to white noise or calming music",
            "Use noise-canceling headphones",
            "Take a quiet break",
            "Practice deep breathing",
        ],
        SensoryDomain.TACTILE: [
            "Use a stress ball or fidget toy",
            "Apply firm pressure to arms/legs",
            "Rub hands together",
            "Touch preferred calming texture",
        ],
        SensoryDomain.VESTIBULAR: [
            "Rock gently in chair",
            "Take a short walk",
            "Sit with feet firmly planted",
            "Use grounding techniques",
        ],
        SensoryDomain.PROPRIOCEPTIVE: [
            "Do wall push-ups",
            "Squeeze hands together",
            "Press feet firmly into floor",
            "Carry something heavy briefly",
        ],
    }

    def __init__(self, llm_client: Optional[Any] = None):
        """Initialize the sensory support service."""
        self.llm = llm_client
        logger.info("SensorySupportService initialized")

    async def get_accommodations(
        self,
        profile: ASDProfile,
        context: Dict[str, Any] = None,
    ) -> List[str]:
        """
        Get sensory accommodations based on profile.
        
        Args:
            profile: ASD profile with sensory information
            context: Optional context about current situation
            
        Returns:
            List of recommended accommodations
        """
        context = context or {}
        accommodations = []
        
        for sensory_profile in profile.sensory_profiles:
            domain_accommodations = self.DEFAULT_ACCOMMODATIONS.get(
                sensory_profile.domain, {}
            ).get(sensory_profile.response_type, [])
            
            # Add default accommodations
            accommodations.extend(domain_accommodations)
            
            # Add profile-specific accommodations
            accommodations.extend(sensory_profile.accommodations)
        
        # Context-specific adjustments
        environment = context.get("environment", "classroom")
        if environment == "online":
            accommodations = [
                a for a in accommodations
                if "classroom" not in a.lower() and "seating" not in a.lower()
            ]
            accommodations.append("Adjust screen brightness and contrast")
            accommodations.append("Take regular screen breaks")
        
        return list(set(accommodations))

    async def get_regulation_strategies(
        self,
        profile: ASDProfile,
        current_state: str = "neutral",
    ) -> List[str]:
        """
        Get sensory regulation strategies.
        
        Args:
            profile: ASD profile with sensory information
            current_state: Current sensory state (overwhelmed, seeking, neutral)
            
        Returns:
            List of regulation strategies
        """
        strategies = []
        
        # Get strategies for hypersensitive domains if overwhelmed
        if current_state == "overwhelmed":
            for sensory_profile in profile.sensory_profiles:
                if sensory_profile.response_type == SensoryResponse.HYPERSENSITIVE:
                    strategies.extend(sensory_profile.calming_strategies)
                    strategies.extend(
                        self.REGULATION_STRATEGIES.get(sensory_profile.domain, [])
                    )
        
        # Get strategies for hyposensitive domains if seeking
        elif current_state == "seeking":
            for sensory_profile in profile.sensory_profiles:
                if sensory_profile.response_type == SensoryResponse.HYPOSENSITIVE:
                    strategies.extend(
                        self.REGULATION_STRATEGIES.get(sensory_profile.domain, [])
                    )
        
        # General strategies
        else:
            strategies.extend(profile.calming_strategies)
            strategies.append("Check in with your body - how do you feel?")
            strategies.append("Use your preferred sensory tool if needed")
        
        return list(set(strategies)) if strategies else [
            "Take a deep breath",
            "Use a fidget toy if helpful",
            "Take a short break if needed",
        ]

    async def assess_environment(
        self,
        profile: ASDProfile,
        environment: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Assess an environment for sensory compatibility.
        
        Args:
            profile: ASD profile with sensory information
            environment: Description of the environment
            
        Returns:
            Assessment with compatibility score and recommendations
        """
        concerns = []
        recommendations = []
        compatibility_score = 1.0
        
        # Check lighting
        lighting = environment.get("lighting", "fluorescent")
        visual_profile = next(
            (p for p in profile.sensory_profiles 
             if p.domain == SensoryDomain.VISUAL),
            None
        )
        if visual_profile and visual_profile.response_type == SensoryResponse.HYPERSENSITIVE:
            if lighting == "fluorescent":
                concerns.append("Fluorescent lighting may cause discomfort")
                recommendations.append("Request natural lighting or lamp alternatives")
                compatibility_score -= 0.2
        
        # Check noise level
        noise_level = environment.get("noise_level", "moderate")
        auditory_profile = next(
            (p for p in profile.sensory_profiles 
             if p.domain == SensoryDomain.AUDITORY),
            None
        )
        if auditory_profile and auditory_profile.response_type == SensoryResponse.HYPERSENSITIVE:
            if noise_level in ["loud", "moderate"]:
                concerns.append(f"{noise_level.title()} noise may be overwhelming")
                recommendations.append("Bring noise-canceling headphones")
                compatibility_score -= 0.15 if noise_level == "moderate" else 0.3
        
        # Check seating
        seating = environment.get("seating", "standard")
        if seating == "standard" and any(
            p.domain in [SensoryDomain.VESTIBULAR, SensoryDomain.PROPRIOCEPTIVE]
            and p.response_type == SensoryResponse.HYPOSENSITIVE
            for p in profile.sensory_profiles
        ):
            recommendations.append("Request alternative seating (wobble chair, exercise ball)")
            compatibility_score -= 0.1
        
        return {
            "compatibility_score": max(0, compatibility_score),
            "concerns": concerns,
            "recommendations": recommendations,
            "accommodations_needed": await self.get_accommodations(profile, environment),
        }

    async def plan_sensory_breaks(
        self,
        profile: ASDProfile,
        session_duration_minutes: int = 45,
    ) -> List[Dict[str, Any]]:
        """
        Plan sensory breaks for a learning session.
        
        Args:
            profile: ASD profile with sensory information
            session_duration_minutes: Length of the learning session
            
        Returns:
            List of planned sensory breaks with timing and activities
        """
        breaks = []
        
        # Calculate break frequency based on sensory needs
        hypersensitive_count = len([
            p for p in profile.sensory_profiles
            if p.response_type == SensoryResponse.HYPERSENSITIVE
        ])
        
        # More breaks for more sensory sensitivities
        break_interval = max(10, 20 - (hypersensitive_count * 3))
        
        current_time = 0
        break_num = 1
        
        while current_time + break_interval < session_duration_minutes:
            current_time += break_interval
            
            activities = await self.get_regulation_strategies(profile, "neutral")
            
            breaks.append({
                "break_number": break_num,
                "time_minutes": current_time,
                "duration_minutes": 3 if break_num % 3 != 0 else 5,
                "suggested_activities": activities[:3],
                "purpose": "sensory regulation",
            })
            break_num += 1
        
        return breaks
