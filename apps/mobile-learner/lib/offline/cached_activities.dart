/// Cached Activities - ND-3.2
///
/// Built-in regulation activities that work completely offline.
/// These activities are embedded in the app and require no network access.

enum ActivityCategory {
  breathing,
  grounding,
  movement,
  sensory,
  sounds,
  visualization,
  counting,
  progressive,
}

enum ActivityDifficulty {
  beginner,
  intermediate,
  advanced,
}

enum AgeGroup {
  preschool,     // 3-5
  elementary,    // 6-10
  middleSchool,  // 11-13
  highSchool,    // 14-18
  all,
}

class CachedActivity {
  final String id;
  final String name;
  final String description;
  final ActivityCategory category;
  final ActivityDifficulty difficulty;
  final List<AgeGroup> ageGroups;
  final int durationSeconds;
  final List<ActivityStep> steps;
  final String? iconAsset;
  final List<String> tags;
  final bool requiresAudio;
  final bool requiresVisual;
  final String? audioAssetId;
  final String? visualAssetId;
  final Map<String, dynamic>? customData;

  const CachedActivity({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    this.difficulty = ActivityDifficulty.beginner,
    this.ageGroups = const [AgeGroup.all],
    required this.durationSeconds,
    required this.steps,
    this.iconAsset,
    this.tags = const [],
    this.requiresAudio = false,
    this.requiresVisual = false,
    this.audioAssetId,
    this.visualAssetId,
    this.customData,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'category': category.name,
    'difficulty': difficulty.name,
    'ageGroups': ageGroups.map((a) => a.name).toList(),
    'durationSeconds': durationSeconds,
    'steps': steps.map((s) => s.toJson()).toList(),
    'iconAsset': iconAsset,
    'tags': tags,
    'requiresAudio': requiresAudio,
    'requiresVisual': requiresVisual,
    'audioAssetId': audioAssetId,
    'visualAssetId': visualAssetId,
    'customData': customData,
  };

  factory CachedActivity.fromJson(Map<String, dynamic> json) => CachedActivity(
    id: json['id'] as String,
    name: json['name'] as String,
    description: json['description'] as String,
    category: ActivityCategory.values.firstWhere(
      (c) => c.name == json['category'],
      orElse: () => ActivityCategory.breathing,
    ),
    difficulty: ActivityDifficulty.values.firstWhere(
      (d) => d.name == json['difficulty'],
      orElse: () => ActivityDifficulty.beginner,
    ),
    ageGroups: (json['ageGroups'] as List?)
        ?.map((a) => AgeGroup.values.firstWhere(
              (ag) => ag.name == a,
              orElse: () => AgeGroup.all,
            ))
        .toList() ?? [AgeGroup.all],
    durationSeconds: json['durationSeconds'] as int,
    steps: (json['steps'] as List?)
        ?.map((s) => ActivityStep.fromJson(s))
        .toList() ?? [],
    iconAsset: json['iconAsset'] as String?,
    tags: (json['tags'] as List?)?.cast<String>() ?? [],
    requiresAudio: json['requiresAudio'] as bool? ?? false,
    requiresVisual: json['requiresVisual'] as bool? ?? false,
    audioAssetId: json['audioAssetId'] as String?,
    visualAssetId: json['visualAssetId'] as String?,
    customData: json['customData'] as Map<String, dynamic>?,
  );
}

class ActivityStep {
  final int stepNumber;
  final String instruction;
  final int durationSeconds;
  final String? visualCue;
  final String? audioFileName;
  final bool isTransition;
  final Map<String, dynamic>? animationData;

  const ActivityStep({
    required this.stepNumber,
    required this.instruction,
    required this.durationSeconds,
    this.visualCue,
    this.audioFileName,
    this.isTransition = false,
    this.animationData,
  });

  Map<String, dynamic> toJson() => {
    'stepNumber': stepNumber,
    'instruction': instruction,
    'durationSeconds': durationSeconds,
    'visualCue': visualCue,
    'audioFileName': audioFileName,
    'isTransition': isTransition,
    'animationData': animationData,
  };

