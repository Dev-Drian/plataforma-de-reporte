import { motion } from "framer-motion"
import { AlertCircle, X } from "lucide-react"

interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
  className?: string
}

export default function ErrorMessage({ 
  message, 
  onDismiss,
  className = '' 
}: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-xl border backdrop-blur-sm ${className}`}
      style={{
        background: `linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.05))`,
        borderColor: `rgba(239, 68, 68, 0.25)`,
        boxShadow: `0 4px 16px rgba(239, 68, 68, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`
      }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 20% 50%, rgba(239, 68, 68, 0.15), transparent 50%)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative flex items-start gap-4 p-4">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.5 }}
          className="flex-shrink-0 mt-0.5"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.15))`,
              boxShadow: `0 2px 8px rgba(239, 68, 68, 0.2)`
            }}
          >
            <AlertCircle 
              className="w-5 h-5 text-red-500" 
              strokeWidth={2.5}
            />
          </div>
        </motion.div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm font-semibold text-red-600 dark:text-red-400 leading-relaxed"
          >
            {message}
          </motion.p>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <motion.button
            onClick={onDismiss}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-red-500/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.4), transparent)`,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />
    </motion.div>
  )
}

