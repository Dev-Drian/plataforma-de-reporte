"use client"

import type { ReactNode } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import { motion } from "framer-motion"

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar with animation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <Header />

        {/* Main content with page transition */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 md:p-6 lg:p-8"
        >
          <div className="max-w-7xl mx-auto">{children}</div>
        </motion.main>
      </div>
    </div>
  )
}

export default Layout
