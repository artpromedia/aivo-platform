/**
 * Sensory Profile Types - ND-2.1
 *
 * Shared type definitions for sensory profile matching and content adaptation.
 * Used by content-svc, personalization-svc, and mobile apps.
 */
// ══════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ══════════════════════════════════════════════════════════════════════════════
/** Default sensory sensitivity */
export const DEFAULT_SENSITIVITY = {
    level: 5,
    category: 'typical',
    triggers: [],
    copingStrategies: [],
};
/** Get sensitivity category from level */
export function getSensitivityCategory(level) {
    if (level <= 3)
        return 'hyposensitive';
    if (level >= 7)
        return 'hypersensitive';
    return 'typical';
}
/** Check if sensitivity level indicates high sensitivity */
export function isHighSensitivity(level) {
    return level >= 6;
}
/** Check if sensitivity level indicates very high sensitivity */
export function isVeryHighSensitivity(level) {
    return level >= 8;
}
//# sourceMappingURL=types.js.map