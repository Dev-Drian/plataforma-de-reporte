import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface AnimatedContainerProps {
  children: ReactNode
  delay?: number
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade'
}

export default function AnimatedContainer({ 
  children, 
  delay = 0, 
  className = '',
  direction = 'fade'
}: AnimatedContainerProps) {
  const getInitial = () => {
    switch (direction) {
      case 'up':
        return { y: 30, opacity: 0 }
      case 'down':
        return { y: -30, opacity: 0 }
      case 'left':
        return { x: -30, opacity: 0 }
      case 'right':
        return { x: 30, opacity: 0 }
      default:
        return { opacity: 0 }
    }
  }

  const getAnimate = () => {
    switch (direction) {
      case 'up':
      case 'down':
        return { y: 0, opacity: 1 }
      case 'left':
      case 'right':
        return { x: 0, opacity: 1 }
      default:
        return { opacity: 1 }
    }
  }

  return (
    <motion.div
      initial={getInitial()}
      animate={getAnimate()}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}




