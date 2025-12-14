/**
 * Safety Response Templates
 *
 * Provides static, safe responses for sensitive topics.
 * These responses are carefully crafted to:
 * - NOT ask follow-up questions about sensitive topics
 * - NOT provide crisis hotline numbers (per Aivo policy - route to trusted adults)
 * - Use neutral, non-clinical language
 * - Be age-appropriate for K-12 learners
 * - Encourage speaking to trusted adults
 */

// ────────────────────────────────────────────────────────────────────────────
// RESPONSE TEMPLATES
// ────────────────────────────────────────────────────────────────────────────

interface ResponseTemplate {
  en: string;
  es?: string;
}

/**
 * Safe responses for different incident categories.
 * Keyed by incident category and locale.
 */
const SAFE_RESPONSES: Record<string, ResponseTemplate> = {
  /**
   * Self-harm / Suicidal ideation response.
   *
   * IMPORTANT:
   * - Does NOT ask about plans or details
   * - Does NOT provide hotline numbers (per Aivo K-12 policy)
   * - Encourages reaching out to a trusted adult
   * - Uses neutral, supportive language
   */
  SELF_HARM: {
    en: `I hear that you're going through something really difficult right now, and I'm sorry you're feeling this way. This is something I'm not able to help with directly.

It's really important that you talk to a trusted adult right away — like a parent, guardian, teacher, or school counselor. They care about you and can help.

Please reach out to someone you trust as soon as possible. You don't have to go through this alone.`,

    es: `Escucho que estás pasando por algo muy difícil en este momento, y lamento que te sientas así. Esto es algo con lo que no puedo ayudar directamente.

Es muy importante que hables con un adulto de confianza de inmediato — como un padre, tutor, maestro o consejero escolar. Ellos se preocupan por ti y pueden ayudarte.

Por favor, comunícate con alguien de tu confianza lo antes posible. No tienes que pasar por esto solo/a.`,
  },

  /**
   * Abuse detection response.
   * Encourages speaking to a trusted adult without asking details.
   */
  ABUSE_DETECTED: {
    en: `It sounds like you might be in a difficult or unsafe situation. I'm not able to help with this directly, but I want you to know that what you're feeling matters.

Please talk to a trusted adult right away — like a teacher, school counselor, parent, or another adult you trust. They can help keep you safe.

You deserve to feel safe, and there are people who want to help you.`,

    es: `Parece que podrías estar en una situación difícil o insegura. No puedo ayudar con esto directamente, pero quiero que sepas que lo que sientes importa.

Por favor, habla con un adulto de confianza de inmediato — como un maestro, consejero escolar, padre u otro adulto en quien confíes. Ellos pueden ayudarte a estar seguro/a.

Mereces sentirte seguro/a, y hay personas que quieren ayudarte.`,
  },

  /**
   * Violence threat response.
   */
  VIOLENCE_DETECTED: {
    en: `I can't help with this. If you or someone else is in immediate danger, please tell a trusted adult right away — a parent, teacher, or school counselor.

It's important to talk to someone who can help keep everyone safe.`,

    es: `No puedo ayudar con esto. Si tú o alguien más está en peligro inmediato, por favor dile a un adulto de confianza de inmediato — un padre, maestro o consejero escolar.

Es importante hablar con alguien que pueda ayudar a mantener a todos seguros.`,
  },

  /**
   * Explicit content response.
   */
  EXPLICIT_CONTENT: {
    en: `I'm not able to help with that kind of request. Let's focus on your learning instead!

Is there a homework problem or study topic I can help you with?`,

    es: `No puedo ayudar con ese tipo de solicitud. ¡Concentrémonos en tu aprendizaje!

¿Hay algún problema de tarea o tema de estudio con el que pueda ayudarte?`,
  },

  /**
   * Diagnosis attempt response (used by post-filter).
   */
  DIAGNOSIS_ATTEMPT: {
    en: `I understand you have questions about how you learn or feel, but I'm not able to diagnose or identify any conditions. That's something only qualified professionals like doctors, psychologists, or your school's support team can do.

If you're curious about this, please talk to a parent or guardian. They can help you find the right person to talk to.

Is there something specific about your learning I can help you with today?`,

    es: `Entiendo que tienes preguntas sobre cómo aprendes o te sientes, pero no puedo diagnosticar ni identificar ninguna condición. Eso es algo que solo pueden hacer profesionales calificados como médicos, psicólogos o el equipo de apoyo de tu escuela.

Si tienes curiosidad sobre esto, por favor habla con un padre o tutor. Ellos pueden ayudarte a encontrar a la persona adecuada para hablar.

¿Hay algo específico sobre tu aprendizaje con lo que pueda ayudarte hoy?`,
  },

  /**
   * Homework answer blocked response (used by post-filter).
   */
  HOMEWORK_ANSWER_BLOCKED: {
    en: `I noticed you're looking for an answer, but my job is to help you learn and understand, not just give you the answer! Let me guide you through this step by step instead.

What part of this problem is confusing you? Let's break it down together.`,

    es: `Noté que estás buscando una respuesta, pero mi trabajo es ayudarte a aprender y entender, ¡no solo darte la respuesta! Déjame guiarte paso a paso.

¿Qué parte de este problema te confunde? Analicémoslo juntos.`,
  },

  /**
   * Generic fallback response.
   */
  OTHER: {
    en: `I'm not able to help with that request. Let me know if there's something else I can assist you with!`,

    es: `No puedo ayudar con esa solicitud. ¡Déjame saber si hay algo más en lo que pueda ayudarte!`,
  },
};