  factory ActivityStep.fromJson(Map<String, dynamic> json) => ActivityStep(
    stepNumber: json['stepNumber'] as int,
    instruction: json['instruction'] as String,
    durationSeconds: json['durationSeconds'] as int,
    visualCue: json['visualCue'] as String?,
    audioFileName: json['audioFileName'] as String?,
    isTransition: json['isTransition'] as bool? ?? false,
    animationData: json['animationData'] as Map<String, dynamic>?,
  );
}

/// Built-in breathing exercises
class BreathingExercises {
  static const boxBreathing = CachedActivity(
    id: 'breathing_box',
    name: 'Box Breathing',
    description: 'Breathe in a square pattern: inhale, hold, exhale, hold. Great for calming anxiety.',
    category: ActivityCategory.breathing,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 120,
    iconAsset: 'assets/icons/box_breathing.png',
    tags: ['anxiety', 'calm', 'focus'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Breathe IN slowly', durationSeconds: 4, visualCue: 'arrow_up'),
      ActivityStep(stepNumber: 2, instruction: 'HOLD your breath', durationSeconds: 4, visualCue: 'pause'),
      ActivityStep(stepNumber: 3, instruction: 'Breathe OUT slowly', durationSeconds: 4, visualCue: 'arrow_down'),
      ActivityStep(stepNumber: 4, instruction: 'HOLD empty', durationSeconds: 4, visualCue: 'pause'),
    ],
    customData: {
      'inhaleSeconds': 4,
      'holdInSeconds': 4,
      'exhaleSeconds': 4,
      'holdOutSeconds': 4,
      'cycles': 6,
      'shape': 'square',
    },
  );

  static const fourSevenEight = CachedActivity(
    id: 'breathing_478',
    name: '4-7-8 Breathing',
    description: 'A relaxing breath pattern that helps you fall asleep or reduce stress.',
    category: ActivityCategory.breathing,
    difficulty: ActivityDifficulty.intermediate,
    ageGroups: [AgeGroup.elementary, AgeGroup.middleSchool, AgeGroup.highSchool],
    durationSeconds: 60,
    iconAsset: 'assets/icons/478_breathing.png',
    tags: ['sleep', 'relax', 'stress'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Breathe IN through your nose', durationSeconds: 4, visualCue: 'nose_inhale'),
      ActivityStep(stepNumber: 2, instruction: 'HOLD your breath', durationSeconds: 7, visualCue: 'pause'),
      ActivityStep(stepNumber: 3, instruction: 'Breathe OUT through your mouth', durationSeconds: 8, visualCue: 'mouth_exhale'),
    ],
    customData: {
      'inhaleSeconds': 4,
      'holdSeconds': 7,
      'exhaleSeconds': 8,
      'cycles': 4,
    },
  );

  static const bunnyBreathing = CachedActivity(
    id: 'breathing_bunny',
    name: 'Bunny Breathing',
    description: 'Take quick sniffs like a bunny, then slowly breathe out. Fun for younger kids!',
    category: ActivityCategory.breathing,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.preschool, AgeGroup.elementary],
    durationSeconds: 60,
    iconAsset: 'assets/icons/bunny_breathing.png',
    tags: ['fun', 'kids', 'playful'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Take 3 quick sniffs like a bunny! 🐰', durationSeconds: 3, visualCue: 'bunny_sniff'),
      ActivityStep(stepNumber: 2, instruction: 'Now slowly blow out like a balloon deflating', durationSeconds: 5, visualCue: 'balloon'),
    ],
    customData: {
      'sniffCount': 3,
      'sniffDuration': 1,
      'exhaleDuration': 5,
      'cycles': 6,
      'character': 'bunny',
    },
  );

