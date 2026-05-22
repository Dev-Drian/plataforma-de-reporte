"use client"

import { motion } from "framer-motion"
import { Loader2, Sparkles } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  text?: string
  variant?: "spinner" | "pulse" | "dots"
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
}

export default function LoadingSpinner({
  size = "md",
  className = "",
  text,
  variant = "spinner",
}: LoadingSpinnerProps) {
  if (variant === "dots") {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`${size === "sm" ? "w-2 h-2" : size === "md" ? "w-3 h-3" : "w-4 h-4"} rounded-full bg-primary`}
            animate={{
              y: [0, -10, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 0.6,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
        {text && <span className="ml-2 text-sm text-text-secondary">{text}</span>}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <motion.div
          className="relative"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <Sparkles className={`${sizeClasses[size]} text-primary`} />
        </motion.div>
        {text && <p className="mt-4 text-sm text-text-secondary">{text}</p>}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      >
        <Loader2 className={`${sizeClasses[size]} text-primary`} />
      </motion.div>
      {text && <p className="mt-4 text-sm text-text-secondary animate-pulse">{text}</p>}
    </div>
  )
}
