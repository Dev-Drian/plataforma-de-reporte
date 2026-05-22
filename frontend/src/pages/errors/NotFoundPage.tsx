import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { Home, ArrowLeft, HelpCircle } from 'lucide-react'
import ParticlesBackground from '../../components/common/ParticlesBackground'
import AnimatedContainer from '../../components/common/AnimatedContainer'
import Button from '../../components/common/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { colors } = useTheme()

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-surface">
      {/* Particles Background */}
      <div className="absolute inset-0 z-0">
        <ParticlesBackground intensity="low" />
      </div>

      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.primary }}
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
          style={{ backgroundColor: colors.accent }}
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

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <AnimatedContainer direction="up" delay={0.2} className="max-w-2xl w-full text-center">
          {/* Main 404 Display */}
          <motion.div
            className="mb-8"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          >
            <div className="inline-block relative">
              <h1 
                className="text-[120px] md:text-[160px] font-black leading-none"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                404
              </h1>
              <motion.div
                className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl"
                style={{ backgroundColor: `${colors.accent}30` }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
              <motion.div
                className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full blur-xl"
                style={{ backgroundColor: `${colors.primary}30` }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: 0.5,
                }}
              />
            </div>
          </motion.div>

          {/* Illustration/Icon */}
          <AnimatedContainer direction="up" delay={0.6}>
            <div className="mb-8 flex justify-center">
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
                    backgroundColor: `${colors.primary}15`,
                    boxShadow: `0 0 40px ${colors.primary}30`,
                  }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
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
                  <HelpCircle className="w-16 h-16 relative z-10" style={{ color: colors.primary }} strokeWidth={1.5} />
                </div>
                <motion.div
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full"
                  style={{ backgroundColor: colors.accent }}
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
            </div>
          </AnimatedContainer>

          {/* Message */}
          <AnimatedContainer direction="up" delay={0.8}>
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
                Page Not Found
              </h2>
              <p className="text-lg text-text-secondary max-w-md mx-auto leading-relaxed">
                Sorry, the page you're looking for doesn't exist or has been moved to another location.
              </p>
            </div>
          </AnimatedContainer>

          {/* Action Buttons */}
          <AnimatedContainer direction="up" delay={1}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                onClick={() => navigate('/')}
                size="lg"
              >
                <span className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Go to Dashboard
                </span>
              </Button>
              
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                size="lg"
              >
                <span className="flex items-center gap-2">
                  <ArrowLeft className="w-5 h-5" />
                  Go Back
                </span>
              </Button>
            </div>
          </AnimatedContainer>

          {/* Additional Help */}
          <AnimatedContainer direction="up" delay={1.2}>
            <div className="pt-8 border-t border-border">
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
            </div>
          </AnimatedContainer>
        </AnimatedContainer>
      </div>
    </div>
  )
}