  static const starBreathing = CachedActivity(
    id: 'breathing_star',
    name: 'Star Breathing',
    description: 'Trace a star shape while breathing. Great for visual learners!',
    category: ActivityCategory.breathing,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.preschool, AgeGroup.elementary],
    durationSeconds: 90,
    iconAsset: 'assets/icons/star_breathing.png',
    tags: ['visual', 'kids', 'trace'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Breathe IN as you trace up', durationSeconds: 3, visualCue: 'star_up'),
      ActivityStep(stepNumber: 2, instruction: 'Breathe OUT as you trace down', durationSeconds: 3, visualCue: 'star_down'),
    ],
    customData: {
      'points': 5,
      'breathPerPoint': 6,
      'shape': 'star',
    },
  );

  static const bellBreathing = CachedActivity(
    id: 'breathing_bell',
    name: 'Bell Breathing',
    description: 'Listen to the bell and breathe along with the sound.',
    category: ActivityCategory.breathing,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 90,
    iconAsset: 'assets/icons/bell_breathing.png',
    tags: ['mindfulness', 'audio', 'focus'],
    requiresAudio: true,
    audioAssetId: 'bell_tone',
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Listen to the bell...', durationSeconds: 3, audioFileName: 'bell.mp3'),
      ActivityStep(stepNumber: 2, instruction: 'Breathe IN as the sound fades', durationSeconds: 4, visualCue: 'expand'),
      ActivityStep(stepNumber: 3, instruction: 'Breathe OUT slowly', durationSeconds: 4, visualCue: 'contract'),
    ],
    customData: {
      'bellInterval': 11,
      'cycles': 8,
    },
  );

  static List<CachedActivity> all = [
    boxBreathing,
    fourSevenEight,
    bunnyBreathing,
    starBreathing,
    bellBreathing,
  ];
}

/// Built-in grounding exercises (5-4-3-2-1 and variations)
class GroundingExercises {
  static const fiveToOne = CachedActivity(
    id: 'grounding_54321',
    name: '5-4-3-2-1 Grounding',
    description: 'Use your senses to feel present: 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.',
    category: ActivityCategory.grounding,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 180,
    iconAsset: 'assets/icons/grounding_54321.png',
    tags: ['anxiety', 'senses', 'present'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Look around. Name 5 things you can SEE 👀', durationSeconds: 30, visualCue: 'eye'),
      ActivityStep(stepNumber: 2, instruction: 'Touch something. Name 4 things you can FEEL ✋', durationSeconds: 30, visualCue: 'hand'),
      ActivityStep(stepNumber: 3, instruction: 'Listen carefully. Name 3 things you can HEAR 👂', durationSeconds: 30, visualCue: 'ear'),
      ActivityStep(stepNumber: 4, instruction: 'Sniff the air. Name 2 things you can SMELL 👃', durationSeconds: 30, visualCue: 'nose'),
      ActivityStep(stepNumber: 5, instruction: 'Notice your mouth. Name 1 thing you can TASTE 👅', durationSeconds: 30, visualCue: 'tongue'),
    ],
    customData: {
      'senses': ['see', 'feel', 'hear', 'smell', 'taste'],
      'counts': [5, 4, 3, 2, 1],
    },
  );

  static const bodyAwareness = CachedActivity(
    id: 'grounding_body',
    name: 'Body Awareness',
    description: 'Focus on how each part of your body feels, from feet to head.',
    category: ActivityCategory.grounding,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 120,
    iconAsset: 'assets/icons/body_scan.png',
    tags: ['body', 'awareness', 'calm'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Feel your FEET on the ground', durationSeconds: 15, visualCue: 'feet'),
      ActivityStep(stepNumber: 2, instruction: 'Notice your LEGS - are they relaxed?', durationSeconds: 15, visualCue: 'legs'),
      ActivityStep(stepNumber: 3, instruction: 'Feel your BELLY rise and fall', durationSeconds: 15, visualCue: 'belly'),
      ActivityStep(stepNumber: 4, instruction: 'Relax your SHOULDERS - drop them down', durationSeconds: 15, visualCue: 'shoulders'),
      ActivityStep(stepNumber: 5, instruction: 'Soften your FACE - unclench your jaw', durationSeconds: 15, visualCue: 'face'),
      ActivityStep(stepNumber: 6, instruction: 'Notice the top of your HEAD', durationSeconds: 15, visualCue: 'head'),
    ],
    customData: {
      'bodyParts': ['feet', 'legs', 'belly', 'shoulders', 'face', 'head'],
    },
  );

