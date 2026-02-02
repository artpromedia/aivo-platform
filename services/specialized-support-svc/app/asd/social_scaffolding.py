"""
ASD Social Scaffolding Service.

Provides social skill support, scripts for social situations,
and communication accommodations for learners on the autism spectrum.
"""

import logging
from typing import Any, Dict, List, Optional

from .models import (
    ASDProfile,
    CommunicationPreference,
    CommunicationStyle,
    SocialScript,
    SocialSituation,
)

logger = logging.getLogger(__name__)


class SocialScaffoldingService:
    """
    Service for social skill support and scaffolding.
    
    Provides:
    - Social scripts for various situations
    - Communication supports
    - Social situation preparation
    - Interaction guidance
    """

    # Pre-built social scripts for common situations
    SOCIAL_SCRIPTS = {
        SocialSituation.ONE_ON_ONE: {
            "greeting": SocialScript(
                situation=SocialSituation.ONE_ON_ONE,
                title="Greeting a Peer",
                steps=[
                    "Make eye contact briefly (or look at their forehead)",
                    "Say 'Hi' or 'Hello'",
                    "You can add their name if you know it",
                    "Wait for them to respond",
                    "You can ask 'How are you?' if you want to continue",
                ],
                expected_responses=[
                    "They might say 'Hi' back",
                    "They might ask how you are",
                    "They might wave",
                    "They might nod",
                ],
                visual_supports=["👋 Wave", "😊 Smile", "👀 Eye contact"],
            ),
            "asking_for_help": SocialScript(
                situation=SocialSituation.ONE_ON_ONE,
                title="Asking for Help",
                steps=[
                    "Get the person's attention politely",
                    "Say 'Excuse me' or use their name",
                    "Clearly state what you need help with",
                    "Wait for their response",
                    "Say 'Thank you' when they help",
                ],
                expected_responses=[
                    "They might say 'Sure' and help",
                    "They might ask questions to understand",
                    "They might say they can't help right now",
                    "They might suggest someone else who can help",
                ],
                visual_supports=["🙋 Raise hand", "❓ Question mark", "🙏 Thank you"],
            ),
        },
        SocialSituation.SMALL_GROUP: {
            "joining_conversation": SocialScript(
                situation=SocialSituation.SMALL_GROUP,
                title="Joining a Group Conversation",
                steps=[
                    "Stand near the group and listen first",
                    "Wait for a pause in conversation",
                    "Make a relevant comment or ask a question",
                    "Take turns in the conversation",
                    "It's okay to listen more than talk",
                ],
                expected_responses=[
                    "Someone might include you in the conversation",
                    "They might continue talking - you can listen",
                    "Someone might ask you a question",
                ],
                visual_supports=["👂 Listen", "⏸️ Wait", "💬 Speak"],
            ),
            "group_work": SocialScript(
                situation=SocialSituation.SMALL_GROUP,
                title="Working in a Group",
                steps=[
                    "Listen to the task instructions",
                    "Share ideas when asked or during your turn",
                    "Listen to others' ideas respectfully",
                    "Take on a role that fits your strengths",
                    "Ask for clarification if confused",
                ],
                expected_responses=[
                    "Group members will share ideas",
                    "Someone might assign roles",
                    "People might disagree - that's normal",
                ],
                visual_supports=["👥 Group", "🤝 Cooperate", "✅ Task"],
            ),
        },
        SocialSituation.CLASSROOM: {
            "answering_question": SocialScript(
                situation=SocialSituation.CLASSROOM,
                title="Answering a Question in Class",
                steps=[
                    "Raise your hand to be called on",
                    "Wait until the teacher calls your name",
                    "Speak clearly so everyone can hear",
                    "It's okay to say 'I'm not sure' or 'Can I think about it?'",
                    "Listen to the teacher's response",
                ],
                expected_responses=[
                    "Teacher might say 'Correct' or 'Good answer'",
                    "Teacher might ask follow-up questions",
                    "Teacher might give more information",
                    "Other students might add to your answer",
                ],
                visual_supports=["🙋 Raise hand", "⏳ Wait", "🗣️ Speak"],
            ),
        },
        SocialSituation.ONLINE: {
            "virtual_meeting": SocialScript(
                situation=SocialSituation.ONLINE,
                title="Participating in Online Class",
                steps=[
                    "Join with camera/microphone as expected",
                    "Stay muted unless speaking",
                    "Use the chat or raise hand feature to participate",
                    "Wait to be unmuted before speaking",
                    "Keep responses brief and on-topic",
                ],
                expected_responses=[
                    "Teacher may call on you",
                    "Others may respond in chat",
                    "Technical issues may happen - it's okay",
                ],
                visual_supports=["🎤 Mute/Unmute", "✋ Raise hand", "💬 Chat"],
            ),
        },
    }

    # Communication style adaptations
    COMMUNICATION_ADAPTATIONS = {
        CommunicationStyle.VISUAL_SUPPORTS: [
            "Use pictures or icons alongside words",
            "Provide written instructions",
            "Use visual schedules and checklists",
            "Include diagrams when explaining concepts",
        ],
        CommunicationStyle.WRITTEN: [
            "Provide information in writing",
            "Allow written responses instead of verbal",
            "Use email or messaging for communication",
            "Give time to read and process",
        ],
        CommunicationStyle.AAC: [
            "Support use of AAC device",
            "Allow extra time for responses",
            "Accept all forms of communication equally",
            "Ensure AAC device is accessible",
        ],
    }

    def __init__(self, llm_client: Optional[Any] = None):
        """Initialize the social scaffolding service."""
        self.llm = llm_client
        logger.info("SocialScaffoldingService initialized")

    async def get_social_script(
        self,
        profile: ASDProfile,
        situation: SocialSituation,
        script_type: str = "greeting",
    ) -> SocialScript:
        """
        Get a social script for a specific situation.
        
        Args:
            profile: ASD profile with social preferences
            situation: Type of social situation
            script_type: Specific script to retrieve
            
        Returns:
            SocialScript customized for the learner
        """
        # Get base script
        situation_scripts = self.SOCIAL_SCRIPTS.get(situation, {})
        script = situation_scripts.get(
            script_type,
            self._create_generic_script(situation)
        )
        
        # Customize based on profile
        if profile.communication and not profile.communication.prefers_direct_language:
            # Add more context to steps
            script.steps = [self._add_context(step) for step in script.steps]
        
        # Add practice scenarios
        script.practice_scenarios = self._generate_practice_scenarios(
            script.situation, script.title
        )
        
        return script

    async def get_communication_supports(
        self,
        profile: ASDProfile,
        context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Get communication supports and adaptations.
        
        Args:
            profile: ASD profile with communication preferences
            context: Optional context about the situation
            
        Returns:
            Dictionary of communication supports
        """
        context = context or {}
        supports = {
            "adaptations": [],
            "processing_time": 5,
            "response_format": "verbal",
            "visual_supports": [],
        }
        
        if profile.communication:
            comm_pref = profile.communication
            
            # Set processing time
            supports["processing_time"] = comm_pref.processing_time_needed
            
            # Get style-specific adaptations
            style_adaptations = self.COMMUNICATION_ADAPTATIONS.get(
                comm_pref.preferred_style, []
            )
            supports["adaptations"].extend(style_adaptations)
            
            # Set response format
            supports["response_format"] = comm_pref.preferred_response_format
            
            # Add visual supports if helpful
            if comm_pref.visual_supports_helpful:
                supports["visual_supports"].extend([
                    "Visual schedule",
                    "Picture symbols",
                    "Written keywords",
                ])
            
            # Add concrete examples if needed
            if comm_pref.needs_concrete_examples:
                supports["adaptations"].append(
                    "Provide concrete examples with all instructions"
                )
        
        # Context-specific additions
        if context.get("is_new_situation"):
            supports["adaptations"].append("Preview the situation beforehand")
            supports["adaptations"].append("Provide a social script if helpful")
        
        return supports

    async def prepare_for_social_situation(
        self,
        profile: ASDProfile,
        situation: SocialSituation,
        specific_context: str = "",
    ) -> Dict[str, Any]:
        """
        Prepare a learner for an upcoming social situation.
        
        Args:
            profile: ASD profile
            situation: Type of social situation
            specific_context: Description of the specific situation
            
        Returns:
            Preparation plan with scripts, supports, and coping strategies
        """
        # Get relevant scripts
        scripts = []
        situation_scripts = self.SOCIAL_SCRIPTS.get(situation, {})
        for script in situation_scripts.values():
            scripts.append(script)
        
        # Get comfort level
        comfort_level = profile.social_comfort_levels.get(situation, 0.5)
        
        # Build preparation plan
        preparation = {
            "situation": situation.value,
            "context": specific_context,
            "comfort_level": comfort_level,
            "scripts": [s.title for s in scripts],
            "before_strategies": [],
            "during_strategies": [],
            "after_strategies": [],
            "exit_plan": [],
        }
        
        # Add strategies based on comfort level
        if comfort_level < 0.3:
            preparation["before_strategies"].extend([
                "Practice with a trusted person first",
                "Review social scripts multiple times",
                "Plan a signal for when you need a break",
                "Identify a safe person to go to if overwhelmed",
            ])
            preparation["exit_plan"].extend([
                "Know where the quiet space is",
                "Have a code word or signal for needing to leave",
                "It's okay to take breaks",
            ])
        elif comfort_level < 0.6:
            preparation["before_strategies"].extend([
                "Review what to expect",
                "Practice key phrases",
                "Have a backup plan ready",
            ])
        else:
            preparation["before_strategies"].extend([
                "Quick review of the plan",
                "Check in with how you're feeling",
            ])
        
        # During strategies
        preparation["during_strategies"].extend([
            "Use scripts if helpful",
            "Take breaks if needed",
            "Focus on one person or conversation at a time",
            "Use calming strategies if feeling overwhelmed",
        ])
        
        # After strategies
        preparation["after_strategies"].extend([
            "Celebrate what went well",
            "Note anything to remember for next time",
            "Take time to recharge if needed",
        ])
        
        # Add profile-specific calming strategies
        preparation["calming_strategies"] = profile.calming_strategies
        
        return preparation

    async def interpret_social_cue(
        self,
        profile: ASDProfile,
        cue_description: str,
    ) -> Dict[str, Any]:
        """
        Help interpret a social cue or situation.
        
        Args:
            profile: ASD profile
            cue_description: Description of the social cue to interpret
            
        Returns:
            Interpretation with possible meanings and suggested responses
        """
        # Common social cues and their meanings
        cue_interpretations = {
            "looking at watch": {
                "possible_meanings": [
                    "They may need to leave soon",
                    "They might be checking the time for an appointment",
                    "They could be signaling they're ready to end the conversation",
                ],
                "suggested_responses": [
                    "You can ask 'Do you need to go?'",
                    "You might wrap up what you're saying",
                    "It's okay to say 'I'll let you go'",
                ],
            },
            "crossed arms": {
                "possible_meanings": [
                    "They might be cold",
                    "They could be thinking",
                    "They might feel uncomfortable (but not always)",
                    "It could just be how they like to stand",
                ],
                "suggested_responses": [
                    "Don't assume it means they're upset",
                    "Continue the conversation normally",
                    "You can ask how they're feeling if unsure",
                ],
            },
            "nodding": {
                "possible_meanings": [
                    "They're showing they're listening",
                    "They might agree with what you're saying",
                    "They're encouraging you to continue",
                ],
                "suggested_responses": [
                    "You can continue talking",
                    "You might ask if they have questions",
                ],
            },
        }
        
        # Find matching interpretation
        cue_lower = cue_description.lower()
        interpretation = None
        
        for cue, interp in cue_interpretations.items():
            if cue in cue_lower:
                interpretation = interp
                break
        
        if not interpretation:
            interpretation = {
                "possible_meanings": [
                    "Social cues can have different meanings in different contexts",
                    "It's okay to ask directly if unsure what someone means",
                    "Consider the overall situation when interpreting",
                ],
                "suggested_responses": [
                    "You can ask 'What do you mean?' or 'How are you feeling?'",
                    "Observe other context clues",
                    "It's okay to not be sure",
                ],
            }
        
        return {
            "cue": cue_description,
            **interpretation,
            "general_tip": "When unsure, it's usually okay to ask directly in a polite way",
        }

    def _create_generic_script(self, situation: SocialSituation) -> SocialScript:
        """Create a generic script for unknown situations."""
        return SocialScript(
            situation=situation,
            title=f"General {situation.value.replace('_', ' ').title()} Script",
            steps=[
                "Observe the situation first",
                "Greet others appropriately",
                "Listen and take turns",
                "It's okay to ask questions",
                "Say goodbye when leaving",
            ],
            expected_responses=[
                "Others will likely respond positively",
                "Some people might be more talkative than others",
                "It's normal for interactions to vary",
            ],
        )

    def _add_context(self, step: str) -> str:
        """Add additional context to a step for those who need more detail."""
        context_additions = {
            "Make eye contact": "Make eye contact briefly (or look at their forehead/nose if direct eye contact is uncomfortable)",
            "Wait": "Wait patiently - this shows respect and gives the other person time",
        }
        
        for key, expanded in context_additions.items():
            if key.lower() in step.lower():
                return expanded
        return step

    def _generate_practice_scenarios(
        self,
        situation: SocialSituation,
        script_title: str,
    ) -> List[str]:
        """Generate practice scenarios for a script."""
        scenarios = {
            SocialSituation.ONE_ON_ONE: [
                "Practice with a family member",
                "Practice with a trusted friend",
                "Role-play with a teacher or support person",
            ],
            SocialSituation.SMALL_GROUP: [
                "Start with a group of 2-3 familiar people",
                "Practice in low-stakes situations first",
                "Use video modeling if helpful",
            ],
            SocialSituation.CLASSROOM: [
                "Practice in smaller settings first",
                "Work with teacher to set up practice opportunities",
                "Record yourself practicing if helpful",
            ],
            SocialSituation.ONLINE: [
                "Practice with family or friends first",
                "Do a test run before important meetings",
                "Review the platform's features beforehand",
            ],
        }
        
        return scenarios.get(situation, [
            "Practice in comfortable settings first",
            "Work up to more challenging situations gradually",
        ])
