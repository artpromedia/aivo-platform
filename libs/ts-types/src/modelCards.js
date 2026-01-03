/**
 * Model Card Types for AI Transparency
 *
 * Types for model cards that document AI capabilities, limitations,
 * and safety considerations for platform and district administrators.
 */
export const MODEL_PROVIDERS = [
    'OPENAI',
    'ANTHROPIC',
    'GOOGLE',
    'INTERNAL',
    'META',
    'MISTRAL',
    'COHERE',
];
/**
 * Provider display information
 */
export const PROVIDER_DISPLAY = {
    OPENAI: { name: 'OpenAI', color: 'emerald' },
    ANTHROPIC: { name: 'Anthropic', color: 'orange' },
    GOOGLE: { name: 'Google', color: 'blue' },
    INTERNAL: { name: 'Aivo', color: 'violet' },
    META: { name: 'Meta', color: 'sky' },
    MISTRAL: { name: 'Mistral', color: 'amber' },
    COHERE: { name: 'Cohere', color: 'pink' },
};
/**
 * Parse intended use cases into structured format
 */
export function parseUseCases(intendedUseCases, limitations) {
    const extractBullets = (text, header) => {
        const headerIndex = text.toLowerCase().indexOf(header.toLowerCase());
        if (headerIndex === -1)
            return [];
        const afterHeader = text.slice(headerIndex + header.length);
        const lines = afterHeader.split('\n');
        const bullets = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                bullets.push(trimmed.replace(/^[•-]\s*/, ''));
            }
            else if (trimmed && !trimmed.includes(':') && bullets.length > 0) {
                // Stop at next section header
                break;
            }
        }
        return bullets;
    };
    return {
        bestFor: extractBullets(intendedUseCases, 'Best for:'),
        notAppropriateFor: extractBullets(limitations, 'Not appropriate for:'),
    };
}
/**
 * Parse safety considerations into structured format
 */
export function parseSafety(safetyConsiderations) {
    const lines = safetyConsiderations.split('\n');
    const measures = [];
    let disclaimer;
    let inMeasures = false;
    let inDisclaimer = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().includes('safety measures')) {
            inMeasures = true;
            inDisclaimer = false;
            continue;
        }
        if (trimmed.toLowerCase().includes('disclaimer:')) {
            inMeasures = false;
            inDisclaimer = true;
            disclaimer = trimmed.replace(/^disclaimer:\s*/i, '');
            continue;
        }
        if (inMeasures && (trimmed.startsWith('•') || trimmed.startsWith('-'))) {
            measures.push(trimmed.replace(/^[•-]\s*/, ''));
        }
        if (inDisclaimer && trimmed && !trimmed.startsWith('•')) {
            disclaimer = (disclaimer || '') + ' ' + trimmed;
        }
    }
    return { measures, disclaimer: disclaimer?.trim() };
}
//# sourceMappingURL=modelCards.js.map