  static const rootsGrowing = CachedActivity(
    id: 'grounding_roots',
    name: 'Growing Roots',
    description: 'Imagine roots growing from your feet into the ground, keeping you safe and steady.',
    category: ActivityCategory.grounding,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.preschool, AgeGroup.elementary, AgeGroup.middleSchool],
    durationSeconds: 90,
    iconAsset: 'assets/icons/tree_roots.png',
    tags: ['imagination', 'stability', 'calm'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Stand or sit with your feet flat on the ground', durationSeconds: 10, visualCue: 'feet_flat'),
      ActivityStep(stepNumber: 2, instruction: 'Imagine roots growing from your feet into the earth 🌱', durationSeconds: 20, visualCue: 'roots_growing'),
      ActivityStep(stepNumber: 3, instruction: 'Feel the roots going deeper and deeper', durationSeconds: 20, visualCue: 'deep_roots'),
      ActivityStep(stepNumber: 4, instruction: 'You are like a strong tree that cannot be moved 🌳', durationSeconds: 20, visualCue: 'tree'),
      ActivityStep(stepNumber: 5, instruction: 'Take a deep breath. You are safe and grounded.', durationSeconds: 10, visualCue: 'safe'),
    ],
    customData: {
      'visualization': 'tree',
      'elements': ['roots', 'earth', 'tree', 'strength'],
    },
  );

  static List<CachedActivity> all = [
    fiveToOne,
    bodyAwareness,
    rootsGrowing,
  ];
}

/// Built-in movement exercises
class MovementExercises {
  static const shakeItOff = CachedActivity(
    id: 'movement_shake',
    name: 'Shake It Off',
    description: 'Shake your hands, arms, legs, and whole body to release tension!',
    category: ActivityCategory.movement,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 60,
    iconAsset: 'assets/icons/shake.png',
    tags: ['energy', 'release', 'fun'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Shake your HANDS really fast! 👐', durationSeconds: 10, visualCue: 'hands'),
      ActivityStep(stepNumber: 2, instruction: 'Shake your ARMS like noodles! 💪', durationSeconds: 10, visualCue: 'arms'),
      ActivityStep(stepNumber: 3, instruction: 'Shake your LEGS! One at a time 🦵', durationSeconds: 10, visualCue: 'legs'),
      ActivityStep(stepNumber: 4, instruction: 'Shake your WHOLE BODY! 🕺', durationSeconds: 15, visualCue: 'body'),
      ActivityStep(stepNumber: 5, instruction: 'Stop. Feel the calm. Stand still.', durationSeconds: 15, visualCue: 'still'),
    ],
    customData: {
      'intensity': 'high',
      'movement': 'shake',
    },
  );

  static const slowStretch = CachedActivity(
    id: 'movement_stretch',
    name: 'Slow Stretch',
    description: 'Gentle stretches to release tension and feel calm.',
    category: ActivityCategory.movement,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 120,
    iconAsset: 'assets/icons/stretch.png',
    tags: ['calm', 'gentle', 'tension'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Reach UP to the sky with both arms ⬆️', durationSeconds: 15, visualCue: 'reach_up'),
      ActivityStep(stepNumber: 2, instruction: 'Slowly bend to the LEFT ⬅️', durationSeconds: 15, visualCue: 'bend_left'),
      ActivityStep(stepNumber: 3, instruction: 'Slowly bend to the RIGHT ➡️', durationSeconds: 15, visualCue: 'bend_right'),
      ActivityStep(stepNumber: 4, instruction: 'Roll your shoulders back 🔄', durationSeconds: 15, visualCue: 'shoulders'),
      ActivityStep(stepNumber: 5, instruction: 'Gently turn your head side to side', durationSeconds: 15, visualCue: 'head'),
      ActivityStep(stepNumber: 6, instruction: 'Take a deep breath. Feel relaxed.', durationSeconds: 15, visualCue: 'relax'),
    ],
    customData: {
      'intensity': 'low',
      'movement': 'stretch',
    },
  );

