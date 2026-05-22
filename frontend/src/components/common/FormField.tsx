import { ReactNode, InputHTMLAttributes, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  error?: string
  helperText?: string
  icon?: ReactNode
  rightIcon?: ReactNode
  as?: 'input' | 'textarea'
  rows?: number
}

const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(({
  label,
  error,
  helperText,
  icon,
  rightIcon,
  className = '',
  as = 'input',
  rows = 4,
  ...allProps
}, ref) => {
  const hasError = !!error
  const InputComponent = as === 'textarea' ? 'textarea' : 'input'
  
  // Check if 'value' prop was explicitly provided (even if undefined)
  // This distinguishes between Controller (value may be undefined) and register (no value prop)
  const hasValueProp = 'value' in allProps
  const value = allProps.value
  
  // Extract other props excluding value if it wasn't provided
  const { value: _, ...props } = allProps
  
  // Only set value prop if it was explicitly provided (for controlled inputs)
  // If value prop exists but is undefined, set it to empty string to avoid warning
  // If value prop doesn't exist, don't set it (allows react-hook-form register to work)
  const inputProps = hasValueProp ? { value: value ?? '' } : {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-background)' }}>
        {label}
        {props.required && <span className="text-error ml-1">*</span>}
      </label>

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

        <InputComponent
          ref={ref as any}
          className={`
            w-full
            ${icon ? 'pl-12' : 'pl-4'}
            ${rightIcon ? 'pr-12' : 'pr-4'}
            py-3
            bg-background
            border
            rounded-xl
            text-text
            placeholder:text-text-secondary/60
            focus:outline-none
            focus:ring-2
            transition-all
            duration-200
            ${hasError 
              ? 'border-error focus:ring-error/20' 
              : 'border-border focus:border-primary focus:ring-primary/20'
            }
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
          rows={as === 'textarea' ? rows : undefined}
          {...inputProps}
          {...(props as any)}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {rightIcon}
          </div>
        )}
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

FormField.displayName = 'FormField'

export default FormField

