import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

export default function Card({ children, className = '', hover = false, glow = false }: CardProps) {
  const { colors } = useTheme()

  return (
    <motion.div
      className={`
        bg-surface
        border
        border-border
        rounded-2xl
        p-6
        shadow-sm
        ${glow ? 'shadow-lg' : ''}
        ${className}
      `}
      style={glow ? {
        boxShadow: `0 0 30px ${colors.primary}15`,
      } : {}}
      whileHover={hover ? {
        scale: 1.02,
        boxShadow: `0 10px 40px ${colors.primary}20`,
      } : {}}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}




