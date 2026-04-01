import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { Shield, Home, LogOut } from 'lucide-react'

export default function UnauthorizedPage() {
  const navigate = useNavigate()
  const { colors } = useTheme()

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-surface flex items-center justify-center p-4">
      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.error || '#ef4444' }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.primary }}
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Main 401 Display */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <div className="inline-block relative">
            <h1 
              className="text-[120px] md:text-[160px] font-black leading-none"
              style={{
                background: `linear-gradient(135deg, ${colors.error || '#ef4444'}, ${colors.primary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              401
            </h1>
            <motion.div
              className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl"
              style={{ backgroundColor: `${colors.error || '#ef4444'}30` }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </div>
        </motion.div>

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 flex justify-center"
        >
          <motion.div
            className="relative"
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div 
              className="w-32 h-32 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{ 
                backgroundColor: `${colors.error || '#ef4444'}15`,
                boxShadow: `0 0 40px ${colors.error || '#ef4444'}30`,
              }}
            >
              <motion.div
                className="absolute inset-0 opacity-20"
                style={{
                  background: `linear-gradient(135deg, ${colors.error || '#ef4444'}, ${colors.primary})`,
                }}
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <Shield className="w-16 h-16 relative z-10" style={{ color: colors.error || '#ef4444' }} />
            </div>
            <motion.div
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full"
              style={{ backgroundColor: colors.error || '#ef4444' }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            Unauthorized Access
          </h2>
          <p className="text-lg text-text-secondary max-w-md mx-auto leading-relaxed">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
        >
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              boxShadow: `0 4px 16px ${colors.primary}40`
            }}
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </motion.button>
          
          <motion.button
            onClick={() => {
              localStorage.removeItem('token')
              navigate('/login')
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border transition-all bg-surface/50 hover:bg-surface"
            style={{
              borderColor: `${colors.primary}30`,
              color: 'var(--text)'
            }}
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </motion.button>
        </motion.div>

        {/* Additional Help */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="pt-8 border-t border-border"
        >
          <p className="text-sm text-text-secondary">
            Need help?{' '}
            <a 
              href="#" 
              className="font-medium hover:underline transition-colors"
              style={{ color: colors.primary }}
              onClick={(e) => {
                e.preventDefault()
                navigate('/settings')
              }}
            >
              Contact support
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}




