/**
 * 🎭 Motion Configuration
 * Unified animation settings for consistent UI experience
 * 
 * Design Philosophy:
 * - Apple/Linear/Notion inspired animations
 * - Subtle, not distracting
 * - Performance optimized
 */

// Standard animation durations
export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const;

// Easing functions
export const easing = {
  // Default - smooth and natural
  default: [0.25, 0.1, 0.25, 1],
  // For elements entering - starts slow
  easeOut: [0, 0, 0.2, 1],
  // For elements leaving - ends slow
  easeIn: [0.4, 0, 1, 1],
  // Bouncy feel
  spring: [0.43, 0.13, 0.23, 0.96],
  // Sharp and snappy
  sharp: [0.4, 0, 0.6, 1],
} as const;

// Spring physics configurations
export const spring = {
  // Gentle spring for most UI
  gentle: { type: 'spring', stiffness: 150, damping: 20 },
  // Snappy for quick responses
  snappy: { type: 'spring', stiffness: 300, damping: 25 },
  // Bouncy for playful elements
  bouncy: { type: 'spring', stiffness: 400, damping: 10 },
  // Soft for large elements
  soft: { type: 'spring', stiffness: 100, damping: 20 },
} as const;

/**
 * Page Transition Variants
 */
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

/**
 * Fade In Variants
 */
export const fadeInVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: duration.normal },
  },
  exit: { 
    opacity: 0,
    transition: { duration: duration.fast },
  },
};

/**
 * Slide Up Variants (for modals, toasts)
 */
export const slideUpVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.98,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

/**
 * Scale Variants (for cards, buttons on hover)
 */
export const scaleVariants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: spring.gentle,
  },
  exit: { 
    scale: 0.95, 
    opacity: 0,
    transition: { duration: duration.fast },
  },
  hover: { 
    scale: 1.02,
    transition: { duration: duration.fast },
  },
  tap: { 
    scale: 0.98,
    transition: { duration: duration.instant },
  },
};

/**
 * Stagger Children Variants (for lists)
 */
export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
};

/**
 * Card Hover Variants
 */
export const cardHoverVariants = {
  rest: {
    scale: 1,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  hover: {
    scale: 1.01,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: {
      duration: duration.fast,
      ease: easing.easeOut,
    },
  },
};

/**
 * Button Tap Animation
 */
export const buttonTapVariants = {
  rest: { scale: 1 },
  pressed: { 
    scale: 0.97,
    transition: { duration: duration.instant },
  },
};

/**
 * Skeleton Pulse Animation (for loading states)
 */
export const pulseAnimation = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Success Checkmark Animation
 */
export const checkmarkVariants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.3, ease: 'easeOut' },
      opacity: { duration: 0.1 },
    },
  },
};

/**
 * Number Counter Animation Config
 */
export const counterConfig = {
  duration: duration.slow,
  ease: easing.easeOut,
};
