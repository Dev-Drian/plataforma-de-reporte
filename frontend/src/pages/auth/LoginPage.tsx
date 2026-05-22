"use client"

import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../../hooks/useAuth"
import { useStore } from "../../store/useStore"
import { loginSchema, type LoginFormData } from "../../utils/validation"
import { Alert } from "../../components/common"
import ParticlesBackground from "../../components/common/ParticlesBackground"
import { useNavigate } from "react-router-dom"
import { 
  Mail, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  User, 
  Shield, 
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react"

export default function LoginPage() {
  const { login, loading, error, clearError } = useAuth()
  const { user } = useStore()
  const navigate = useNavigate()
  const [alert, setAlert] = useState<{ type: "error"; message: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showTestCredentials, setShowTestCredentials] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    trigger,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (error) {
      setAlert({ type: "error", message: error })
    } else {
      setAlert(null)
    }
  }, [error])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token && user) {
      navigate("/", { replace: true })
    }
  }, [user, navigate])

  const onSubmit = async (data: LoginFormData) => {
    clearError()
    try {
      await login(data)
    } catch (err) {
      console.error("Login error:", err)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form (White) */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 bg-white flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden"
      >
        {/* Back to Home Link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate("/")}
          className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to home</span>
        </motion.button>

        <div className="w-full max-w-md">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.2,
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
            className="mb-10"
          >
            <motion.h1 
              className="text-5xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              Sign In
            </motion.h1>
            <motion.p 
              className="text-gray-600 text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Access your Monitor account
            </motion.p>
          </motion.div>

          {/* Error Alert */}
          <AnimatePresence mode="wait">
            {alert && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <Alert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => {
                    setAlert(null)
                    clearError()
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: 0.5,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <motion.div 
                      className="relative"
                      whileFocus={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors" />
                      <motion.input
                        {...field}
                        type="email"
                        placeholder="email@example.com"
                        disabled={loading}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md"
                        whileFocus={{ scale: 1.01 }}
                      />
                    </motion.div>
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: 0.6,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
            >
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <motion.div 
                      className="relative"
                      whileFocus={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors" />
                      <motion.input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        disabled={loading}
                        className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md"
                        whileFocus={{ scale: 1.01 }}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </motion.button>
                    </motion.div>
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                )}
              />
            </motion.div>

            {/* Remember Me & Forgot Password */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-between"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Forgot your password?
              </button>
            </motion.div>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.8,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
            >
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ 
                  scale: loading ? 1 : 1.03,
                  boxShadow: loading ? undefined : "0 10px 25px rgba(37, 99, 235, 0.4)"
                }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      Sign In
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.div>
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>
          </form>

          {/* Test Credentials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.9,
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
            className="mt-8"
          >
            <motion.button
              onClick={() => setShowTestCredentials(!showTestCredentials)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Test credentials</span>
              </div>
              <motion.div
                animate={{ rotate: showTestCredentials ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRight className="w-4 h-4 text-gray-600 rotate-90" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {showTestCredentials && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 space-y-2 overflow-hidden"
                >
                  {[
                    { role: "Admin", email: "admin@demo.com", pass: "admin123", icon: Shield },
                    { role: "User", email: "user@demo.com", pass: "user123", icon: User },
                  ].map((cred, index) => (
                    <motion.button
                      key={index}
                      type="button"
                      onClick={async () => {
                        setValue("email", cred.email, { shouldValidate: true, shouldDirty: true })
                        setValue("password", cred.pass, { shouldValidate: true, shouldDirty: true })
                        await trigger(["email", "password"])
                        if (alert) {
                          setAlert(null)
                          clearError()
                        }
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <cred.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{cred.role}</div>
                        <div className="text-xs text-gray-500 font-mono">{cred.email}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Register Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <button className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Register here
              </button>
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Branding (Blue) */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          duration: 0.8,
          type: "spring",
          stiffness: 50,
          damping: 20
        }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden"
      >
        {/* Particles Background - Mejorado */}
        <ParticlesBackground 
          intensity="high" 
          color="rgba(255, 255, 255, 0.5)"
          className="z-0"
        />

        {/* Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-10 z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo and Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.3,
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
          >
            <div className="flex items-center gap-3 mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring", 
                  bounce: 0.6, 
                  duration: 1,
                  delay: 0.4
                }}
                whileHover={{ 
                  scale: 1.1, 
                  rotate: 360,
                  transition: { duration: 0.6 }
                }}
                className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                  }}
                  transition={{ 
                    duration: 20, 
                    repeat: Infinity, 
                    ease: "linear" 
                  }}
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-3xl font-bold">Monitor</h2>
                <p className="text-blue-100 text-sm">Marketing Intelligence</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Welcome Message */}
          <div className="flex-1 flex items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.5,
                type: "spring",
                stiffness: 80,
                damping: 15,
                duration: 0.8
              }}
            >
              <motion.h1 
                className="text-6xl font-bold mb-6 leading-tight"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: 0.6,
                  type: "spring",
                  stiffness: 150
                }}
              >
                Welcome to Monitor
              </motion.h1>
              <motion.p 
                className="text-blue-100 text-xl mb-8 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Manage your reports and metrics intelligently
              </motion.p>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.8,
              type: "spring",
              stiffness: 100
            }}
            className="text-blue-100 text-sm"
          >
            © {new Date().getFullYear()} Monitor - Marketing Intelligence
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
