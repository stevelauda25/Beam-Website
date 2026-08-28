import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'none';
}

export default function FadeIn({
  children,
  className = '',
  delay = 0,
  direction = 'up',
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
      viewport={{ once: true, amount: 0.2 }}
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
