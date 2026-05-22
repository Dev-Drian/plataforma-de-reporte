"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Search, X, Filter, Trash2, RotateCcw } from "lucide-react"
import { Card, Button } from "../../../components/common"

interface AccountsSearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedPlatform: string
  onPlatformChange: (platform: string) => void
  selectedStatus: string
  onStatusChange: (status: string) => void
  platforms: string[]
  selectedCount: number
  onBulkDelete: () => void
  totalAccounts: number
  filteredCount: number
  deleting: boolean
  onClearFilters?: () => void
}

export default function AccountsSearchBar({
  searchQuery,
  onSearchChange,
  selectedPlatform,
  onPlatformChange,
  selectedStatus,
  onStatusChange,
  platforms,
  selectedCount,
  onBulkDelete,
  totalAccounts,
  filteredCount,
  deleting,
  onClearFilters,
}: AccountsSearchBarProps) {
  // const _getPlatformIcon = (_platform: string) => {
  //   // Return null to use platform name only, or add SVG icons if needed
  //   return null
  // }

  return (
    <Card className="p-5 border-2 border-border">
      <div className="space-y-4">
        {/* Top Row: Search and Bulk Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <motion.div className="flex-1 min-w-0" whileFocus={{ scale: 1.01 }}>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-background border-2 border-border rounded-xl text-text placeholder-text-secondary focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSearchChange("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text transition-colors p-1 rounded-lg hover:bg-background"
                    aria-label="Clear search"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={onBulkDelete}
                  variant="outline"
                  size="sm"
                  disabled={deleting}
                  className="h-full hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 whitespace-nowrap flex-shrink-0 font-semibold border-2 bg-transparent"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete ({selectedCount})
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filters Row - More visual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Clear Filters Button - Show when filters are active */}
          {(searchQuery || selectedPlatform !== "all" || selectedStatus !== "all") && onClearFilters && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="sm:col-span-2 flex justify-end"
            >
              <Button
                onClick={onClearFilters}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-xs hover:bg-background"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </Button>
            </motion.div>
          )}
          {/* Platform Filter */}
          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
            <label className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">
              <Filter className="w-3.5 h-3.5" />
              Platform
            </label>
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => onPlatformChange(e.target.value)}
                className="w-full pl-4 pr-10 py-3.5 bg-background border-2 border-border rounded-xl text-text focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium appearance-none cursor-pointer hover:border-primary/50"
              >
                <option value="all">All Platforms</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform} className="capitalize">
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </option>
                ))}
              </select>
              <motion.div
                animate={{ y: [0, 2, 0] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </div>
          </motion.div>

          {/* Status Filter */}
          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
            <label className="flex items-center gap-2 text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">
              <Filter className="w-3.5 h-3.5" />
              Status
            </label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full pl-4 pr-10 py-3.5 bg-background border-2 border-border rounded-xl text-text focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium appearance-none cursor-pointer hover:border-primary/50"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <motion.div
                animate={{ y: [0, 2, 0] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Results summary with better visual feedback */}
        <motion.div
          layout
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t-2 border-border"
        >
          <motion.div
            className="flex items-center gap-2 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-text-secondary">Showing</span>
            <motion.span
              key={filteredCount}
              initial={{ scale: 1.3, color: "#3b82f6" }}
              animate={{ scale: 1, color: "inherit" }}
              className="font-bold text-lg text-primary"
            >
              {filteredCount}
            </motion.span>
            <span className="text-text-secondary">of</span>
            <span className="font-bold text-lg text-text">{totalAccounts}</span>
            <span className="text-text-secondary">account{totalAccounts !== 1 ? "s" : ""}</span>
          </motion.div>
          <AnimatePresence>
            {selectedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="px-4 py-2 rounded-xl bg-primary/10 border-2 border-primary/30"
              >
                <span className="text-primary font-bold text-sm">
                  {selectedCount} selected
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </Card>
  )
}
