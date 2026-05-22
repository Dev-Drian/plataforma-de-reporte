"use client"

import { useState } from "react"
import { 
  ChevronDown, 
  Eye, 
  Power, 
  Trash2, 
  MoreHorizontal,
  BarChart3,
  Megaphone,
  Search,
  MapPin
} from "lucide-react"
import type { Account } from "../../../services/accounts"

interface AccountsGroupedProps {
  accounts: Account[]
  selectedAccounts: Set<number>
  onSelectAccount: (id: number) => void
  onViewDetails: (account: Account) => void
  onDelete: (id: number) => void
  onToggleStatus?: (id: number) => void
  getPlatformIcon: (platform: string) => string
  getPlatformColor: (platform: string) => string
  deleting: boolean
}

// SVG Icons for platforms
const PlatformIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, JSX.Element> = {
    google: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    meta: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#0081FB"/>
      </svg>
    ),
    linkedin: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
      </svg>
    ),
    tiktok: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
      </svg>
    ),
  }
  return icons[platform] || <span className="text-lg">📱</span>
}

// Account type badge configuration - Strong colors per type
const accountTypeConfig: Record<string, { 
  label: string
  icon: JSX.Element
  styles: string
}> = {
  analytics: {
    label: "Analytics",
    icon: <BarChart3 className="w-3 h-3" />,
    styles: "bg-blue-500 dark:bg-blue-600 text-white font-semibold border-blue-600 dark:border-blue-500"
  },
  ads: {
    label: "Ads",
    icon: <Megaphone className="w-3 h-3" />,
    styles: "bg-violet-500 dark:bg-violet-600 text-white font-semibold border-violet-600 dark:border-violet-500"
  },
  ads_error: {
    label: "Ads",
    icon: <Megaphone className="w-3 h-3" />,
    styles: "bg-red-600 dark:bg-red-700 text-white font-semibold border-red-700 dark:border-red-600"
  },
  search_console: {
    label: "Search Console",
    icon: <Search className="w-3 h-3" />,
    styles: "bg-orange-500 dark:bg-orange-600 text-white font-semibold border-orange-600 dark:border-orange-500"
  },
  gbp: {
    label: "Business Profile",
    icon: <MapPin className="w-3 h-3" />,
    styles: "bg-teal-500 dark:bg-teal-600 text-white font-semibold border-teal-600 dark:border-teal-500"
  }
}

// Account Type Badge Component
const AccountTypeBadge = ({ accountType, hasError = false }: { accountType: string; hasError?: boolean }) => {
  // Use error style for ads if there's an error
  const configKey = hasError && accountType === 'ads' ? 'ads_error' : accountType
  const config = accountTypeConfig[configKey] || {
    label: accountType.replace("_", " "),
    icon: null,
    styles: "bg-slate-500 dark:bg-slate-600 text-white font-semibold border-slate-600 dark:border-slate-500"
  }

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold capitalize
      border shadow-sm ${config.styles}
    `}>
      {config.icon}
      {config.label}
    </span>
  )
}

export default function AccountsGrouped({
  accounts,
  selectedAccounts,
  onSelectAccount,
  onViewDetails,
  onDelete,
  onToggleStatus,
  deleting,
}: AccountsGroupedProps) {
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(
    new Set(["google", "meta", "linkedin", "tiktok"])
  )
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  // Group accounts by platform
  const groupedAccounts = accounts.reduce(
    (acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = []
      }
      acc[account.platform].push(account)
      return acc
    },
    {} as Record<string, Account[]>
  )

  const togglePlatform = (platform: string) => {
    setExpandedPlatforms((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(platform)) {
        newSet.delete(platform)
      } else {
        newSet.add(platform)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-2">
      {Object.entries(groupedAccounts).map(([platform, platformAccounts]) => {
        const isExpanded = expandedPlatforms.has(platform)
        const activeCount = platformAccounts.filter((a) => a.is_active).length

        return (
          <div
            key={platform}
            className="border border-border/30 rounded-xl overflow-hidden bg-surface/40 transition-all duration-150 hover:border-border/50"
          >
            {/* Platform Header */}
            <button
              onClick={() => togglePlatform(platform)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-background/30 transition-colors duration-150"
            >
              <div className="flex items-center gap-3">
                <PlatformIcon platform={platform} />
                <div className="text-left">
                  <span className="font-medium text-text capitalize text-sm block">{platform}</span>
                  <span className="text-[11px] text-text-secondary/60">
                    {platformAccounts.length} account{platformAccounts.length !== 1 ? "s" : ""} · {activeCount} active
                  </span>
                </div>
              </div>
              <ChevronDown 
                className={`w-5 h-5 text-text-secondary/50 transition-transform duration-300 ease-out ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>

            {/* Accounts List - CSS-only transition */}
            <div 
              className={`grid transition-all duration-300 ease-out ${
                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border/30">
                  <div className="divide-y divide-border/20">
                    {platformAccounts.map((account) => (
                      <div
                        key={account.id}
                        className={`px-5 py-3.5 flex items-center gap-4 transition-colors duration-200 hover:bg-background/30 ${
                          selectedAccounts.has(account.id) ? "bg-primary/5" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-2 border-border/50 text-primary bg-surface checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 transition-all cursor-pointer accent-primary"
                          checked={selectedAccounts.has(account.id)}
                          onChange={() => onSelectAccount(account.id)}
                        />

                        {/* Account Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text text-sm truncate">
                            {account.account_name || account.account_id}
                          </p>
                          <p className="text-xs text-text-secondary/60 font-mono truncate">
                            {account.account_id}
                          </p>
                        </div>

                        {/* Type Badge */}
                        <AccountTypeBadge accountType={account.account_type} />

                        {/* Status */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium ${
                            account.is_active
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              account.is_active ? "bg-green-500" : "bg-slate-400"
                            }`}
                          />
                          {account.is_active ? "Active" : "Inactive"}
                        </span>

                        {/* Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === account.id ? null : account.id)}
                            className="p-2 hover:bg-background/60 rounded-xl transition-all duration-200 text-text-secondary/60 hover:text-text-secondary"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          {openMenuId === account.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div
                                className="absolute right-0 top-full mt-1.5 z-20 bg-surface border border-border/50 rounded-xl shadow-lg shadow-black/5 py-1 min-w-[150px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                              >
                                <button
                                  onClick={() => {
                                    onViewDetails(account)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-sm text-text hover:bg-background/60 flex items-center gap-2.5 transition-colors duration-150"
                                >
                                  <Eye className="w-3.5 h-3.5 text-text-secondary/70" />
                                  View Details
                                </button>
                                {onToggleStatus && (
                                  <button
                                    onClick={() => {
                                      onToggleStatus(account.id)
                                      setOpenMenuId(null)
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-sm text-text hover:bg-background/60 flex items-center gap-2.5 transition-colors duration-150"
                                  >
                                    <Power className="w-3.5 h-3.5 text-text-secondary/70" />
                                    {account.is_active ? "Deactivate" : "Activate"}
                                  </button>
                                )}
                                <div className="border-t border-border/30 my-1" />
                                <button
                                  onClick={() => {
                                    onDelete(account.id)
                                    setOpenMenuId(null)
                                  }}
                                  disabled={deleting}
                                  className="w-full px-3.5 py-2 text-left text-sm text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20 flex items-center gap-2.5 transition-colors duration-150 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
