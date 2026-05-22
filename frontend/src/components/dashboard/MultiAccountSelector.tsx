/**
 * MultiAccountSelector - Selector de múltiples cuentas de diferentes plataformas
 * Permite seleccionar varias cuentas para agregar estadísticas globales
 */
import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Check, Search, Layers } from "lucide-react"
import type { Account } from "../../services/accounts"

// Colores por plataforma
const PLATFORM_COLORS: Record<string, string> = {
  google: "#4285F4",
  meta: "#0084FF",
  linkedin: "#0077B5",
  tiktok: "#000000",
}

// Iconos por plataforma (usando emojis como fallback simple)
const PLATFORM_ICONS: Record<string, string> = {
  google: "🔍",
  meta: "📘",
  linkedin: "💼",
  tiktok: "🎵",
}

const PLATFORM_NAMES: Record<string, string> = {
  google: "Google",
  meta: "Meta (Facebook)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
}

interface MultiAccountSelectorProps {
  accounts: Account[]
  selectedAccountIds: number[]
  onSelectionChange: (ids: number[]) => void
  placeholder?: string
  maxDisplay?: number
  showPlatformFilter?: boolean
  className?: string
  disabled?: boolean
  filterAccountTypes?: string[] // ej: ["ads"] para solo mostrar cuentas de ads
}

