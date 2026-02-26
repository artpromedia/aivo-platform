import type { EmotionType } from '../prisma.js';

const EMOTION_KEYWORDS: Record<string, string[]> = {
  HAPPY: ['great job', 'awesome', 'wonderful', 'excellent', 'fantastic', 'well done', 'congratulations', 'amazing'],
  THINKING: ['let me think', 'consider', 'interesting question', 'hmm', 'let\'s explore', 'that\'s a good point'],
  ENCOURAGING: ['you can do it', 'keep trying', 'don\'t give up', 'almost there', 'you\'re close', 'believe in you'],
  EXCITED: ['wow', 'incredible', 'so cool', 'exciting', 'love it', 'brilliant'],
  EMPATHETIC: ['understand', 'i know it\'s hard', 'that\'s okay', 'take your time', 'no worries', 'it\'s normal'],
};

export class EmotionService {
  detectEmotion(text: string): EmotionType {
    const lower = text.toLowerCase();

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return emotion as EmotionType;
        }
      }
    }

    // Check for question marks (thinking)
    if ((text.match(/\?/g) || []).length > 1) {
      return 'THINKING' as EmotionType;
    }

    // Check for exclamation marks (excitement or encouragement)
    if ((text.match(/!/g) || []).length > 1) {
      return 'ENCOURAGING' as EmotionType;
    }

    return 'NEUTRAL' as EmotionType;
  }
}

export const emotionService = new EmotionService();
