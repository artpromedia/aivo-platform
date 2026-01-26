"""
Executive Function Strategies Library for ADHD learners.

Provides a comprehensive library of evidence-based strategies for
addressing executive function challenges common in ADHD.
"""

import logging
from typing import Dict, List, Optional

from .models import (
    ADHDProfile,
    EFStrategy,
    ExecutiveFunctionDomain,
    MovementBreak,
    MovementBreakPreference,
    RegulationActivity,
    EnergyLevel,
    generate_id,
)

logger = logging.getLogger(__name__)


class EFStrategyLibrary:
    """
    Library of executive function strategies.

    Contains evidence-based strategies for each executive function domain,
    with support for personalization based on learner profiles.
    """

    # Comprehensive strategy library organized by domain
    STRATEGIES: Dict[ExecutiveFunctionDomain, List[EFStrategy]] = {
        ExecutiveFunctionDomain.ORGANIZATION: [
            EFStrategy(
                strategy_id="org_001",
                domain=ExecutiveFunctionDomain.ORGANIZATION,
                name="Brain Dump",
                description="Get everything out of your head onto paper",
                steps=[
                    "Set timer for 5 minutes",
                    "Write everything on your mind (tasks, worries, ideas)",
                    "Don't organize yet - just dump",
                    "When timer ends, categorize into: Do Today, Do This Week, Someday",
                    "Pick ONE thing from 'Do Today' to start with",
                ],
                tools_needed=["Paper or notes app", "Timer"],
                best_for=["Feeling overwhelmed", "Starting a new week", "Mind won't quiet down"],
                practice_frequency="daily",
            ),
            EFStrategy(
                strategy_id="org_002",
                domain=ExecutiveFunctionDomain.ORGANIZATION,
                name="Everything Has A Home",
                description="Assign a specific place for items you frequently lose",
                steps=[
                    "Identify 3 items you lose most often (keys, phone, homework)",
                    "Choose a specific, visible spot for each",
                    "Put items ONLY in their home - no exceptions",
                    "Practice for 2 weeks until it's automatic",
                ],
                tools_needed=["Small basket or tray", "Labels (optional)"],
                best_for=["Losing things", "Morning chaos", "Homework disappearing"],
                practice_frequency="daily",
            ),
            EFStrategy(
                strategy_id="org_003",
                domain=ExecutiveFunctionDomain.ORGANIZATION,
                name="Sunday Setup",
                description="Weekly preparation routine to reduce weekday friction",
                steps=[
                    "Review calendar for the coming week",
                    "Identify must-do tasks and deadlines",
                    "Prep backpack/materials for Monday",
                    "Choose outfits for at least Monday-Tuesday",
                    "Charge devices and gather school supplies",
                ],
                tools_needed=["Calendar", "Planner or app"],
                best_for=["Weekly planning", "Reducing Monday stress", "Getting ahead"],
                practice_frequency="weekly",
            ),
            EFStrategy(
                strategy_id="org_004",
                domain=ExecutiveFunctionDomain.ORGANIZATION,
                name="One-Touch Rule",
                description="Handle items once instead of putting them down to deal with later",
                steps=[
                    "When you pick something up, deal with it immediately",
                    "Paper: file it, action it, or toss it - don't set it down",
                    "Ask yourself: 'What's the FINAL destination for this?'",
                    "Take 30 extra seconds now to save 10 minutes later",
                ],
                tools_needed=["Trash can nearby", "Filing system or folder"],
                best_for=["Paper piles", "Clutter buildup", "Procrastinating small tasks"],
                practice_frequency="daily",
            ),
        ],
        ExecutiveFunctionDomain.TASK_INITIATION: [
            EFStrategy(
                strategy_id="init_001",
                domain=ExecutiveFunctionDomain.TASK_INITIATION,
                name="2-Minute Start",
                description="Commit to just 2 minutes to overcome initiation barrier",
                steps=[
                    "Tell yourself: 'I only have to do this for 2 minutes'",
                    "Set a timer for 2 minutes",
                    "Start the very first tiny step",
                    "When timer goes off, decide: continue or stop",
                    "Usually you'll continue because starting is the hard part!",
                ],
                tools_needed=["Timer"],
                best_for=["Dreading a task", "Feeling stuck", "Procrastinating"],
                practice_frequency="as_needed",
            ),
            EFStrategy(
                strategy_id="init_002",
                domain=ExecutiveFunctionDomain.TASK_INITIATION,
                name="First Action Clarity",
                description="Define the exact physical action to start",
                steps=[
                    "Look at your task and ask: 'What is the FIRST physical action?'",
                    "Make it super specific (not 'work on essay' but 'open laptop')",
                    "Write down that one tiny action",
                    "Do ONLY that action - don't think about the rest yet",
                    "Then define the next tiny action",
                ],
                tools_needed=["Pen and sticky note"],
                best_for=["Big projects", "Not knowing where to start", "Paralysis"],
                practice_frequency="as_needed",
            ),
            EFStrategy(
                strategy_id="init_003",
                domain=ExecutiveFunctionDomain.TASK_INITIATION,
                name="Body Double Start",
                description="Start tasks with another person present",
                steps=[
                    "Find a study buddy, family member, or virtual coworking session",
                    "Tell them you're going to start a task",
                    "Set up side by side (or on video call)",
                    "Start your task while they do theirs",
                    "The presence of others helps activate focus",
                ],
                tools_needed=["Study buddy or study-with-me video"],
                best_for=["Solitary tasks", "Working alone is hard", "Need accountability"],
                practice_frequency="as_needed",
            ),
            EFStrategy(
                strategy_id="init_004",
                domain=ExecutiveFunctionDomain.TASK_INITIATION,
                name="Temptation Bundling",
                description="Pair dreaded tasks with enjoyable activities",
                steps=[
                    "Identify a task you're avoiding",
                    "Choose something you enjoy (favorite music, snack, location)",
                    "ONLY allow the enjoyable thing during the dreaded task",
                    "Example: Listen to favorite playlist ONLY while doing math",
                    "This creates positive association with the task",
                ],
                tools_needed=["Headphones", "Favorite playlist or podcast"],
                best_for=["Boring tasks", "Repetitive work", "Subjects you dislike"],
                practice_frequency="as_needed",
            ),
        ],
        ExecutiveFunctionDomain.TIME_MANAGEMENT: [
            EFStrategy(
                strategy_id="time_001",
                domain=ExecutiveFunctionDomain.TIME_MANAGEMENT,
                name="Time Blocking with Buffers",
                description="Schedule tasks in blocks with built-in buffer time",
                steps=[
                    "Estimate how long each task will take",
                    "Add 50% buffer time (ADHD time blindness adjustment)",
                    "Block specific times in calendar",
                    "Include 10-min transition time between blocks",
                    "Protect your time blocks like appointments",
                ],
                tools_needed=["Calendar app", "Task list"],
                best_for=["Multiple deadlines", "Underestimating time", "Running late"],
                practice_frequency="daily",
            ),
            EFStrategy(
                strategy_id="time_002",
                domain=ExecutiveFunctionDomain.TIME_MANAGEMENT,
                name="Analog Time Awareness",
                description="Use analog clocks to 'see' time passing",
                steps=[
                    "Get an analog clock for your workspace",
                    "Place it where you can see it while working",
                    "Before starting a task, note where the minute hand is",
                    "Set a checkpoint: 'By 30 minutes, I should be at X point'",
                    "Glance at clock periodically - time is now visible",
                ],
                tools_needed=["Analog clock", "Timer cube (optional)"],
                best_for=["Time blindness", "Losing track of time", "Being late"],
                practice_frequency="daily",
            ),
            EFStrategy(
                strategy_id="time_003",
                domain=ExecutiveFunctionDomain.TIME_MANAGEMENT,
                name="Backward Planning",
                description="Plan backward from deadline to create realistic timeline",
                steps=[
                    "Start with the deadline date/time",
                    "List all steps needed to complete the task",
                    "Working backward, assign each step a date",
                    "Add buffer days for unexpected issues",
                    "Put all dates in your calendar with reminders",
                ],
                tools_needed=["Calendar", "Paper for planning"],
                best_for=["Big projects", "Long-term assignments", "Avoiding last-minute panic"],
                practice_frequency="weekly",
            ),
            EFStrategy(
                strategy_id="time_004",
                domain=ExecutiveFunctionDomain.TIME_MANAGEMENT,
                name="Time Estimation Practice",
                description="Improve time awareness by tracking estimate vs. actual",
                steps=[
                    "Before any task, write down your time estimate",
                    "Set a timer and do the task",
                    "Record actual time taken",
                    "Compare estimate vs. actual - notice the pattern",
                    "Use this data to adjust future estimates (usually add 50%)",
                ],
                tools_needed=["Timer", "Simple log (paper or app)"],
                best_for=["Chronic underestimating", "Building time awareness", "Planning accuracy"],
                practice_frequency="daily",
            ),
        ],
        ExecutiveFunctionDomain.PLANNING: [
            EFStrategy(
                strategy_id="plan_001",
                domain=ExecutiveFunctionDomain.PLANNING,
                name="The Chunking Method",
                description="Break large tasks into bite-sized pieces",
                steps=[
                    "Write down the full project or task",
                    "Ask: 'What's a piece I could do in 20 minutes?'",
                    "Break it into chunks no longer than 25-30 minutes each",
                    "Give each chunk a specific, action-oriented name",
                    "Tackle ONE chunk at a time - don't look at the whole list",
                ],
                tools_needed=["Paper or planning app", "Timer"],
                best_for=["Big assignments", "Feeling overwhelmed", "Not knowing where to start"],
                practice_frequency="as_needed",
            ),
            EFStrategy(
                strategy_id="plan_002",
                domain=ExecutiveFunctionDomain.PLANNING,
                name="If-Then Planning",
                description="Create automatic responses to predictable situations",
                steps=[
                    "Identify a situation that often derails you",
                    "Create an IF-THEN plan: 'IF [situation], THEN I will [specific action]'",
                    "Write it down and review daily",
                    "Example: 'IF I feel distracted, THEN I will take 3 deep breaths'",
                    "Practice until it becomes automatic",
                ],
                tools_needed=["Sticky notes for reminders"],
                best_for=["Predictable distractions", "Bad habits", "Building new routines"],
                practice_frequency="daily",
            ),
            EFStrategy(
                strategy_id="plan_003",
                domain=ExecutiveFunctionDomain.PLANNING,
                name="Priority Matrix",
                description="Sort tasks by urgency and importance",
                steps=[
                    "Draw a 2x2 grid: Urgent/Not Urgent across top, Important/Not Important down side",
                    "Place each task in the appropriate box",
                    "Do Urgent+Important first",
                    "Schedule time for Not Urgent+Important (these get forgotten!)",
                    "Delegate or drop Not Important tasks",
                ],
                tools_needed=["Paper or whiteboard", "Sticky notes (optional)"],
                best_for=["Too many tasks", "Not knowing what to prioritize", "Busy but not productive"],
                practice_frequency="daily",
            ),
        ],
        ExecutiveFunctionDomain.WORKING_MEMORY: [
            EFStrategy(
                strategy_id="wm_001",
                domain=ExecutiveFunctionDomain.WORKING_MEMORY,
                name="External Brain",
                description="Offload information to external systems immediately",
                steps=[
                    "Choose ONE capture tool (phone notes, small notebook)",
                    "ALWAYS have it with you",
                    "Write down ANY thought, task, or idea immediately",
                    "Review and process your external brain daily",
                    "Don't trust your memory - trust your system",
                ],
                tools_needed=["Pocket notebook or phone notes app"],
                best_for=["Forgetting ideas", "Missing tasks", "Losing information"],
                practice_frequency="daily",
            ),
            EFStrategy(
                strategy_id="wm_002",
                domain=ExecutiveFunctionDomain.WORKING_MEMORY,
                name="Verbal Processing",
                description="Say things out loud to strengthen memory",
                steps=[
                    "When you need to remember something, say it out loud",
                    "Repeat important information 3 times",
                    "Explain concepts to yourself as if teaching someone",
                    "Record voice memos for important thoughts",
                    "Talk through your task list at the start of each day",
                ],
                tools_needed=["Voice recorder (phone works)"],
                best_for=["Forgetting instructions", "Studying", "Processing complex info"],
                practice_frequency="as_needed",
            ),
            EFStrategy(
                strategy_id="wm_003",
                domain=ExecutiveFunctionDomain.WORKING_MEMORY,
                name="Visual Cues",
                description="Use visual reminders in your environment",
                steps=[
                    "Put important items/reminders in your direct path",
                    "Use bright sticky notes for must-dos",
                    "Set items you need by the door",
                    "Use a whiteboard for daily priorities",
                    "If you can't see it, you'll forget it - make it visible",
                ],
                tools_needed=["Sticky notes", "Whiteboard", "Hooks by door"],
                best_for=["Forgetting to bring things", "Missing deadlines", "Out of sight = out of mind"],
                practice_frequency="daily",
            ),
        ],
        ExecutiveFunctionDomain.METACOGNITION: [
            EFStrategy(
                strategy_id="meta_001",
                domain=ExecutiveFunctionDomain.METACOGNITION,
                name="Check-In Questions",
                description="Regular self-monitoring during tasks",
                steps=[
                    "Set timer for every 10-15 minutes",
                    "When it goes off, ask: 'Am I still on task?'",
                    "Ask: 'Is this the best use of my time right now?'",
                    "Ask: 'Do I need a break or a change?'",
                    "Adjust your approach based on answers",
                ],
                tools_needed=["Timer", "Check-in prompt list"],
                best_for=["Going off track", "Rabbit holes", "Losing focus"],
                practice_frequency="daily",
            ),
            EFStrategy(
                strategy_id="meta_002",
                domain=ExecutiveFunctionDomain.METACOGNITION,
                name="Daily Review",
                description="End-of-day reflection to build self-awareness",
                steps=[
                    "At day's end, take 5 minutes to review",
                    "What worked well today? Do more of that.",
                    "What didn't work? What got in the way?",
                    "What will I do differently tomorrow?",
                    "Celebrate progress, learn from struggles",
                ],
                tools_needed=["Journal or notes app"],
                best_for=["Building self-awareness", "Learning what works for you", "Continuous improvement"],
                practice_frequency="daily",
            ),
        ],
        ExecutiveFunctionDomain.EMOTIONAL_CONTROL: [
            EFStrategy(
                strategy_id="emo_001",
                domain=ExecutiveFunctionDomain.EMOTIONAL_CONTROL,
                name="STOP Technique",
                description="Pause before reacting to strong emotions",
                steps=[
                    "S - Stop what you're doing",
                    "T - Take a breath (one deep breath)",
                    "O - Observe what you're feeling without judgment",
                    "P - Proceed with awareness",
                    "Practice this before responding to anything upsetting",
                ],
                tools_needed=["None - it's all internal"],
                best_for=["Frustration", "Anger", "Impulsive reactions"],
                practice_frequency="as_needed",
            ),
            EFStrategy(
                strategy_id="emo_002",
                domain=ExecutiveFunctionDomain.EMOTIONAL_CONTROL,
                name="Emotion Labeling",
                description="Name emotions to reduce their intensity",
                steps=[
                    "Notice when you're feeling a strong emotion",
                    "Try to name it specifically (frustrated, anxious, overwhelmed)",
                    "Say to yourself: 'I'm feeling [emotion] right now'",
                    "Naming it creates distance and reduces intensity",
                    "Then ask: 'What do I need right now?'",
                ],
                tools_needed=["Feelings chart (optional)"],
                best_for=["Emotional overwhelm", "Meltdowns", "Anxiety spikes"],
                practice_frequency="as_needed",
            ),
            EFStrategy(
                strategy_id="emo_003",
                domain=ExecutiveFunctionDomain.EMOTIONAL_CONTROL,
                name="5-4-3-2-1 Grounding",
                description="Use senses to ground yourself when overwhelmed",
                steps=[
                    "Name 5 things you can SEE",
                    "Name 4 things you can TOUCH",
                    "Name 3 things you can HEAR",
                    "Name 2 things you can SMELL",
                    "Name 1 thing you can TASTE",
                ],
                tools_needed=["None"],
                best_for=["Anxiety", "Panic", "Feeling disconnected", "Racing thoughts"],
                practice_frequency="as_needed",
            ),
        ],
        ExecutiveFunctionDomain.FLEXIBILITY: [
            EFStrategy(
                strategy_id="flex_001",
                domain=ExecutiveFunctionDomain.FLEXIBILITY,
                name="Plan B Thinking",
                description="Always have a backup plan ready",
                steps=[
                    "Before starting any plan, ask: 'What could go wrong?'",
                    "For each possibility, create a backup plan",
                    "Write down your Plan B (and maybe Plan C)",
                    "When things change, you already have alternatives",
                    "This reduces anxiety about unexpected changes",
                ],
                tools_needed=["Planning sheet with backup columns"],
                best_for=["Rigidity", "Meltdowns when plans change", "Anxiety about uncertainty"],
                practice_frequency="as_needed",
            ),
            EFStrategy(
                strategy_id="flex_002",
                domain=ExecutiveFunctionDomain.FLEXIBILITY,
                name="Transition Warnings",
                description="Give yourself advance notice before transitions",
                steps=[
                    "Set a timer for 10 minutes before you need to switch tasks",
                    "Use the warning to mentally prepare for the change",
                    "Start wrapping up your current task",
                    "Set another timer for 5 minutes as final warning",
                    "Transition becomes expected, not jarring",
                ],
                tools_needed=["Timer or phone alarm"],
                best_for=["Difficulty switching tasks", "Getting stuck", "Transition meltdowns"],
                practice_frequency="daily",
            ),
        ],
        ExecutiveFunctionDomain.SUSTAINED_ATTENTION: [
            EFStrategy(
                strategy_id="att_001",
                domain=ExecutiveFunctionDomain.SUSTAINED_ATTENTION,
                name="Pomodoro Technique",
                description="Work in focused bursts with scheduled breaks",
                steps=[
                    "Set timer for 25 minutes (or your optimal focus time)",
                    "Work on ONE task only until timer ends",
                    "Take a 5-minute break - step away from work",
                    "After 4 pomodoros, take a 15-30 minute break",
                    "Repeat cycle throughout the day",
                ],
                tools_needed=["Timer", "Task list"],
                best_for=["Sustaining focus", "Long tasks", "Avoiding burnout"],
                practice_frequency="daily",
            ),
            EFStrategy(
                strategy_id="att_002",
                domain=ExecutiveFunctionDomain.SUSTAINED_ATTENTION,
                name="Environment Design",
                description="Set up your space to support focus",
                steps=[
                    "Remove all distractions from your workspace",
                    "Phone: in another room or in a drawer (not just flipped over)",
                    "Close unnecessary browser tabs and apps",
                    "Have everything you need within reach",
                    "Use noise-canceling headphones or white noise if helpful",
                ],
                tools_needed=["Headphones", "Phone dock (in another room)", "Do not disturb sign"],
                best_for=["External distractions", "Getting pulled away", "Noisy environment"],
                practice_frequency="daily",
            ),
            EFStrategy(
                strategy_id="att_003",
                domain=ExecutiveFunctionDomain.SUSTAINED_ATTENTION,
                name="Interest Bridge",
                description="Connect boring tasks to personal interests",
                steps=[
                    "Identify what you find boring about the task",
                    "Find ANY connection to something you care about",
                    "Make it a game, challenge, or competition with yourself",
                    "Create artificial stakes or rewards",
                    "Example: Time yourself and try to beat your record",
                ],
                tools_needed=["Timer for challenges", "Reward system"],
                best_for=["Boring subjects", "Repetitive tasks", "Low-interest material"],
                practice_frequency="as_needed",
            ),
        ],
        ExecutiveFunctionDomain.IMPULSE_CONTROL: [
            EFStrategy(
                strategy_id="imp_001",
                domain=ExecutiveFunctionDomain.IMPULSE_CONTROL,
                name="Delay and Distract",
                description="Create space between impulse and action",
                steps=[
                    "When you feel an urge, tell yourself: 'I'll wait 10 minutes'",
                    "Set a timer for 10 minutes",
                    "Do something else during that time (walk, drink water)",
                    "After 10 minutes, decide if you still want to act on the impulse",
                    "Often the urge will have passed",
                ],
                tools_needed=["Timer"],
                best_for=["Impulsive buying", "Interrupting", "Blurting out"],
                practice_frequency="as_needed",
            ),
            EFStrategy(
                strategy_id="imp_002",
                domain=ExecutiveFunctionDomain.IMPULSE_CONTROL,
                name="Parking Lot",
                description="Capture distracting thoughts without acting on them",
                steps=[
                    "Keep a 'parking lot' notepad next to your work",
                    "When a distracting thought pops up, write it down",
                    "Tell yourself: 'I've captured it, I can come back to it'",
                    "Return to your work immediately",
                    "Review parking lot during breaks",
                ],
                tools_needed=["Notepad or sticky note"],
                best_for=["Random thoughts during work", "Wanting to research tangents", "Internal distractions"],
                practice_frequency="daily",
            ),
        ],
    }

    # Movement break library
    MOVEMENT_BREAKS: List[MovementBreak] = [
        MovementBreak(
            break_id="mb_001",
            name="Quick Cardio Burst",
            category=MovementBreakPreference.ACTIVE,
            duration_minutes=3,
            instructions=[
                "10 jumping jacks",
                "10 high knees",
                "10 squats",
                "10 arm circles",
            ],
            energy_level=EnergyLevel.HIGH,
            indoor_friendly=True,
            quiet_option=False,
        ),
        MovementBreak(
            break_id="mb_002",
            name="Desk Stretches",
            category=MovementBreakPreference.STRETCHING,
            duration_minutes=5,
            instructions=[
                "Neck rolls - 5 each direction",
                "Shoulder shrugs - hold 5 seconds, release",
                "Seated spinal twist - hold 15 seconds each side",
                "Wrist circles and stretches",
                "Stand and touch toes - hold 10 seconds",
            ],
            energy_level=EnergyLevel.LOW,
            indoor_friendly=True,
            quiet_option=True,
        ),
        MovementBreak(
            break_id="mb_003",
            name="Brain Break Walk",
            category=MovementBreakPreference.WALK,
            duration_minutes=5,
            instructions=[
                "Stand up and walk to another room",
                "Get a glass of water",
                "Look out a window for 30 seconds",
                "Walk back slowly, breathing deeply",
            ],
            energy_level=EnergyLevel.LOW,
            indoor_friendly=True,
            quiet_option=True,
        ),
        MovementBreak(
            break_id="mb_004",
            name="Dance Break",
            category=MovementBreakPreference.ACTIVE,
            duration_minutes=3,
            instructions=[
                "Put on your favorite upbeat song",
                "Dance however you want - no rules!",
                "Move your whole body",
                "End with 3 deep breaths",
            ],
            energy_level=EnergyLevel.HIGH,
            indoor_friendly=True,
            quiet_option=False,
        ),
        MovementBreak(
            break_id="mb_005",
            name="Quiet Fidget Reset",
            category=MovementBreakPreference.FIDGET,
            duration_minutes=3,
            instructions=[
                "Use fidget toy or squeeze stress ball",
                "Do hand exercises - make fists, spread fingers",
                "Wiggle toes and roll ankles",
                "Shrug shoulders and release",
            ],
            energy_level=EnergyLevel.LOW,
            indoor_friendly=True,
            quiet_option=True,
        ),
        MovementBreak(
            break_id="mb_006",
            name="Yoga Flow",
            category=MovementBreakPreference.STRETCHING,
            duration_minutes=5,
            instructions=[
                "Cat-cow pose - 5 rounds",
                "Downward dog - hold 5 breaths",
                "Child's pose - hold 5 breaths",
                "Seated forward fold",
                "End in comfortable seat with 3 deep breaths",
            ],
            energy_level=EnergyLevel.MEDIUM,
            indoor_friendly=True,
            quiet_option=True,
        ),
    ]

    # Regulation activities library
    REGULATION_ACTIVITIES: List[RegulationActivity] = [
        RegulationActivity(
            activity_id="reg_001",
            name="Box Breathing",
            description="Calm your nervous system with patterned breathing",
            when_to_use=["Anxiety", "Overwhelm", "Before tests", "Trouble focusing"],
            steps=[
                "Breathe in for 4 counts",
                "Hold for 4 counts",
                "Breathe out for 4 counts",
                "Hold for 4 counts",
                "Repeat 4-6 times",
            ],
            duration_minutes=3,
            calming_level=5,
        ),
        RegulationActivity(
            activity_id="reg_002",
            name="Progressive Muscle Relaxation",
            description="Release tension by tensing and relaxing muscle groups",
            when_to_use=["Physical tension", "Restlessness", "Before bed", "Stress"],
            steps=[
                "Start with your toes - squeeze tight for 5 seconds",
                "Release and notice the difference",
                "Move to calves, thighs, stomach, hands, arms, shoulders",
                "End with facial muscles - scrunch face, then release",
                "Take 3 deep breaths to finish",
            ],
            duration_minutes=5,
            calming_level=5,
        ),
        RegulationActivity(
            activity_id="reg_003",
            name="Cold Water Reset",
            description="Use cold water to activate calming response",
            when_to_use=["Intense emotions", "Anger", "Panic", "Emotional overwhelm"],
            steps=[
                "Go to a sink or get a cold water bottle",
                "Splash cold water on face or hold cold bottle to wrists",
                "Take 3 deep breaths while the cold sensation registers",
                "Pat dry and notice how your body feels calmer",
            ],
            duration_minutes=2,
            calming_level=4,
        ),
        RegulationActivity(
            activity_id="reg_004",
            name="Energizing Shake-Out",
            description="Release stagnant energy through movement",
            when_to_use=["Sluggish", "Low energy", "Stuck", "Need to wake up"],
            steps=[
                "Stand up and shake your hands vigorously",
                "Add shaking your arms",
                "Shake your legs one at a time",
                "Bounce up and down gently",
                "End with 3 big breaths, reaching arms up and lowering",
            ],
            duration_minutes=2,
            calming_level=1,  # Energizing, not calming
        ),
        RegulationActivity(
            activity_id="reg_005",
            name="Butterfly Hug",
            description="Self-soothing technique using bilateral stimulation",
            when_to_use=["Anxiety", "Sadness", "Needing comfort", "Feeling alone"],
            steps=[
                "Cross your arms over your chest, hands on shoulders",
                "Alternately tap your shoulders left-right",
                "Tap at a slow, steady rhythm",
                "Continue for 1-2 minutes while breathing slowly",
                "Notice your body calming down",
            ],
            duration_minutes=3,
            calming_level=4,
        ),
    ]

    def get_strategies_for_domain(
        self,
        domain: ExecutiveFunctionDomain,
    ) -> List[EFStrategy]:
        """
        Get all strategies for a specific EF domain.

        Args:
            domain: The executive function domain

        Returns:
            List of strategies for that domain
        """
        return self.STRATEGIES.get(domain, [])

    def get_personalized_strategies(
        self,
        profile: ADHDProfile,
        current_challenge: str,
        max_strategies: int = 5,
    ) -> List[EFStrategy]:
        """
        Get strategies personalized to learner's profile and current challenge.

        Args:
            profile: Learner's ADHD profile
            current_challenge: Description of the current challenge
            max_strategies: Maximum number of strategies to return

        Returns:
            List of personalized strategies, ranked by relevance
        """
        relevant_strategies = []
        challenge_lower = current_challenge.lower()

        # First, get strategies for learner's primary challenges
        for domain in profile.primary_ef_challenges:
            domain_strategies = self.get_strategies_for_domain(domain)

            for strategy in domain_strategies:
                # Calculate relevance score
                relevance_score = 0

                # Check if strategy's "best_for" matches current challenge
                for use_case in strategy.best_for:
                    if any(
                        word in challenge_lower
                        for word in use_case.lower().split()
                    ):
                        relevance_score += 10

                # Strategies for primary challenges get a boost
                if domain in profile.primary_ef_challenges:
                    relevance_score += 5

                # Add strategy with its score
                if relevance_score > 0 or domain in profile.primary_ef_challenges:
                    relevant_strategies.append((strategy, relevance_score))

        # Also check all domains for keyword matches if we don't have enough
        if len(relevant_strategies) < max_strategies:
            for domain, strategies in self.STRATEGIES.items():
                if domain in profile.primary_ef_challenges:
                    continue  # Already processed

                for strategy in strategies:
                    for use_case in strategy.best_for:
                        if any(
                            word in challenge_lower
                            for word in use_case.lower().split()
                        ):
                            relevant_strategies.append((strategy, 5))
                            break

        # Sort by relevance and return top strategies
        relevant_strategies.sort(key=lambda x: x[1], reverse=True)

        # Remove duplicates while preserving order
        seen_ids = set()
        unique_strategies = []
        for strategy, _ in relevant_strategies:
            if strategy.strategy_id not in seen_ids:
                seen_ids.add(strategy.strategy_id)
                unique_strategies.append(strategy)

        return unique_strategies[:max_strategies]

    def get_strategy_by_id(self, strategy_id: str) -> Optional[EFStrategy]:
        """Get a specific strategy by its ID."""
        for strategies in self.STRATEGIES.values():
            for strategy in strategies:
                if strategy.strategy_id == strategy_id:
                    return strategy
        return None

    def get_all_strategies(self) -> List[EFStrategy]:
        """Get all strategies in the library."""
        all_strategies = []
        for strategies in self.STRATEGIES.values():
            all_strategies.extend(strategies)
        return all_strategies

    def get_movement_breaks(
        self,
        preference: Optional[MovementBreakPreference] = None,
        quiet_only: bool = False,
        max_duration: Optional[int] = None,
    ) -> List[MovementBreak]:
        """
        Get movement breaks filtered by criteria.

        Args:
            preference: Filter by movement preference
            quiet_only: Only return quiet-friendly breaks
            max_duration: Maximum duration in minutes

        Returns:
            List of matching movement breaks
        """
        breaks = self.MOVEMENT_BREAKS

        if preference:
            breaks = [b for b in breaks if b.category == preference]

        if quiet_only:
            breaks = [b for b in breaks if b.quiet_option]

        if max_duration:
            breaks = [b for b in breaks if b.duration_minutes <= max_duration]

        return breaks

    def get_regulation_activities(
        self,
        emotional_state: Optional[str] = None,
        max_duration: Optional[int] = None,
        calming_level_min: Optional[int] = None,
    ) -> List[RegulationActivity]:
        """
        Get regulation activities filtered by criteria.

        Args:
            emotional_state: Filter by what emotion to regulate
            max_duration: Maximum duration in minutes
            calming_level_min: Minimum calming level (1-5)

        Returns:
            List of matching regulation activities
        """
        activities = self.REGULATION_ACTIVITIES

        if emotional_state:
            state_lower = emotional_state.lower()
            activities = [
                a
                for a in activities
                if any(state_lower in when.lower() for when in a.when_to_use)
            ]

        if max_duration:
            activities = [a for a in activities if a.duration_minutes <= max_duration]

        if calming_level_min:
            activities = [a for a in activities if a.calming_level >= calming_level_min]

        return activities

    def get_quick_strategy(
        self,
        domain: ExecutiveFunctionDomain,
    ) -> Optional[EFStrategy]:
        """
        Get a quick strategy for immediate use.

        Returns the first strategy for the domain that can be used 'as_needed'.
        """
        strategies = self.get_strategies_for_domain(domain)

        for strategy in strategies:
            if strategy.practice_frequency == "as_needed":
                return strategy

        # If no as_needed strategy, return the first one
        return strategies[0] if strategies else None
