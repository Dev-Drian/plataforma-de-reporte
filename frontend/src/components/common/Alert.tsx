"use client"

import { motion, AnimatePresence } from "framer-motion"
import { type ReactNode, useState } from "react"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react"

export type AlertType = "success" | "error" | "warning" | "info"

interface AlertProps {
  type?: AlertType
  title?: string
  message: string
  onClose?: () => void
  duration?: number
  className?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

const alertStyles = {
  success: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-800 dark:text-green-200",
    iconBg: "bg-green-500",
    iconColor: "text-white",
  },
  error: {
    bg: "bg-red-600 dark:bg-red-700",
    border: "border-red-700 dark:border-red-600",
    text: "text-white",
    iconBg: "bg-white/20",
    iconColor: "text-white",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    iconBg: "bg-amber-500",
    iconColor: "text-white",
  },
  info: {
    bg: "bg-sky-500",
    border: "border-sky-400",
    text: "text-white",
    iconBg: "bg-white/20",
    iconColor: "text-white",
  },
}

const defaultIcons = {
  success: <CheckCircle2 className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
}

export default function Alert({ type = "info", title, message, onClose, className = "", icon, action }: AlertProps) {
  const styles = alertStyles[type]
  const displayIcon = icon || defaultIcons[type]

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`
        ${styles.bg} ${styles.border} ${styles.text}
        border-2 rounded-2xl p-5 shadow-2xl backdrop-blur-sm
        ${className}
      `}
    >
      <div className="flex items-start gap-4">
        <motion.div
          className={`${styles.iconBg} ${styles.iconColor} rounded-xl p-2.5 flex-shrink-0 shadow-lg`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.1 }}
        >
          {displayIcon}
        </motion.div>
        <div className="flex-1 min-w-0 pt-0.5">
          {title && (
            <motion.h4
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`font-bold mb-1.5 text-base ${styles.text}`}
            >
              {title}
            </motion.h4>
          )}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`text-sm leading-relaxed ${styles.text} mb-3 font-medium`}
          >
            {message}
          </motion.p>
          {action && (
            <motion.button
              onClick={action.onClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`${styles.iconBg} text-white px-4 py-2 rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all`}
            >
              {action.label}
            </motion.button>
          )}
        </div>
        {onClose && (
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0 p-1.5 rounded-lg hover:bg-black/10`}
            aria-label="Close alert"
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export function useAlert() {
  const [alerts, setAlerts] = useState<Array<AlertProps & { id: string }>>([])

  const showAlert = (alert: Omit<AlertProps, "onClose">) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newAlert = { ...alert, id, onClose: () => removeAlert(id) }

    setAlerts((prev) => [...prev, newAlert])

    if (alert.duration && alert.duration > 0) {
      setTimeout(() => removeAlert(id), alert.duration)
    }
  }

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }

  const AlertContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-3 w-full max-w-md pointer-events-none">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <div key={alert.id} className="pointer-events-auto">
            <Alert {...alert} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )

  return { showAlert, AlertContainer }
}
