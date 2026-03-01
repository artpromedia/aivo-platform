"""
Sensory Accommodator

Applies visual, auditory, and motor accommodations to content for
learners with sensory-related accessibility needs.

Accommodation areas
───────────────────
Visual   — high contrast, font scaling, colour-blind palettes, dyslexia fonts
Auditory — captions, visual indicators, text alternatives for audio
Motor    — enlarged touch targets, keyboard navigation, dwell-click, simplified gestures
"""
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ── Enums ───────────────────────────────────────────────────────────────

class AccommodationType(Enum):
    """Top-level accommodation category."""
    VISUAL = "visual"
    AUDITORY = "auditory"
    MOTOR = "motor"


class ColorBlindMode(Enum):
    """Colour-blind palette presets (simulated via CSS filters)."""
    PROTANOPIA = "protanopia"       # red-blind
    DEUTERANOPIA = "deuteranopia"   # green-blind
    TRITANOPIA = "tritanopia"       # blue-blind
    ACHROMATOPSIA = "achromatopsia" # total colour blindness


class ContrastLevel(Enum):
    """Contrast presets aligned with WCAG 2.1 AA / AAA levels."""
    NORMAL = "normal"
    HIGH = "high"      # WCAG AA (4.5:1)
    VERY_HIGH = "very_high"  # WCAG AAA (7:1)


# ── Result dataclasses ──────────────────────────────────────────────────

@dataclass
class VisualAccommodation:
    """Result of applying visual accommodations."""
    html: str
    css: Dict[str, str]
    contrast_level: str
    font_scale: float
    color_blind_mode: Optional[str] = None
    changes_applied: List[str] = field(default_factory=list)


@dataclass
class AuditoryAccommodation:
    """Result of applying auditory accommodations."""
    captions: List[Dict[str, Any]] = field(default_factory=list)
    visual_indicators: List[Dict[str, str]] = field(default_factory=list)
    text_alternative: str = ""
    changes_applied: List[str] = field(default_factory=list)


@dataclass
class MotorAccommodation:
    """Result of applying motor accommodations."""
    css: Dict[str, str] = field(default_factory=dict)
    interaction_overrides: Dict[str, Any] = field(default_factory=dict)
    keyboard_shortcuts: List[Dict[str, str]] = field(default_factory=list)
    changes_applied: List[str] = field(default_factory=list)


@dataclass
class SensoryAccommodationResult:
    """Combined result of all sensory accommodations."""
    visual: Optional[VisualAccommodation] = None
    auditory: Optional[AuditoryAccommodation] = None
    motor: Optional[MotorAccommodation] = None
    accommodations_applied: List[str] = field(default_factory=list)
    wcag_level: str = "AA"


# ── Colour-blind safe palettes ──────────────────────────────────────────

COLOR_BLIND_PALETTES: Dict[str, Dict[str, str]] = {
    "protanopia": {
        "primary": "#0072B2",
        "secondary": "#E69F00",
        "success": "#009E73",
        "danger": "#D55E00",
        "warning": "#F0E442",
        "info": "#56B4E9",
        "background": "#FFFFFF",
        "text": "#000000",
    },
    "deuteranopia": {
        "primary": "#0072B2",
        "secondary": "#E69F00",
        "success": "#56B4E9",
        "danger": "#D55E00",
        "warning": "#F0E442",
        "info": "#CC79A7",
        "background": "#FFFFFF",
        "text": "#000000",
    },
    "tritanopia": {
        "primary": "#D55E00",
        "secondary": "#0072B2",
        "success": "#009E73",
        "danger": "#CC79A7",
        "warning": "#E69F00",
        "info": "#56B4E9",
        "background": "#FFFFFF",
        "text": "#000000",
    },
    "achromatopsia": {
        "primary": "#333333",
        "secondary": "#666666",
        "success": "#000000",
        "danger": "#1A1A1A",
        "warning": "#4D4D4D",
        "info": "#808080",
        "background": "#FFFFFF",
        "text": "#000000",
    },
}