// ────────────────────────────────────────────────────────────────────────────
// API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get a safe response for a given category and locale.
 *
 * @param category - The incident category
 * @param locale - The user's locale (e.g., 'en-US', 'es-MX')
 * @returns The safe response text
 */
export function getSafeResponse(category: string, locale = 'en'): string {
  const template = SAFE_RESPONSES[category] ?? SAFE_RESPONSES.OTHER;
  if (!template) {
    return SAFE_RESPONSES.OTHER?.en ?? 'I cannot help with that request.';
  }

  // Extract language code from locale
  const langCode = locale.split('-')[0]?.toLowerCase() ?? 'en';

  // Return localized response or fall back to English
  if (langCode === 'es' && template.es) {
    return template.es;
  }

  return template.en;
}

/**
 * Get the safe response for self-harm situations.
 * Exported separately for explicit use in critical paths.
 */
export function getSelfHarmResponse(locale = 'en'): string {
  return getSafeResponse('SELF_HARM', locale);
}

/**
 * Get the safe response for abuse situations.
 */
export function getAbuseResponse(locale = 'en'): string {
  return getSafeResponse('ABUSE_DETECTED', locale);
}

/**
 * Get the safe response for diagnosis attempts.
 */
export function getDiagnosisResponse(locale = 'en'): string {
  return getSafeResponse('DIAGNOSIS_ATTEMPT', locale);
}

/**
 * Get the safe response for blocked homework answers.
 */
export function getHomeworkBlockedResponse(locale = 'en'): string {
  return getSafeResponse('HOMEWORK_ANSWER_BLOCKED', locale);
}

/**
 * Generate a hint/scaffolding response when homework answer is blocked.
 * This provides more context for the Homework Helper use case.
 *
 * @param subject - The subject area
 * @param originalResponse - The original LLM response (for context)
 * @param locale - The user's locale
 */
export function getHomeworkScaffoldResponse(
  subject: string,
  _originalResponse: string,
  locale = 'en'
): string {
  const subjectHints: Record<string, ResponseTemplate> = {
    MATH: {
      en: `Let's work through this problem together! Here are some questions to guide your thinking:

1. What information are you given in the problem?
2. What are you trying to find?
3. What formula or method might help here?

Try working through these steps, and let me know what you get!`,
      es: `¡Trabajemos en este problema juntos! Aquí hay algunas preguntas para guiar tu pensamiento:

1. ¿Qué información te da el problema?
2. ¿Qué estás tratando de encontrar?
3. ¿Qué fórmula o método podría ayudar aquí?

Intenta trabajar en estos pasos y ¡dime qué obtienes!`,
    },
    ELA: {
      en: `Let's think about this together! Consider these questions:

1. What is the main idea or theme?
2. What evidence from the text supports your answer?
3. How can you explain your reasoning in your own words?

Share your thoughts and we can discuss!`,
      es: `¡Pensemos en esto juntos! Considera estas preguntas:

1. ¿Cuál es la idea principal o el tema?
2. ¿Qué evidencia del texto apoya tu respuesta?
3. ¿Cómo puedes explicar tu razonamiento con tus propias palabras?

¡Comparte tus pensamientos y podemos discutir!`,
    },
    SCIENCE: {
      en: `Let's explore this scientific question! Think about:

1. What do you already know about this topic?
2. What scientific principles might apply?
3. Can you make a prediction and explain why?

Tell me your thinking and we'll work through it together!`,
      es: `¡Exploremos esta pregunta científica! Piensa en:

1. ¿Qué ya sabes sobre este tema?
2. ¿Qué principios científicos podrían aplicar?
3. ¿Puedes hacer una predicción y explicar por qué?

¡Dime lo que piensas y lo trabajaremos juntos!`,
    },
  };

  const langCode = locale.split('-')[0]?.toLowerCase() ?? 'en';
  const hint = subjectHints[subject.toUpperCase()] ?? subjectHints.MATH;
  if (!hint) {
    return subjectHints.MATH?.en ?? "Let's work through this together!";
  }

  if (langCode === 'es' && hint.es) {
    return hint.es;
  }

  return hint.en;
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export { SAFE_RESPONSES };
