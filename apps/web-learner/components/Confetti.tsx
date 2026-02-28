'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const CONFETTI_COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

/**
 * Full-screen confetti celebration overlay.
 * Renders 50 falling particles with random positions, colors and rotations.
 * Pointer-events are disabled so the underlying page remains interactive.
 */
export function Confetti() {
  const [particles, setParticles] = useState<
    { id: number; x: number; color: string; delay: number; rotation: number }[]
  >([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 2,
      rotation: Math.random() * 360,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ y: -20, x: `${particle.x}vw`, rotate: 0, opacity: 1 }}
          animate={{ y: '100vh', rotate: particle.rotation * 3, opacity: 0 }}
          transition={{ duration: 3 + Math.random() * 2, delay: particle.delay, ease: 'linear' }}
          className="absolute w-3 h-3"
          style={{
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
}