  static const animalMoves = CachedActivity(
    id: 'movement_animals',
    name: 'Animal Moves',
    description: 'Move like different animals! Fun way to get energy out.',
    category: ActivityCategory.movement,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.preschool, AgeGroup.elementary],
    durationSeconds: 90,
    iconAsset: 'assets/icons/animal.png',
    tags: ['fun', 'play', 'energy'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Stomp like an ELEPHANT! 🐘', durationSeconds: 15, visualCue: 'elephant'),
      ActivityStep(stepNumber: 2, instruction: 'Hop like a BUNNY! 🐰', durationSeconds: 15, visualCue: 'bunny'),
      ActivityStep(stepNumber: 3, instruction: 'Slither like a SNAKE! 🐍', durationSeconds: 15, visualCue: 'snake'),
      ActivityStep(stepNumber: 4, instruction: 'Fly like a BIRD! 🦅', durationSeconds: 15, visualCue: 'bird'),
      ActivityStep(stepNumber: 5, instruction: 'Now be as still as a SLEEPING CAT 😺', durationSeconds: 20, visualCue: 'cat'),
    ],
    customData: {
      'animals': ['elephant', 'bunny', 'snake', 'bird', 'cat'],
    },
  );

  static const crossBodyTaps = CachedActivity(
    id: 'movement_cross',
    name: 'Cross Body Taps',
    description: 'Tap opposite hand to knee. Helps your brain work better!',
    category: ActivityCategory.movement,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 60,
    iconAsset: 'assets/icons/cross_body.png',
    tags: ['brain', 'focus', 'coordination'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Stand tall with space to move', durationSeconds: 5, visualCue: 'stand'),
      ActivityStep(stepNumber: 2, instruction: 'Lift RIGHT knee, touch with LEFT hand ✋', durationSeconds: 10, visualCue: 'cross_right'),
      ActivityStep(stepNumber: 3, instruction: 'Lift LEFT knee, touch with RIGHT hand ✋', durationSeconds: 10, visualCue: 'cross_left'),
      ActivityStep(stepNumber: 4, instruction: 'Keep alternating! Left-right-left-right', durationSeconds: 25, visualCue: 'alternate'),
      ActivityStep(stepNumber: 5, instruction: 'Slow down and stop. Take a breath.', durationSeconds: 10, visualCue: 'stop'),
    ],
    customData: {
      'type': 'cross_lateral',
      'benefits': ['focus', 'coordination', 'brain_integration'],
    },
  );

  static List<CachedActivity> all = [
    shakeItOff,
    slowStretch,
    animalMoves,
    crossBodyTaps,
  ];
}

/// Built-in sensory activities
class SensoryExercises {
  static const handSqueezes = CachedActivity(
    id: 'sensory_squeeze',
    name: 'Hand Squeezes',
    description: 'Squeeze your hands together tight, then release. Feel the difference!',
    category: ActivityCategory.sensory,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 60,
    iconAsset: 'assets/icons/hand_squeeze.png',
    tags: ['hands', 'tension', 'release'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Make tight fists with both hands ✊', durationSeconds: 5, visualCue: 'fist'),
      ActivityStep(stepNumber: 2, instruction: 'Squeeze as TIGHT as you can!', durationSeconds: 5, visualCue: 'squeeze'),
      ActivityStep(stepNumber: 3, instruction: 'Now RELEASE and shake them out 🖐️', durationSeconds: 5, visualCue: 'release'),
      ActivityStep(stepNumber: 4, instruction: 'Notice how different your hands feel', durationSeconds: 5, visualCue: 'notice'),
    ],
    customData: {
      'repetitions': 5,
      'targetArea': 'hands',
    },
  );