# ── Keyboard navigation shortcuts ──────────────────────────────────────

DEFAULT_KEYBOARD_SHORTCUTS: List[Dict[str, str]] = [
    {"key": "Tab", "action": "Move to next interactive element"},
    {"key": "Shift+Tab", "action": "Move to previous interactive element"},
    {"key": "Enter", "action": "Activate current element"},
    {"key": "Space", "action": "Activate button / toggle checkbox"},
    {"key": "Escape", "action": "Close dialog / cancel action"},
    {"key": "ArrowUp/ArrowDown", "action": "Navigate within list or menu"},
    {"key": "Home/End", "action": "Jump to first/last item"},
    {"key": "Ctrl+F", "action": "Open search"},
]


class SensoryAccommodator:
    """
    Apply sensory accommodations to content.

    Covers three accommodation domains:

    * **Visual** – high contrast, font scaling, colour-blind palettes,
      dyslexia-friendly fonts.
    * **Auditory** – generate captions from text, visual indicators for
      audio events, textual alternatives.
    * **Motor** – enlarged touch targets, keyboard navigation aids,
      dwell-click support, simplified gestures.

    Usage::

        accommodator = SensoryAccommodator()
        result = accommodator.apply_visual_accommodations(
            content="<p>Hello world</p>",
            contrast=ContrastLevel.HIGH,
            font_scale=1.5,
        )
    """

    def __init__(self) -> None:
        logger.info("SensoryAccommodator initialised")

    # ── Visual ──────────────────────────────────────────────────────────

    def apply_visual_accommodations(
        self,
        content: str,
        *,
        contrast: ContrastLevel = ContrastLevel.NORMAL,
        font_scale: float = 1.0,
        color_blind_mode: Optional[ColorBlindMode] = None,
        dyslexia_font: bool = False,
        line_spacing: float = 1.5,
        letter_spacing: Optional[str] = None,
    ) -> VisualAccommodation:
        """
        Apply visual accommodations to *content*.

        Parameters
        ----------
        content : str
            HTML or plain-text content.
        contrast : ContrastLevel
            Contrast preset (NORMAL / HIGH / VERY_HIGH).
        font_scale : float
            Multiplier applied to the base font size (1.0 = 100 %).
        color_blind_mode : ColorBlindMode | None
            Colour-blind palette to apply.
        dyslexia_font : bool
            Use dyslexia-friendly font family.
        line_spacing : float
            CSS ``line-height`` value.
        letter_spacing : str | None
            CSS ``letter-spacing`` value (e.g. ``"0.12em"``).
        """
        if not content:
            raise ValueError("Content cannot be empty")

        changes: List[str] = []
        css: Dict[str, str] = {}

        # Font scaling
        base_px = 16
        css["font-size"] = f"{base_px * font_scale}px"
        if font_scale != 1.0:
            changes.append(f"Font scaled to {font_scale:.0%}")

        # Line spacing
        css["line-height"] = str(line_spacing)
        if line_spacing != 1.5:
            changes.append(f"Line spacing set to {line_spacing}")

        # Letter spacing
        if letter_spacing:
            css["letter-spacing"] = letter_spacing
            changes.append(f"Letter spacing set to {letter_spacing}")

        # Dyslexia font
        if dyslexia_font:
            css["font-family"] = "OpenDyslexic, Comic Sans MS, Arial, sans-serif"
            changes.append("Dyslexia-friendly font applied")
        else:
            css["font-family"] = "Arial, Helvetica, sans-serif"

        # Contrast
        if contrast == ContrastLevel.HIGH:
            css["background-color"] = "#000000"
            css["color"] = "#FFFF00"
            changes.append("High contrast mode (WCAG AA)")
        elif contrast == ContrastLevel.VERY_HIGH:
            css["background-color"] = "#000000"
            css["color"] = "#FFFFFF"
            css["font-weight"] = "bold"
            changes.append("Very high contrast mode (WCAG AAA)")
        else:
            css["background-color"] = "#FFFFFF"
            css["color"] = "#333333"

        # Colour-blind palette
        cb_mode_str: Optional[str] = None
        if color_blind_mode is not None:
            palette = COLOR_BLIND_PALETTES.get(
                color_blind_mode.value, COLOR_BLIND_PALETTES["protanopia"]
            )
            css["--cb-primary"] = palette["primary"]
            css["--cb-secondary"] = palette["secondary"]
            css["--cb-success"] = palette["success"]
            css["--cb-danger"] = palette["danger"]
            css["--cb-warning"] = palette["warning"]
            css["--cb-info"] = palette["info"]
            cb_mode_str = color_blind_mode.value
            changes.append(f"Colour-blind palette applied ({cb_mode_str})")

        # Wrap content
        style_str = "; ".join(f"{k}: {v}" for k, v in css.items())
        html = (
            f'<div class="visual-accommodation" style="{style_str}" '
            f'role="main" aria-label="Accessible content">{content}</div>'
        )

        return VisualAccommodation(
            html=html,
            css=css,
            contrast_level=contrast.value,
            font_scale=font_scale,
            color_blind_mode=cb_mode_str,
            changes_applied=changes,
        )

    # ── Auditory ────────────────────────────────────────────────────────

    def apply_auditory_accommodations(
        self,
        *,
        audio_description: Optional[str] = None,
        transcript: Optional[str] = None,
        generate_captions: bool = True,
        visual_bell: bool = True,
    ) -> AuditoryAccommodation:
        """
        Apply auditory accommodations.

        Parameters
        ----------
        audio_description : str | None
            Textual description of audio content.
        transcript : str | None
            Full transcript of spoken content.
        generate_captions : bool
            Whether to generate timed caption blocks from the transcript.
        visual_bell : bool
            Whether to enable visual indicators for audio events.
        """
        changes: List[str] = []
        captions: List[Dict[str, Any]] = []
        visual_indicators: List[Dict[str, str]] = []
        text_alt = ""

        # Generate timed captions from transcript
        if transcript and generate_captions:
            captions = self._generate_captions(transcript)
            changes.append(f"Generated {len(captions)} caption blocks")

        # Text alternative
        if audio_description:
            text_alt = audio_description
            changes.append("Text alternative for audio provided")
        elif transcript:
            text_alt = transcript
            changes.append("Transcript used as text alternative")

        # Visual indicators
        if visual_bell:
            visual_indicators = [
                {"event": "notification", "indicator": "screen_flash",
                 "description": "Screen flashes briefly for notifications"},
                {"event": "timer_alert", "indicator": "pulsing_border",
                 "description": "Border pulses for timer alerts"},
                {"event": "error", "indicator": "red_banner",
                 "description": "Red banner appears for errors"},
                {"event": "success", "indicator": "green_checkmark",
                 "description": "Green checkmark appears for success"},
            ]
            changes.append("Visual indicators enabled for audio events")

        return AuditoryAccommodation(
            captions=captions,
            visual_indicators=visual_indicators,
            text_alternative=text_alt,
            changes_applied=changes,
        )

    # ── Motor ───────────────────────────────────────────────────────────

    def apply_motor_accommodations(
        self,
        *,
        enlarged_targets: bool = True,
        keyboard_nav: bool = True,
        dwell_click_ms: Optional[int] = None,
        simplified_gestures: bool = False,
        min_target_size_px: int = 44,
    ) -> MotorAccommodation:
        """
        Apply motor accommodations.

        Parameters
        ----------
        enlarged_targets : bool
            Enlarge interactive targets to at least *min_target_size_px*.
        keyboard_nav : bool
            Provide full keyboard navigation support.
        dwell_click_ms : int | None
            Enable dwell-click with given duration (milliseconds).
        simplified_gestures : bool
            Replace multi-touch / drag gestures with single-tap alternatives.
        min_target_size_px : int
            Minimum interactive target size in pixels (default 44 — WCAG).
        """
        changes: List[str] = []
        css: Dict[str, str] = {}
        interaction: Dict[str, Any] = {}
        shortcuts: List[Dict[str, str]] = []

        # Enlarged touch targets
        if enlarged_targets:
            css["--min-target-size"] = f"{min_target_size_px}px"
            css["--button-padding"] = "12px 24px"
            css["--link-padding"] = "8px 4px"
            css["cursor"] = "pointer"
            interaction["min_target_size_px"] = min_target_size_px
            changes.append(
                f"Touch targets enlarged to {min_target_size_px}px minimum"
            )

        # Keyboard navigation
        if keyboard_nav:
            css["outline-offset"] = "3px"
            css["--focus-ring"] = "3px solid #4A90D9"
            interaction["keyboard_nav_enabled"] = True
            interaction["focus_visible"] = True
            interaction["skip_nav"] = True
            shortcuts = list(DEFAULT_KEYBOARD_SHORTCUTS)
            changes.append("Keyboard navigation enabled with visible focus ring")

        # Dwell-click
        if dwell_click_ms is not None:
            interaction["dwell_click_enabled"] = True
            interaction["dwell_click_duration_ms"] = dwell_click_ms
            changes.append(f"Dwell-click enabled ({dwell_click_ms}ms)")

        # Simplified gestures
        if simplified_gestures:
            interaction["simplified_gestures"] = True
            interaction["gesture_replacements"] = {
                "pinch_zoom": "button_zoom",
                "swipe_navigate": "button_navigate",
                "drag_drop": "tap_select_tap_place",
                "long_press": "single_tap_menu",
                "multi_touch": "sequential_single_taps",
            }
            changes.append("Multi-touch gestures replaced with single-tap alternatives")

        return MotorAccommodation(
            css=css,
            interaction_overrides=interaction,
            keyboard_shortcuts=shortcuts,
            changes_applied=changes,
        )

    # ── Combined application ────────────────────────────────────────────

    def apply_all(
        self,
        content: str,
        profile: Dict[str, Any],
    ) -> SensoryAccommodationResult:
        """
        Apply all relevant accommodations based on a learner profile.

        The *profile* dict may contain::

            {
                "visual": {
                    "contrast": "high",
                    "font_scale": 1.5,
                    "color_blind_mode": "protanopia",
                    "dyslexia_font": true,
                },
                "auditory": {
                    "transcript": "...",
                    "visual_bell": true,
                },
                "motor": {
                    "enlarged_targets": true,
                    "dwell_click_ms": 800,
                    "simplified_gestures": true,
                },
            }
        """
        result = SensoryAccommodationResult()
        all_changes: List[str] = []

        # Visual
        vp = profile.get("visual")
        if vp:
            contrast_val = vp.get("contrast", "normal")
            try:
                contrast = ContrastLevel(contrast_val)
            except ValueError:
                contrast = ContrastLevel.NORMAL

            cbm = None
            cbm_val = vp.get("color_blind_mode")
            if cbm_val:
                try:
                    cbm = ColorBlindMode(cbm_val)
                except ValueError:
                    pass

            result.visual = self.apply_visual_accommodations(
                content,
                contrast=contrast,
                font_scale=vp.get("font_scale", 1.0),
                color_blind_mode=cbm,
                dyslexia_font=vp.get("dyslexia_font", False),
                line_spacing=vp.get("line_spacing", 1.5),
                letter_spacing=vp.get("letter_spacing"),
            )
            all_changes.extend(result.visual.changes_applied)

        # Auditory
        ap = profile.get("auditory")
        if ap:
            result.auditory = self.apply_auditory_accommodations(
                audio_description=ap.get("audio_description"),
                transcript=ap.get("transcript"),
                generate_captions=ap.get("generate_captions", True),
                visual_bell=ap.get("visual_bell", True),
            )
            all_changes.extend(result.auditory.changes_applied)

        # Motor
        mp = profile.get("motor")
        if mp:
            result.motor = self.apply_motor_accommodations(
                enlarged_targets=mp.get("enlarged_targets", True),
                keyboard_nav=mp.get("keyboard_nav", True),
                dwell_click_ms=mp.get("dwell_click_ms"),
                simplified_gestures=mp.get("simplified_gestures", False),
                min_target_size_px=mp.get("min_target_size_px", 44),
            )
            all_changes.extend(result.motor.changes_applied)

        result.accommodations_applied = all_changes

        # Determine WCAG level
        if result.visual and result.visual.contrast_level == "very_high":
            result.wcag_level = "AAA"
        elif result.visual and result.visual.contrast_level == "high":
            result.wcag_level = "AA"

        return result

    # ── Caption generator ───────────────────────────────────────────────

    @staticmethod
    def _generate_captions(
        transcript: str,
        words_per_block: int = 8,
        wpm: int = 150,
    ) -> List[Dict[str, Any]]:
        """
        Split a transcript into timed caption blocks.

        Each block gets approximate start/end times based on average
        speaking rate.
        """
        words = transcript.split()
        captions: List[Dict[str, Any]] = []
        seconds_per_word = 60.0 / wpm
        current_time = 0.0

        for i in range(0, len(words), words_per_block):
            block_words = words[i : i + words_per_block]
            block_text = " ".join(block_words)
            duration = len(block_words) * seconds_per_word

            captions.append({
                "index": len(captions),
                "start": round(current_time, 2),
                "end": round(current_time + duration, 2),
                "text": block_text,
            })
            current_time += duration

        return captions

    # ── Utility: list available accommodations ──────────────────────────

    @staticmethod
    def list_accommodations() -> Dict[str, List[Dict[str, str]]]:
        """Return catalogue of available accommodation options."""
        return {
            "visual": [
                {"id": "high_contrast", "name": "High Contrast",
                 "description": "WCAG AA compliant high contrast mode"},
                {"id": "very_high_contrast", "name": "Very High Contrast",
                 "description": "WCAG AAA compliant maximum contrast mode"},
                {"id": "font_scaling", "name": "Font Scaling",
                 "description": "Scale text up to 200% of base size"},
                {"id": "protanopia", "name": "Protanopia Palette",
                 "description": "Colour palette safe for red-blind users"},
                {"id": "deuteranopia", "name": "Deuteranopia Palette",
                 "description": "Colour palette safe for green-blind users"},
                {"id": "tritanopia", "name": "Tritanopia Palette",
                 "description": "Colour palette safe for blue-blind users"},
                {"id": "achromatopsia", "name": "Achromatopsia Palette",
                 "description": "Greyscale palette for total colour blindness"},
                {"id": "dyslexia_font", "name": "Dyslexia-Friendly Font",
                 "description": "OpenDyslexic font with increased spacing"},
            ],
            "auditory": [
                {"id": "captions", "name": "Auto-Captions",
                 "description": "Timed caption blocks from transcript"},
                {"id": "visual_bell", "name": "Visual Bell",
                 "description": "Visual indicators for audio events"},
                {"id": "text_alternative", "name": "Text Alternative",
                 "description": "Full text alternative for audio content"},
            ],
            "motor": [
                {"id": "enlarged_targets", "name": "Enlarged Touch Targets",
                 "description": "Minimum 44px interactive targets (WCAG)"},
                {"id": "keyboard_nav", "name": "Keyboard Navigation",
                 "description": "Full keyboard access with visible focus"},
                {"id": "dwell_click", "name": "Dwell Click",
                 "description": "Activate elements by hovering"},
                {"id": "simplified_gestures", "name": "Simplified Gestures",
                 "description": "Single-tap alternatives for complex gestures"},
            ],
        }
