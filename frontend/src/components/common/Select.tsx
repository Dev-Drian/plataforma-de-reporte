import { SelectHTMLAttributes, ReactNode, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  helperText?: string
  icon?: ReactNode
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  icon,
  options,
  placeholder = 'Select an option',
  className = '',
  ...props
}, ref) => {
  const hasError = !!error

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <label className="block text-sm font-medium text-text mb-2">
        {label}
        {props.required && <span className="text-error ml-1">*</span>}
      </label>

      <motion.div
        className="relative"
        whileFocus={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary z-10">
            {icon}
          </div>
        )}

        <select
          ref={ref}
          className={`
            w-full
            ${icon ? 'pl-12' : 'pl-4'}
            pr-10
            py-3
            bg-background
            border
            rounded-xl
            text-text
            focus:outline-none
            focus:ring-2
            transition-all
            duration-200
            appearance-none
            cursor-pointer
            ${hasError 
              ? 'border-error focus:ring-error/20' 
              : 'border-border focus:border-primary focus:ring-primary/20'
            }
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-text-secondary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-sm text-error flex items-center gap-2"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </motion.p>
        )}
        {helperText && !error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-xs text-text-secondary"
          >
            {helperText}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

Select.displayName = 'Select'

export default Select

