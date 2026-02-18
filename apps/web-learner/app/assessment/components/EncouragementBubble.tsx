'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface EncouragementBubbleProps {
  message: string;
  type?: 'success' | 'encouragement' | 'hint';
  show?: boolean;
}

const BUBBLE_STYLES = {
  success: {
    bg: 'bg-green-100',
    border: 'border-green-300',
    text: 'text-green-800',
    icon: '🎉',
  },
  encouragement: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-600',
    icon: '💪',
  },
  hint: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    icon: '💡',
  },
};

export function EncouragementBubble({
  message,
  type = 'encouragement',
  show = true,
}: EncouragementBubbleProps) {
  const styles = BUBBLE_STYLES[type];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div
            className={`px-6 py-4 rounded-2xl border-2 shadow-lg ${styles.bg} ${styles.border}`}
          >
            <div className="flex items-center gap-3">
              <motion.span
                className="text-3xl"
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                {styles.icon}
              </motion.span>
              <p className={`font-semibold text-lg ${styles.text}`}>{message}</p>
            </div>
          </div>

          {/* Speech bubble tail */}
          <div
            className={`absolute left-1/2 -bottom-2 transform -translate-x-1/2 w-4 h-4 rotate-45 border-b-2 border-r-2 ${styles.bg} ${styles.border}`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Pre-defined encouragement messages
export const ENCOURAGEMENT_MESSAGES = {
  correct: [
    'Great job! 🌟',
    'Awesome! 🎉',
    'You got it! 💪',
    'Perfect! ⭐',
    'Excellent work! 🏆',
    'Amazing! 🚀',
    'Way to go! 🎯',
    'Super smart! 🧠',
  ],
  incorrect: [
    "Good try! Let's keep going! 💪",
    "You're doing great! 🌟",
    "Nice effort! Keep learning! 📚",
    "Every answer helps me learn about you! 🧠",
    "That was tricky! You're doing awesome! ⭐",
  ],
  milestone: [
    "Halfway there! You're crushing it! 🔥",
    'Great progress! Keep it up! 🎯',
    "You're on fire! 🌟",
    'Almost done! So proud of you! 💪',
  ],
};

export function getRandomEncouragement(
  type: 'correct' | 'incorrect' | 'milestone'
): string {
  const messages = ENCOURAGEMENT_MESSAGES[type];
  return messages[Math.floor(Math.random() * messages.length)];
}
