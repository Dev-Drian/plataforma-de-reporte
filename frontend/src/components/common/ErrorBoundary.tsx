import { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// Wrapper component to use hooks
function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { colors } = useTheme()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-surface/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-lg w-full relative overflow-hidden rounded-3xl border backdrop-blur-xl shadow-2xl"
        style={{
          background: `linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))`,
          borderColor: `rgba(239, 68, 68, 0.2)`,
          boxShadow: `0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(239, 68, 68, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)`
        }}
      >
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 30% 20%, rgba(239, 68, 68, 0.3), transparent 50%)`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="relative p-8 md:p-10">
          <div className="text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
              className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))`,
                boxShadow: `0 8px 24px rgba(239, 68, 68, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)`
              }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >
                <AlertTriangle 
                  className="w-10 h-10 text-red-500" 
                  strokeWidth={2}
                />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-text mb-3 bg-gradient-to-r from-text to-text/80 bg-clip-text"
            >
              Something went wrong
            </motion.h2>

            {/* Error message */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-text-secondary mb-8 leading-relaxed"
            >
              {error?.message || 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
            </motion.p>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <motion.button
                onClick={() => window.location.reload()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  boxShadow: `0 4px 16px ${colors.primary}40`
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </motion.button>
              <motion.button
                onClick={onReset}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border transition-all bg-surface/50 hover:bg-surface"
                style={{
                  borderColor: `${colors.primary}30`,
                  color: 'var(--text)'
                }}
              >
                <Home className="w-4 h-4" />
                Go Home
              </motion.button>
            </motion.div>

            {/* Error details (collapsible) */}
            {error && (
              <motion.details
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-left"
              >
                <summary className="cursor-pointer text-sm text-text-secondary hover:text-text transition-colors mb-2">
                  Error Details
                </summary>
                <div className="mt-3 p-4 rounded-lg bg-background/50 border border-border/50">
                  <code className="text-xs text-text-secondary font-mono break-all">
                    {error.stack || error.toString()}
                  </code>
                </div>
              </motion.details>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

export default ErrorBoundary

