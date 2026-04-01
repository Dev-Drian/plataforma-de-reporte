import { ReactNode } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const { colors } = useTheme()

  const baseStyles = 'font-semibold rounded-xl transition-all relative overflow-hidden'
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  const variantStyles = {
    primary: 'text-white shadow-lg hover:shadow-xl',
    secondary: 'text-white shadow-lg hover:shadow-xl',
    outline: 'border-2',
    ghost: 'hover:bg-opacity-10',
  }

  const getBackgroundColor = () => {
    if (variant === 'primary') return colors.primary
    if (variant === 'secondary') return colors.secondary
    if (variant === 'outline') return 'transparent'
    return 'transparent'
  }

  const getTextColor = () => {
    if (variant === 'outline' || variant === 'ghost') {
      return variant === 'outline' ? colors.primary : colors.text
    }
    return 'white'
  }

  const getBorderColor = () => {
    if (variant === 'outline') return colors.primary
    return 'transparent'
  }

  const isDisabled = disabled || loading

  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      disabled={isDisabled}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
        borderColor: getBorderColor(),
      }}
      {...props}
    >
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </motion.div>
      )}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </motion.button>
  )
}