  static const wallPush = CachedActivity(
    id: 'sensory_wall',
    name: 'Wall Push',
    description: 'Push against a wall with all your strength. Great for calming down.',
    category: ActivityCategory.sensory,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 60,
    iconAsset: 'assets/icons/wall_push.png',
    tags: ['proprioception', 'calm', 'strength'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Stand facing a wall, arms out', durationSeconds: 5, visualCue: 'stand_wall'),
      ActivityStep(stepNumber: 2, instruction: 'Put your palms flat on the wall', durationSeconds: 5, visualCue: 'palms_wall'),
      ActivityStep(stepNumber: 3, instruction: 'PUSH the wall as hard as you can! 💪', durationSeconds: 10, visualCue: 'push'),
      ActivityStep(stepNumber: 4, instruction: 'Keep pushing! Count to 10...', durationSeconds: 10, visualCue: 'hold'),
      ActivityStep(stepNumber: 5, instruction: 'Slowly release and step back', durationSeconds: 5, visualCue: 'release'),
      ActivityStep(stepNumber: 6, instruction: 'Shake out your arms. Notice how you feel.', durationSeconds: 10, visualCue: 'shake'),
    ],
    customData: {
      'type': 'heavy_work',
      'proprioceptive': true,
    },
  );

  static const selfHug = CachedActivity(
    id: 'sensory_hug',
    name: 'Self Hug',
    description: 'Give yourself a big, tight hug. Deep pressure feels calming.',
    category: ActivityCategory.sensory,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 45,
    iconAsset: 'assets/icons/self_hug.png',
    tags: ['comfort', 'pressure', 'calm'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Cross your arms over your chest', durationSeconds: 5, visualCue: 'arms_cross'),
      ActivityStep(stepNumber: 2, instruction: 'Give yourself a BIG hug! 🤗', durationSeconds: 5, visualCue: 'hug'),
      ActivityStep(stepNumber: 3, instruction: 'Squeeze tight and hold...', durationSeconds: 15, visualCue: 'squeeze'),
      ActivityStep(stepNumber: 4, instruction: 'Take slow breaths while hugging', durationSeconds: 10, visualCue: 'breathe'),
      ActivityStep(stepNumber: 5, instruction: 'Slowly release. You did great! 💚', durationSeconds: 10, visualCue: 'release'),
    ],
    customData: {
      'type': 'deep_pressure',
      'self_soothing': true,
    },
  );

  static const coldWater = CachedActivity(
    id: 'sensory_cold',
    name: 'Cold Water Reset',
    description: 'Hold something cold or splash cold water on your wrists. Helps reset your nervous system.',
    category: ActivityCategory.sensory,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.elementary, AgeGroup.middleSchool, AgeGroup.highSchool],
    durationSeconds: 60,
    iconAsset: 'assets/icons/cold_water.png',
    tags: ['reset', 'temperature', 'alert'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Find cold water or something cold to hold', durationSeconds: 10, visualCue: 'find'),
      ActivityStep(stepNumber: 2, instruction: 'Put cold water on your wrists or hold the cold item', durationSeconds: 10, visualCue: 'apply'),
      ActivityStep(stepNumber: 3, instruction: 'Focus on the cold sensation', durationSeconds: 20, visualCue: 'feel'),
      ActivityStep(stepNumber: 4, instruction: 'Notice how your body responds', durationSeconds: 10, visualCue: 'notice'),
      ActivityStep(stepNumber: 5, instruction: 'Take a deep breath. You can handle this.', durationSeconds: 10, visualCue: 'breathe'),
    ],
    customData: {
      'type': 'temperature',
      'sensory_input': 'cold',
    },
  );

  static List<CachedActivity> all = [
    handSqueezes,
    wallPush,
    selfHug,
    coldWater,
  ];
}

