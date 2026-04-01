import { ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  footer?: ReactNode
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  footer
}: ModalProps) {
  const { colors } = useTheme()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: 'spring', damping: 25 }}
              className={`
                ${sizeClasses[size]}
                w-full
                bg-surface
                border
                border-border
                rounded-2xl
                shadow-2xl
                pointer-events-auto
                max-h-[90vh]
                flex
                flex-col
                overflow-hidden
              `}
              style={{
                boxShadow: `0 20px 60px ${colors.primary}10`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border bg-surface shrink-0">
                <h2 className="text-xl font-semibold text-text">{title}</h2>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-background transition-colors text-text-secondary hover:text-text"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="p-6 border-t border-border bg-surface shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
