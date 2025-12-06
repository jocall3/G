import React, { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';

// Define the animation variants based on Covenant 47: Motion as Storytelling.
// We aim for a subtle, graceful entrance that doesn't distract but enhances the narrative flow.
const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20, // Start slightly below the final position
    scale: 0.98, // Slight scale down for a gentle "pop" effect
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6, // A smooth, medium-speed transition
      ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier for a natural feel (Material Design standard)
    },
  },
};

/**
 * Props for the FadeIn component.
 */
interface FadeInProps {
  /** The content to be animated. */
  children: ReactNode;
  /** Optional delay before the animation starts (in seconds). */
  delay?: number;
  /** Optional duration override for the animation (in seconds). */
  duration?: number;
  /** Optional class name for styling the container. */
  className?: string;
  /** Optional key for triggering re-animation when content changes. */
  key?: string | number;
}

/**
 * A reusable animation component that gracefully introduces new elements
 * to the view using a subtle fade-in and slight upward motion.
 *
 * Embodies Covenant 47: Motion as a Storytelling Device.
 *
 * @param {FadeInProps} props - The component props.
 * @returns {JSX.Element} The animated container.
 */
export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration,
  className,
  key,
}) => {
  // Create dynamic variants to allow duration override
  const dynamicVariants: Variants = {
    hidden: fadeInVariants.hidden,
    visible: {
      ...fadeInVariants.visible,
      transition: {
        ...fadeInVariants.visible.transition,
        delay: delay,
        ...(duration !== undefined && { duration: duration }),
      },
    },
  };

  return (
    <motion.div
      key={key}
      initial="hidden"
      animate="visible"
      variants={dynamicVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Default export for convenience
export default FadeIn;