/// Built-in calming sounds descriptions (audio files would be embedded assets)
class SoundExercises {
  static const natureSounds = CachedActivity(
    id: 'sounds_nature',
    name: 'Nature Sounds',
    description: 'Listen to calming sounds from nature: rain, ocean, forest.',
    category: ActivityCategory.sounds,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 180,
    iconAsset: 'assets/icons/nature.png',
    tags: ['relax', 'audio', 'nature'],
    requiresAudio: true,
    audioAssetId: 'nature_sounds',
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Find a comfortable position', durationSeconds: 10, visualCue: 'sit'),
      ActivityStep(stepNumber: 2, instruction: 'Close your eyes and listen... 🎧', durationSeconds: 10, visualCue: 'close_eyes'),
      ActivityStep(stepNumber: 3, instruction: 'Imagine you are there in nature', durationSeconds: 150, visualCue: 'nature', audioFileName: 'nature.mp3'),
      ActivityStep(stepNumber: 4, instruction: 'Slowly open your eyes', durationSeconds: 10, visualCue: 'open_eyes'),
    ],
    customData: {
      'soundType': 'nature',
      'variants': ['rain', 'ocean', 'forest', 'birds'],
    },
  );

  static const whiteNoise = CachedActivity(
    id: 'sounds_white_noise',
    name: 'White Noise',
    description: 'Steady background sound to block distractions and help focus.',
    category: ActivityCategory.sounds,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 300,
    iconAsset: 'assets/icons/white_noise.png',
    tags: ['focus', 'block', 'study'],
    requiresAudio: true,
    audioAssetId: 'white_noise',
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Play the white noise', durationSeconds: 5, audioFileName: 'white_noise.mp3'),
      ActivityStep(stepNumber: 2, instruction: 'Let the sound fill your ears', durationSeconds: 295, visualCue: 'waves'),
    ],
    customData: {
      'soundType': 'white_noise',
      'continuous': true,
    },
  );

  static const humming = CachedActivity(
    id: 'sounds_humming',
    name: 'Humming',
    description: 'Hum a low, steady note. The vibration in your chest is very calming.',
    category: ActivityCategory.sounds,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 60,
    iconAsset: 'assets/icons/humming.png',
    tags: ['vibration', 'calm', 'self-made'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: 'Take a deep breath in', durationSeconds: 4, visualCue: 'inhale'),
      ActivityStep(stepNumber: 2, instruction: 'Hum a low note as you breathe out: "Mmmmmm" 🎵', durationSeconds: 8, visualCue: 'hum'),
      ActivityStep(stepNumber: 3, instruction: 'Feel the vibration in your chest and head', durationSeconds: 4, visualCue: 'feel'),
    ],
    customData: {
      'selfGenerated': true,
      'cycles': 5,
    },
  );

  static List<CachedActivity> all = [
    natureSounds,
    whiteNoise,
    humming,
  ];
}

