"use client"

import { useStore } from "../../store/useStore"
import { useTheme } from "../../contexts/ThemeContext"
import { useAuth } from "../../hooks/useAuth"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { LogOut, ChevronDown, Building2, Mail, Shield } from "lucide-react"

const Header = () => {
  const { user } = useStore()
  const { logout } = useAuth()
  const { colors } = useTheme()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-surface/70 backdrop-blur-xl shadow-sm border-b border-border/50 sticky top-0 z-10"
    >
      <div className="flex justify-between items-center px-6 py-4">
        {/* Left Section - Title */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <h1 className="text-xl font-bold text-text bg-gradient-to-r from-text to-text-secondary bg-clip-text">
            Monitor
          </h1>
          {user?.organization_name && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-text-secondary flex items-center gap-1.5 mt-0.5"
            >
              <Building2 size={14} />
              {user.organization_name}
            </motion.p>
          )}
        </motion.div>

        {/* Right Section - User Menu */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4"
        >
          {user && (
            <div className="relative">
              {/* User Menu Button */}
              <motion.button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-all"
              >
                {/* Avatar */}
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: colors.primary }}
                >
                  {user.first_name?.charAt(0)}
                  {user.last_name?.charAt(0)}
                </motion.div>

                {/* User Info */}
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-text leading-tight">
                    {user.first_name} {user.last_name}
                  </p>
                  {user.roles && user.roles.length > 0 && (
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <Shield size={10} />
                      {user.roles[0].charAt(0).toUpperCase() + user.roles[0].slice(1)}
                    </p>
                  )}
                </div>

                {/* Dropdown Icon */}
                <motion.div animate={{ rotate: isUserMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} className="text-text-secondary" />
                </motion.div>
              </motion.button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />

                    {/* Menu */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl overflow-hidden z-50 border"
                      style={{
                        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.95))`,
                        backdropFilter: 'blur(20px)',
                        borderColor: `${colors.primary}20`,
                        boxShadow: `0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)`
                      }}
                    >
                      {/* Animated background gradient */}
                      <motion.div
                        className="absolute inset-0 opacity-30"
                        style={{
                          background: `radial-gradient(circle at 50% 0%, ${colors.primary}15, transparent 70%)`,
                        }}
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.3, 0.4, 0.3],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />

                      {/* User Info Header */}
                      <div className="relative p-5 border-b" style={{ borderColor: `${colors.primary}15` }}>
                        <div className="flex items-center gap-3 mb-4">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ duration: 0.2 }}
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg relative overflow-hidden"
                            style={{ 
                              backgroundColor: colors.primary,
                              boxShadow: `0 4px 16px ${colors.primary}40`
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
                            <span className="relative z-10">
                              {user.first_name?.charAt(0)}
                              {user.last_name?.charAt(0)}
                            </span>
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-text leading-tight">
                              {user.first_name} {user.last_name}
                            </p>
                            {user.roles && user.roles.length > 0 && (
                              <p className="text-xs text-text-secondary flex items-center gap-1.5 mt-1">
                                <Shield size={12} style={{ color: colors.primary }} />
                                <span className="truncate">
                                  {user.roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", ")}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div 
                          className="flex items-center gap-2 text-xs text-text-secondary rounded-xl p-3"
                          style={{
                            background: `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}08)`,
                            border: `1px solid ${colors.primary}15`
                          }}
                        >
                          <Mail size={14} style={{ color: colors.primary }} />
                          <span className="truncate font-medium">{user.email}</span>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="relative p-2">
                        <motion.button
                          onClick={handleLogout}
                          whileHover={{ x: 4, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all group relative overflow-hidden"
                          style={{
                            color: colors.error,
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `${colors.error}12`
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent"
                          }}
                        >
                          {/* Hover background */}
                          <motion.div
                            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              background: `linear-gradient(135deg, ${colors.error}10, ${colors.error}05)`,
                              border: `1px solid ${colors.error}20`
                            }}
                          />
                          <LogOut size={18} className="group-hover:rotate-12 transition-transform relative z-10" />
                          <span className="relative z-10">Log Out</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </motion.header>
  )
}

export default Header
