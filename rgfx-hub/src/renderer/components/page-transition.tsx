import { motion, type Transition, type Variants } from 'framer-motion';
import React, { type ReactNode } from 'react';

const pageVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

const pageTransition: Transition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.2,
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
}
