import { InputHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  error?: string
  rightIcon?: ReactNode
}

export default function Input({
  label,
  icon,
  error,
  rightIcon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text mb-2">
          {label}
        </label>
      )}
      <motion.div
        className="relative"
        whileFocus={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full
            ${icon ? 'pl-12' : 'pl-4'}
            ${rightIcon ? 'pr-12' : 'pr-4'}
            py-3
            bg-background
            border
            rounded-xl
            text-text
            placeholder:text-text-secondary
            focus:outline-none
            focus:ring-2
            transition-all
            ${error ? 'border-error' : 'border-border focus:border-primary'}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {rightIcon}
          </div>
        )}
      </motion.div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-error flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </motion.p>
      )}
    </div>
  )
}

