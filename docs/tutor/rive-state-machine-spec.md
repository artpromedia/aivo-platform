# Rive Tutor Avatar — State Machine Specification

> Design spec for animated tutor avatars powered by Rive runtime.
> Each `.riv` file follows this structure so the Flutter and React components
> can drive them identically.

## State Machine: `TutorController`

Each persona `.riv` file must contain a state machine named **`TutorController`** on a 500x500 px artboard.

### Inputs

| Name | Type | Description |
|------|------|-------------|
| `trigTalk` | Trigger | Start talking animation |
| `trigStopTalk` | Trigger | Stop talking, return to idle |
| `trigCelebrate` | Trigger | Play celebration animation |
| `trigEncourage` | Trigger | Thumbs up / nodding animation |
| `trigThink` | Trigger | Thinking pose |
| `trigWave` | Trigger | Hello/goodbye wave |
| `mouthOpen` | Number (0–1) | Mouth open amount for lip-sync |
| `blinkTrigger` | Trigger | Manual blink (auto-blink also runs) |
| `isListening` | Boolean | Attentive lean-forward pose |

### States

| State | Animation | Loops | Transitions To |
|-------|-----------|-------|----------------|
| **Idle** | Gentle breathing, occasional blink, subtle sway | Yes | Talking, Thinking, Celebrating, Encouraging, Listening, Waving |
| **Talking** | Mouth animated by `mouthOpen` input, hand gestures | Yes | Idle (via `trigStopTalk`) |
| **Thinking** | Hand on chin, eyes look up, thought bubble appears | No (holds) | Idle (auto after 3 s) |
| **Celebrating** | Arms up, bouncing, stars/sparkles emit | No | Idle (auto after 2 s) |
| **Encouraging** | Thumbs up, warm smile, nodding | No | Idle (auto after 2 s) |
| **Listening** | Lean forward, attentive eyes, slight nodding | Yes | Idle (when `isListening` = false) |
| **Waving** | Hand wave, big smile | No | Idle (auto after 2 s) |

### Legacy Compatibility

Existing `.riv` files use a numeric-input state machine named `TutorStateMachine`
with `animationState` (int), `emotion` (int), and `isAnimating` (bool) inputs.
The Flutter widget supports both the new trigger-based `TutorController` and the
legacy `TutorStateMachine`, falling back automatically.

---

## Character Design Guidelines

### Style

- Flat 2D vector, rounded shapes, large expressive eyes (Duolingo-inspired)
- 500 x 500 px artboard
- Body parts to rig: head (with pivot), eyes (2 separate for blink), mouth (open/close blend), eyebrows (up/down), body (sway), left arm (gesture), right arm (gesture)

### Persona Color Palettes

| Persona | Slug | Subject | Primary | Accent | Motifs |
|---------|------|---------|---------|--------|--------|
| **Nova** | `nova-math` | Math | Indigo `#6366F1` | Purple `#A855F7` | Stars, galaxies |
| **Sage** | `sage-ela` | ELA | Emerald `#10B981` | Teal `#14B8A6` | Books, scrolls |
| **Spark** | `spark-science` | Science | Amber `#F59E0B` | Orange `#F97316` | Lightning, beakers |
| **Chrono** | `chrono-history` | History | Purple `#8B5CF6` | Rose `#F43F5E` | Clocks, compasses |
| **Pixel** | `pixel-coding` | Coding | Cyan `#06B6D4` | Blue `#3B82F6` | Pixels, circuits |

---

## Integration Points

### Flutter Widget (`AnimatedTutorAvatar`)

Location: `libs/flutter-common/lib/widgets/tutor_avatar/animated_tutor_avatar.dart`

The widget attempts to load `TutorController` first. If not found, falls back to
the legacy `TutorStateMachine`. If neither exists (or the `.riv` file is missing),
a colored-circle fallback with the persona initial and animated speaking indicators
is rendered.

Props driving the state machine:
- `state: TutorAvatarState` — fires the appropriate trigger
- `mouthOpenAmount: double` — updates `mouthOpen` SMINumber at paint rate
- `reducedMotion: bool` — skips Rive, shows static fallback

### React Component (`AnimatedTutorAvatar`)

Location: `apps/web-learner/components/tutor/animated-tutor-avatar.tsx`

Uses `@rive-app/react-canvas` with `useRive()` and `useStateMachineInput()`.
Falls back to colored-circle + Framer Motion indicators when `.riv` files are
unavailable or `reducedMotion` is true.

### Asset Paths

| Platform | Path |
|----------|------|
| Flutter | `assets/rive/{persona_slug}.riv` |
| Web | `/public/rive/tutors/{persona_slug}.riv` |
| Mobile | `assets/rive/{persona_slug}.riv` (bundled via pubspec) |

---

## Placeholder Strategy

Since `.riv` files are designed in Rive's editor (rive.app), both the Flutter
widget and React component include rich fallback rendering:

1. Colored gradient circle matching the persona palette
2. Persona initial letter (bold, centered)
3. Animated speaking indicator (three pulsing dots) when `state == talking`
4. State-based emoji overlays:
   - Thinking: thought bubble icon
   - Celebrating: sparkle particles
   - Encouraging: thumbs-up badge
   - Waving: wave icon
   - Listening: subtle pulse ring
5. `mouthOpenAmount` drives dot-pulse amplitude in fallback mode

This ensures the UI works immediately while `.riv` assets are created in the
Rive editor.
