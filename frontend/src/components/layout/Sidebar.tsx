"use client"

import { Link, useLocation } from "react-router-dom"
import { useTheme } from "../../contexts/ThemeContext"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { 
  LayoutDashboard, 
  Search, 
  TrendingUp, 
  Megaphone, 
  Link2, 
  Settings, 
  ChevronLeft,
  ChevronRight, 
  BarChart3,
  Sparkles,
  Share2
} from "lucide-react"

const Sidebar = () => {
  const location = useLocation()
  const { colors } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/seo", label: "SEO", icon: Search },
    { path: "/analytics", label: "Analytics", icon: TrendingUp },
    { path: "/ads", label: "Ads", icon: Megaphone },
    { path: "/gbp", label: "Business Profile", icon: BarChart3 },
    { path: "/accounts", label: "Accounts", icon: Link2 },
    { path: "/share-links", label: "Share Links", icon: Share2 },
    { path: "/settings", label: "Settings", icon: Settings },
  ]

  const sidebarVariants = {
    expanded: { width: "17rem" },
    collapsed: { width: "5.5rem" },
  }

  return (
    <motion.aside
      initial="expanded"
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col z-50 h-full bg-gradient-to-b from-surface/95 via-surface/90 to-surface/95 backdrop-blur-2xl border-r border-border/40 shadow-2xl overflow-visible"
      style={{
        boxShadow: `inset -1px 0 0 0 ${colors.primary}10, 4px 0 24px -4px rgba(0,0,0,0.1)`
      }}
    >
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="absolute z-50 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-2xl transition-all border-2 border-white/30 cursor-pointer"
        style={{
          right: "-24px",
          top: "3rem",
          zIndex: 9999,
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
          boxShadow: `0 8px 32px ${colors.primary}60, 0 0 0 4px rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)`,
          position: 'absolute',
        }}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <motion.div
          key={isCollapsed ? "collapsed" : "expanded"}
          initial={{ opacity: 0, rotate: isCollapsed ? -90 : 90 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {isCollapsed ? (
            <ChevronRight size={22} strokeWidth={2.5} />
          ) : (
            <ChevronLeft size={22} strokeWidth={2.5} />
          )}
        </motion.div>
      </motion.button>

      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <motion.div className="flex items-center gap-4 overflow-hidden">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
              boxShadow: `0 4px 16px ${colors.primary}20`
            }}
          >
            <motion.div
              className="absolute inset-0 opacity-30"
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
            <BarChart3 className="relative z-10 w-6 h-6" style={{ color: colors.primary }} />
            <motion.div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 50%, transparent 40%, ${colors.primary}10 100%)`,
              }}
            />
          </motion.div>

          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden flex-1"
              >
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-text whitespace-nowrap bg-gradient-to-r from-text to-text/80 bg-clip-text">
                    Monitor
                  </h1>
                  <Sparkles className="w-4 h-4 text-primary" style={{ color: colors.primary }} />
                </div>
                <div className="text-xs text-text-secondary/70 whitespace-nowrap font-medium mt-0.5">
                  Marketing Intelligence
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-6 overflow-y-auto">
        <ul className="space-y-1.5">
          {menuItems.map((item, index) => {
            const isActive =
              location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path))
            const Icon = item.icon

            return (
              <motion.li
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
              >
                <Link to={item.path} className="block">
                  <motion.div
                    whileHover={{ x: isCollapsed ? 0 : 6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 overflow-hidden group ${
                      isActive
                        ? "text-white font-semibold"
                        : "text-text-secondary hover:text-text"
                    }`}
                  >
                    {/* Active background with gradient */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                          boxShadow: `0 4px 16px ${colors.primary}40, inset 0 1px 0 0 rgba(255,255,255,0.1)`,
                        }}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                      />
                    )}

                    {/* Hover effect for inactive items */}
                    {!isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ 
                          background: `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}08)`,
                          border: `1px solid ${colors.primary}20`
                        }}
                      />
                    )}

                    {/* Left accent bar for active item */}
                    {isActive && (
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                        style={{
                          background: `linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))`,
                          boxShadow: `0 0 8px ${colors.primary}60`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    )}

                    {/* Content */}
                    <motion.div
                      className="relative z-10 flex items-center gap-3.5 w-full"
                      animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <motion.div
                        animate={isActive ? { rotate: [0, 5, -5, 0] } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        <Icon 
                          className={`shrink-0 ${isCollapsed ? "w-5 h-5" : "w-5 h-5"}`}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                      </motion.div>

                      <AnimatePresence mode="wait">
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0, x: -10 }}
                            animate={{ opacity: 1, width: "auto", x: 0 }}
                            exit={{ opacity: 0, width: 0, x: -10 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="whitespace-nowrap text-sm font-medium"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Notification badge */}
                    {item.path === "/accounts" && !isCollapsed && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute right-3 z-10 w-2 h-2 rounded-full bg-red-400 shadow-lg"
                        style={{ boxShadow: `0 0 8px rgba(248, 113, 113, 0.6)` }}
                      />
                    )}
                  </motion.div>
                </Link>
              </motion.li>
            )
          })}
        </ul>
      </nav>

      {/* Footer - Version Info */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
            className="px-4 pb-6"
          >
            <div 
              className="p-4 rounded-xl border backdrop-blur-sm"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}08)`,
                borderColor: `${colors.primary}20`
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-text">Version</div>
                <div className="text-xs font-bold text-primary" style={{ color: colors.primary }}>
                  v2.0.1
                </div>
              </div>
              <div className="text-[10px] text-text-secondary/60 font-medium">
                Last update: January 2026
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}

export default Sidebar
