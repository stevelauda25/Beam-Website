import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'none';
  /**
   * How much of the element must be in view before it reveals, and how far
   * outside the viewport that test is allowed to reach.
   *
   * Both are optional and default to the values every existing caller has
   * always used, so the 24 untouched usages — ProblemSolution included — keep
   * the identical trigger. They exist for content that is expensive enough to
   * build that it should already be drawn by the time it is looked at.
   */
  amount?: number;
  margin?: string;
}

export default function FadeIn({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  amount = 0.2,
  margin,
}: FadeInProps) {
  const reduced = useReducedMotion();
  const initial =
    reduced || direction === 'none'
      ? { opacity: 1 }
      : { opacity: 0, y: 16 };

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={margin ? { once: true, amount, margin } : { once: true, amount }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
        delay: reduced ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}