export default function MultiAccountSelector({
  accounts,
  selectedAccountIds,
  onSelectionChange,
  placeholder = "Select accounts...",
  maxDisplay = 3,
  showPlatformFilter = true,
  className = "",
  disabled = false,
  filterAccountTypes,
}: MultiAccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [platformFilter, setPlatformFilter] = useState<string | null>(null)

  // Filtrar cuentas según criterios
  const filteredAccounts = useMemo(() => {
    let result = accounts.filter((acc) => acc.is_active)

    // Filtrar por tipo de cuenta si se especifica
    if (filterAccountTypes && filterAccountTypes.length > 0) {
      result = result.filter((acc) => filterAccountTypes.includes(acc.account_type))
    }

    // Filtrar por plataforma
    if (platformFilter) {
      result = result.filter((acc) => acc.platform === platformFilter)
    }

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (acc) =>
          acc.account_name?.toLowerCase().includes(query) ||
          acc.account_id.toLowerCase().includes(query) ||
          acc.platform.toLowerCase().includes(query)
      )
    }

    return result
  }, [accounts, platformFilter, searchQuery, filterAccountTypes])

  // Agrupar cuentas por plataforma
  const accountsByPlatform = useMemo(() => {
    const grouped: Record<string, Account[]> = {}
    for (const account of filteredAccounts) {
      if (!grouped[account.platform]) {
        grouped[account.platform] = []
      }
      grouped[account.platform].push(account)
    }
    return grouped
  }, [filteredAccounts])

  // Plataformas disponibles
  const availablePlatforms = useMemo(() => {
    return Array.from(new Set(accounts.filter((a) => a.is_active).map((a) => a.platform)))
  }, [accounts])

  // Cuentas seleccionadas
  const selectedAccounts = useMemo(() => {
    return accounts.filter((acc) => selectedAccountIds.includes(acc.id))
  }, [accounts, selectedAccountIds])

  // Toggle selección de una cuenta
  const toggleAccount = (accountId: number) => {
    if (selectedAccountIds.includes(accountId)) {
      onSelectionChange(selectedAccountIds.filter((id) => id !== accountId))
    } else {
      onSelectionChange([...selectedAccountIds, accountId])
    }
  }

  // Seleccionar/deseleccionar todas las cuentas de una plataforma
  const togglePlatform = (platform: string) => {
    const platformAccountIds = accountsByPlatform[platform]?.map((a) => a.id) || []
    const allSelected = platformAccountIds.every((id) => selectedAccountIds.includes(id))

    if (allSelected) {
      // Deseleccionar todas de esta plataforma
      onSelectionChange(selectedAccountIds.filter((id) => !platformAccountIds.includes(id)))
    } else {
      // Seleccionar todas de esta plataforma
      const newSelection = new Set([...selectedAccountIds, ...platformAccountIds])
      onSelectionChange(Array.from(newSelection))
    }
  }

  // Seleccionar todas las cuentas
  const selectAll = () => {
    onSelectionChange(filteredAccounts.map((acc) => acc.id))
  }

  // Deseleccionar todas
  const clearSelection = () => {
    onSelectionChange([])
  }

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".multi-account-selector")) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("click", handleClickOutside)
    }

    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`relative multi-account-selector ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          bg-background border border-border rounded-lg
          text-text hover:bg-background-secondary transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${isOpen ? "ring-2 ring-primary/20 border-primary" : ""}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Layers className="w-4 h-4 text-text-secondary flex-shrink-0" />
          {selectedAccounts.length === 0 ? (
            <span className="text-text-secondary text-sm truncate">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {selectedAccounts.slice(0, maxDisplay).map((acc) => (
                <span
                  key={acc.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: PLATFORM_COLORS[acc.platform] || "#666" }}
                >
                  {PLATFORM_ICONS[acc.platform]} {acc.account_name || acc.account_id}
                </span>
              ))}
              {selectedAccounts.length > maxDisplay && (
                <span className="text-xs text-text-secondary">
                  +{selectedAccounts.length - maxDisplay} more
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
            style={{ minWidth: "320px", maxHeight: "400px" }}
          >
            {/* Header con búsqueda y acciones */}
            <div className="p-3 border-b border-border space-y-2">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Filtros de plataforma */}
              {showPlatformFilter && availablePlatforms.length > 1 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => setPlatformFilter(null)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      platformFilter === null
                        ? "bg-primary text-white"
                        : "bg-background text-text-secondary hover:bg-background-secondary"
                    }`}
                  >
                    All
                  </button>
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setPlatformFilter(platform === platformFilter ? null : platform)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                        platformFilter === platform
                          ? "text-white"
                          : "bg-background text-text-secondary hover:bg-background-secondary"
                      }`}
                      style={{
                        backgroundColor:
                          platformFilter === platform ? PLATFORM_COLORS[platform] : undefined,
                      }}
                    >
                      {PLATFORM_ICONS[platform]} {PLATFORM_NAMES[platform] || platform}
                    </button>
                  ))}
                </div>
              )}

              {/* Acciones rápidas */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={selectAll}
                  className="text-primary hover:underline"
                >
                  Select all
                </button>
                <span className="text-text-secondary">|</span>
                <button
                  onClick={clearSelection}
                  className="text-text-secondary hover:text-text"
                >
                  Clear
                </button>
                <span className="ml-auto text-text-secondary">
                  {selectedAccountIds.length} selected
                </span>
              </div>
            </div>

            {/* Lista de cuentas agrupadas por plataforma */}
            <div className="max-h-60 overflow-y-auto">
              {Object.keys(accountsByPlatform).length === 0 ? (
                <div className="p-4 text-center text-text-secondary text-sm">
                  No accounts found
                </div>
              ) : (
                Object.entries(accountsByPlatform).map(([platform, platformAccounts]) => {
                  const allSelected = platformAccounts.every((a) =>
                    selectedAccountIds.includes(a.id)
                  )
                  const someSelected = platformAccounts.some((a) =>
                    selectedAccountIds.includes(a.id)
                  )

                  return (
                    <div key={platform} className="border-b border-border last:border-b-0">
                      {/* Header de plataforma */}
                      <button
                        onClick={() => togglePlatform(platform)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-background-secondary transition-colors"
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            allSelected
                              ? "border-primary bg-primary"
                              : someSelected
                              ? "border-primary bg-primary/30"
                              : "border-border"
                          }`}
                        >
                          {allSelected && <Check className="w-3 h-3 text-white" />}
                          {someSelected && !allSelected && (
                            <div className="w-2 h-2 bg-primary rounded-sm" />
                          )}
                        </div>
                        <span
                          className="text-sm font-medium"
                          style={{ color: PLATFORM_COLORS[platform] }}
                        >
                          {PLATFORM_ICONS[platform]} {PLATFORM_NAMES[platform] || platform}
                        </span>
                        <span className="text-xs text-text-secondary ml-auto">
                          ({platformAccounts.length})
                        </span>
                      </button>

                      {/* Lista de cuentas de esta plataforma */}
                      <div className="pl-6">
                        {platformAccounts.map((account) => {
                          const isSelected = selectedAccountIds.includes(account.id)
                          return (
                            <button
                              key={account.id}
                              onClick={() => toggleAccount(account.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-background-secondary transition-colors"
                            >
                              <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? "border-primary bg-primary" : "border-border"
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm text-text truncate">
                                  {account.account_name || account.account_id}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {account.account_type} • {account.account_id}
                                </p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer con resumen */}
            {selectedAccountIds.length > 0 && (
              <div className="p-2 border-t border-border bg-background/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">
                    {selectedAccountIds.length} account(s) from{" "}
                    {new Set(selectedAccounts.map((a) => a.platform)).size} platform(s)
                  </span>
                  <button
                    onClick={() => {
                      setIsOpen(false)
                    }}
                    className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