/// Built-in counting exercises
class CountingExercises {
  static const countToTen = CachedActivity(
    id: 'counting_10',
    name: 'Count to 10',
    description: 'Simple slow counting to calm down. Focus on each number.',
    category: ActivityCategory.counting,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.all],
    durationSeconds: 30,
    iconAsset: 'assets/icons/numbers.png',
    tags: ['simple', 'focus', 'calm'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: '1...', durationSeconds: 3, visualCue: '1'),
      ActivityStep(stepNumber: 2, instruction: '2...', durationSeconds: 3, visualCue: '2'),
      ActivityStep(stepNumber: 3, instruction: '3...', durationSeconds: 3, visualCue: '3'),
      ActivityStep(stepNumber: 4, instruction: '4...', durationSeconds: 3, visualCue: '4'),
      ActivityStep(stepNumber: 5, instruction: '5...', durationSeconds: 3, visualCue: '5'),
      ActivityStep(stepNumber: 6, instruction: '6...', durationSeconds: 3, visualCue: '6'),
      ActivityStep(stepNumber: 7, instruction: '7...', durationSeconds: 3, visualCue: '7'),
      ActivityStep(stepNumber: 8, instruction: '8...', durationSeconds: 3, visualCue: '8'),
      ActivityStep(stepNumber: 9, instruction: '9...', durationSeconds: 3, visualCue: '9'),
      ActivityStep(stepNumber: 10, instruction: '10. Well done! 🌟', durationSeconds: 3, visualCue: '10'),
    ],
    customData: {
      'countTo': 10,
      'speed': 'slow',
    },
  );

  static const countBackwards = CachedActivity(
    id: 'counting_backwards',
    name: 'Count Backwards',
    description: 'Count backwards from 10 to 1. Takes more focus and helps distract from worries.',
    category: ActivityCategory.counting,
    difficulty: ActivityDifficulty.beginner,
    ageGroups: [AgeGroup.elementary, AgeGroup.middleSchool, AgeGroup.highSchool],
    durationSeconds: 30,
    iconAsset: 'assets/icons/countdown.png',
    tags: ['focus', 'distract', 'calm'],
    steps: [
      ActivityStep(stepNumber: 1, instruction: '10...', durationSeconds: 3, visualCue: '10'),
      ActivityStep(stepNumber: 2, instruction: '9...', durationSeconds: 3, visualCue: '9'),
      ActivityStep(stepNumber: 3, instruction: '8...', durationSeconds: 3, visualCue: '8'),
      ActivityStep(stepNumber: 4, instruction: '7...', durationSeconds: 3, visualCue: '7'),
      ActivityStep(stepNumber: 5, instruction: '6...', durationSeconds: 3, visualCue: '6'),
      ActivityStep(stepNumber: 6, instruction: '5...', durationSeconds: 3, visualCue: '5'),
      ActivityStep(stepNumber: 7, instruction: '4...', durationSeconds: 3, visualCue: '4'),
      ActivityStep(stepNumber: 8, instruction: '3...', durationSeconds: 3, visualCue: '3'),
      ActivityStep(stepNumber: 9, instruction: '2...', durationSeconds: 3, visualCue: '2'),
      ActivityStep(stepNumber: 10, instruction: '1... You did it! 🚀', durationSeconds: 3, visualCue: '1'),
    ],
    customData: {
      'countFrom': 10,
      'direction': 'backwards',
    },
  );

  static List<CachedActivity> all = [
    countToTen,
    countBackwards,
  ];
}

/// Main class to access all cached activities
class CachedActivities {
  static List<CachedActivity> get all => [
    ...BreathingExercises.all,
    ...GroundingExercises.all,
    ...MovementExercises.all,
    ...SensoryExercises.all,
    ...SoundExercises.all,
    ...CountingExercises.all,
  ];

  static List<CachedActivity> byCategory(ActivityCategory category) {
    switch (category) {
      case ActivityCategory.breathing:
        return BreathingExercises.all;
      case ActivityCategory.grounding:
        return GroundingExercises.all;
      case ActivityCategory.movement:
        return MovementExercises.all;
      case ActivityCategory.sensory:
        return SensoryExercises.all;
      case ActivityCategory.sounds:
        return SoundExercises.all;
      case ActivityCategory.counting:
        return CountingExercises.all;
      default:
        return [];
    }
  }

  static List<CachedActivity> byAgeGroup(AgeGroup ageGroup) {
    return all.where((a) =>
      a.ageGroups.contains(ageGroup) ||
      a.ageGroups.contains(AgeGroup.all)
    ).toList();
  }

  static List<CachedActivity> byDifficulty(ActivityDifficulty difficulty) {
    return all.where((a) => a.difficulty == difficulty).toList();
  }

  static List<CachedActivity> byTag(String tag) {
    return all.where((a) => a.tags.contains(tag.toLowerCase())).toList();
  }

  static CachedActivity? byId(String id) {
    try {
      return all.firstWhere((a) => a.id == id);
    } catch (e) {
      return null;
    }
  }

  static List<CachedActivity> offlineOnly() {
    return all.where((a) => !a.requiresAudio && !a.requiresVisual).toList();
  }

  static List<String> get allCategories =>
      ActivityCategory.values.map((c) => c.name).toList();

  static List<String> get allTags {
    final tags = <String>{};
    for (final activity in all) {
      tags.addAll(activity.tags);
    }
    return tags.toList()..sort();
  }
}
