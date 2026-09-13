import { motion } from 'motion/react';
import { Button } from '@/components/ui/button.jsx';

/** Local Animate UI-style source component for consistent spring interactions. */
export function AnimatedButton({ children, ...props }) {
  return (
    <motion.div whileHover={{ scale: 1.025 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 480, damping: 25 }}>
      <Button {...props}>{children}</Button>
    </motion.div>
  );
}
