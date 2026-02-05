/**
 * 🎬 Motion Components
 * Reusable animated components using Framer Motion
 */

'use client';

import React from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import {
  pageVariants,
  fadeInVariants,
  slideUpVariants,
  scaleVariants,
  staggerContainerVariants,
  staggerItemVariants,
  cardHoverVariants,
  pulseAnimation,
} from '../../lib/motion';

/**
 * Page Transition Wrapper
 * Wraps page content with smooth enter/exit animations
 */
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Fade In Component
 * Simple opacity fade with optional delay
 */
interface FadeInProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({ 
  children, 
  delay = 0,
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Slide Up Component
 * Slides content up while fading in
 */
interface SlideUpProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
}

export const SlideUp: React.FC<SlideUpProps> = ({ 
  children, 
  delay = 0,
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0, 0, 0.2, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Scale In Component
 * Scales up while fading in (good for cards, modals)
 */
interface ScaleInProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
}

export const ScaleIn: React.FC<ScaleInProps> = ({ 
  children, 
  delay = 0,
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.25, 
        delay,
        type: 'spring',
        stiffness: 150,
        damping: 20,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Stagger Container
 * Parent component for staggered child animations
 */
interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  staggerDelay?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({ 
  children,
  staggerDelay = 0.05,
  ...props 
}) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Stagger Item
 * Child component for staggered animations
 */
interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({ 
  children,
  ...props 
}) => {
  return (
    <motion.div
      variants={staggerItemVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Hover Card
 * Card with hover lift effect
 */
interface HoverCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

export const HoverCard: React.FC<HoverCardProps> = ({ 
  children,
  className = '',
  ...props 
}) => {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      variants={cardHoverVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * Press Button
 * Button with press feedback
 */
interface PressButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
}

export const PressButton: React.FC<PressButtonProps> = ({ 
  children,
  ...props 
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

/**
 * Skeleton Loader with Pulse Animation
 */
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '',
  width,
  height,
}) => {
  return (
    <motion.div
      className={`bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      style={{ width, height }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

/**
 * Animated Number Counter
 */
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatValue?: (value: number) => string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 0.5,
  formatValue = (v) => Math.round(v).toLocaleString(),
  className = '',
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const startValue = displayValue;
    const difference = value - startValue;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + difference * easeOut);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span className={className}>{formatValue(displayValue)}</span>;
};

/**
 * Presence Wrapper for AnimatePresence
 */
interface PresenceProps {
  children: React.ReactNode;
  show: boolean;
}

export const Presence: React.FC<PresenceProps> = ({ children, show }) => {
  return (
    <AnimatePresence mode="wait">
      {show && children}
    </AnimatePresence>
  );
};

export default PageTransition;
