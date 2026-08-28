import { useReducedMotion } from 'framer-motion';

export type MotionVariant = {
  hidden: Record<string, number | string>;
  visible: Record<string, number | string>;
};

export const fadeInUp = (enabled = true): MotionVariant => ({
  hidden: enabled ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
});

export const fadeIn = (enabled = true): MotionVariant => ({
  hidden: enabled ? { opacity: 0 } : { opacity: 1 },
  visible: { opacity: 1 },
});

export const staggerContainer = (enabled = true) => ({
  hidden: {},
  visible: {
    transition: enabled ? { staggerChildren: 0.08 } : {},
  },
});

export function useMotionPreference() {
  const reduced = useReducedMotion();
  return !reduced;
}
