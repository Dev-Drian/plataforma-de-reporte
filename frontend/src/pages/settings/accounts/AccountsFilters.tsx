"use client"

import { Search, X, Trash2 } from "lucide-react"

interface AccountsFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedPlatform: string
  onPlatformChange: (platform: string) => void
  selectedStatus: string
  onStatusChange: (status: string) => void
  platforms: Array<{ name: string; icon: string; color: string; count: number }>
  selectedCount: number
  onBulkDelete: () => void
  totalAccounts: number
  filteredCount: number
  deleting: boolean
  onClearFilters?: () => void
  stats: {
    total: number
    active: number
    inactive: number
  }
}

// Small SVG Icons for filter pills
const PlatformIconSmall = ({ platform }: { platform: string }) => {
  const icons: Record<string, JSX.Element> = {
    google: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    meta: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#0081FB"/>
      </svg>
    ),
    linkedin: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
      </svg>
    ),
    tiktok: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
      </svg>
    ),
  }
  return icons[platform] || null
}

export default function AccountsFilters({
  searchQuery,
  onSearchChange,
  selectedPlatform,
  onPlatformChange,
  selectedStatus,
  onStatusChange,
  platforms,
  selectedCount,
  onBulkDelete,
  filteredCount,
  deleting,
  onClearFilters,
  stats,
}: AccountsFiltersProps) {
  const hasActiveFilters = searchQuery || selectedPlatform !== "all" || selectedStatus !== "all"

  return (
    <div className="space-y-3">
      {/* Search and Actions Row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-surface/40 border border-border/30 rounded-lg text-text placeholder-text-secondary/40 focus:outline-none focus:border-primary/40 focus:bg-surface/60 transition-all duration-150"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary/40 hover:text-text rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 py-2 text-xs font-medium text-text-secondary hover:text-text bg-surface/40 hover:bg-surface/60 border border-border/30 rounded-lg transition-all duration-150"
          >
            Reset
          </button>
        )}

        {/* Bulk Delete */}
        {selectedCount > 0 && (
          <button
            onClick={onBulkDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-red-600 dark:hover:text-red-400 bg-surface/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-border/30 hover:border-red-200/50 dark:hover:border-red-800/30 rounded-lg transition-all duration-150 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete {selectedCount}</span>
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Platform Filter */}
        <div className="inline-flex items-center gap-0.5 p-0.5 bg-surface/30 border border-border/20 rounded-lg">
          <FilterPill
            active={selectedPlatform === "all"}
            onClick={() => onPlatformChange("all")}
          >
            All <span className="text-text-secondary/40 ml-0.5">{stats.total}</span>
          </FilterPill>
          {platforms.map((platform) => (
            <FilterPill
              key={platform.name}
              active={selectedPlatform === platform.name}
              onClick={() => onPlatformChange(platform.name)}
            >
              <PlatformIconSmall platform={platform.name} />
              <span className="capitalize ml-1">{platform.name}</span>
              <span className="text-text-secondary/40 ml-0.5">{platform.count}</span>
            </FilterPill>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-border/20 hidden sm:block" />

        {/* Status Filter */}
        <div className="inline-flex items-center gap-0.5 p-0.5 bg-surface/30 border border-border/20 rounded-lg">
          <FilterPill
            active={selectedStatus === "all"}
            onClick={() => onStatusChange("all")}
          >
            All
          </FilterPill>
          <FilterPill
            active={selectedStatus === "active"}
            onClick={() => onStatusChange("active")}
            activeColor="emerald"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
            Active
            <span className="text-current/40 ml-0.5">{stats.active}</span>
          </FilterPill>
          <FilterPill
            active={selectedStatus === "inactive"}
            onClick={() => onStatusChange("inactive")}
            activeColor="gray"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1" />
            Inactive
            <span className="text-current/40 ml-0.5">{stats.inactive}</span>
          </FilterPill>
        </div>

        {/* Results Count */}
        <span className="ml-auto text-[11px] text-text-secondary/50">
          {filteredCount} result{filteredCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}

interface FilterPillProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  activeColor?: "primary" | "emerald" | "gray"
}

function FilterPill({ active, onClick, children, activeColor = "primary" }: FilterPillProps) {
  const activeStyles = {
    primary: "bg-primary/10 text-primary border-primary/30",
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30",
    gray: "bg-gray-100 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/30",
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all duration-150 ${
        active
          ? activeStyles[activeColor]
          : "text-text-secondary/70 border-transparent hover:text-text hover:bg-background/50"
      }`}
    >
      {children}
    </button>
  )
}
