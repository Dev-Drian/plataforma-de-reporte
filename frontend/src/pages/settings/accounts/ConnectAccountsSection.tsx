"use client"

import { useState } from "react"
import { Plus, Lock, ChevronDown } from "lucide-react"
import { usePermissions } from "../../../hooks/usePermissions"
import type { Account } from "./AccountsTable"

interface ConnectAccountsSectionProps {
  accountTypes: Array<{ platform: string; types: string[] }>
  accounts: Account[]
  onConnect: (platform: string, accountType: string) => void
  getPlatformIcon: (platform: string) => string
  getPlatformColor: (platform: string) => string
}

const accountTypeInfo: Record<string, { label: string; description: string }> = {
  search_console: { label: "Search Console", description: "SEO & search" },
  analytics: { label: "Analytics", description: "Traffic data" },
  ads: { label: "Ads", description: "Campaigns" },
  gbp: { label: "Business Profile", description: "Local listing" },
}

const platformConfig: Record<string, { name: string; color: string }> = {
  google: { name: "Google", color: "#4285F4" },
  meta: { name: "Meta", color: "#0081FB" },
  linkedin: { name: "LinkedIn", color: "#0A66C2" },
  tiktok: { name: "TikTok", color: "#000000" },
}

// SVG Icons for each platform
const PlatformIcon = ({ platform, size = 20 }: { platform: string; size?: number }) => {
  const icons: Record<string, JSX.Element> = {
    google: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    meta: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#0081FB"/>
      </svg>
    ),
    linkedin: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
      </svg>
    ),
    tiktok: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" fill="currentColor"/>
      </svg>
    ),
  }
  return icons[platform] || <span className="text-sm">📱</span>
}

export default function ConnectAccountsSection({
  accountTypes,
  accounts,
  onConnect,
}: ConnectAccountsSectionProps) {
  const { canManageOAuth, isViewer } = usePermissions()
  const [isExpanded, setIsExpanded] = useState(true)

  const getTypeCount = (platform: string, type: string) => {
    return accounts.filter((a) => a.platform === platform && a.account_type === type && !a.deleted_at).length
  }

  const getPlatformTotalCount = (platform: string) => {
    return accounts.filter((a) => a.platform === platform && !a.deleted_at).length
  }

  if (isViewer()) {
    return (
      <div className="mt-8 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl">
        <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Viewer access - Contact admin to connect accounts</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h2 className="text-sm font-medium text-text">Connect New Accounts</h2>
        <ChevronDown 
          className={`w-4 h-4 text-text-secondary/50 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} 
        />
      </button>

      {/* Expandable Content */}
      <div 
        className={`grid transition-all duration-200 ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {accountTypes.map((platformGroup) => {
              const config = platformConfig[platformGroup.platform]
              const totalConnected = getPlatformTotalCount(platformGroup.platform)
              
              return (
                <div 
                  key={platformGroup.platform} 
                  className="bg-surface/50 border border-border/30 rounded-xl p-3 transition-all duration-150 hover:border-border/50"
                >
                  {/* Platform Header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/20">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={platformGroup.platform} size={18} />
                      <span className="font-medium text-text text-sm">{config?.name || platformGroup.platform}</span>
                    </div>
                    {totalConnected > 0 && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {totalConnected}
                      </span>
                    )}
                  </div>
                  
                  {/* Account Types */}
                  <div className="space-y-1.5">
                    {platformGroup.types.map((type) => {
                      const count = getTypeCount(platformGroup.platform, type)
                      const typeInfo = accountTypeInfo[type]
                      const hasConnected = count > 0
                      
                      return (
                        <button
                          key={type}
                          onClick={() => onConnect(platformGroup.platform, type)}
                          disabled={!canManageOAuth()}
                          className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-left transition-all duration-150 hover:bg-background/60 disabled:opacity-50 disabled:cursor-not-allowed group/item"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Plus className={`w-3 h-3 flex-shrink-0 transition-colors ${
                              hasConnected 
                                ? "text-primary" 
                                : "text-text-secondary/40 group-hover/item:text-primary"
                            }`} />
                            <span className="text-xs text-text truncate">{typeInfo?.label || type}</span>
                          </div>
                          
                          {hasConnected && (
                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                              {count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
