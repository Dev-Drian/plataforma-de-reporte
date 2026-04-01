"use client"

import { useState, useEffect, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { LoadingSpinner, Pagination } from "../../components/common"
import { accountsService, oauthService, type OAuthProvider } from "../../services"
import { useApi } from "../../hooks/useApi"
import { useAlert } from "../../components/common/Alert"
import { RefreshCw } from "lucide-react"

// Componentes
import AccountsFilters from "./accounts/AccountsFilters"
import type { Account, SortField, SortOrder } from "./accounts/AccountsTable"
import AccountDetailsModal from "./accounts/AccountDetailsModal"
import ConnectAccountsSection from "./accounts/ConnectAccountsSection"
import { EmptyAccountsState, NoResultsState } from "./accounts/EmptyStates"
import AccountsGrouped from "./accounts/AccountsGrouped"

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [sortField, _setSortField] = useState<SortField>("created_at")
  const [sortOrder, _setSortOrder] = useState<SortOrder>("desc")
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  const { execute: fetchAccounts, loading } = useApi(accountsService.getAccounts)
  const { execute: deleteAccountBase, loading: deleting } = useApi(
    (params: { id: number; hardDelete: boolean }) => 
      accountsService.deleteAccount(params.id, params.hardDelete)
  )
  const deleteAccount = (id: number, hardDelete: boolean = false) => 
    deleteAccountBase({ id, hardDelete })
  const { execute: _restoreAccount, loading: restoring } = useApi(accountsService.restoreAccount)
  const { execute: toggleAccountStatus, loading: toggling } = useApi(accountsService.toggleAccountStatus)
  const { execute: _batchToggleStatusBase, loading: _batchToggling } = useApi(
    (params: { accountIds: number[]; isActive: boolean }) => 
      accountsService.batchToggleStatus(params.accountIds, params.isActive)
  )
  // const _batchToggleStatus = (accountIds: number[], isActive: boolean) => 
  //   batchToggleStatusBase({ accountIds, isActive })
  const { showAlert, AlertContainer } = useAlert()
  const location = useLocation()

  useEffect(() => {
    loadAccounts()
    loadProviders()
  }, [])

  // Reload accounts when navigating from OAuth callback
  useEffect(() => {
    // If coming from OAuth callback, reload accounts
    if (location.search.includes('success=true') || location.state?.fromOAuth) {
      loadAccounts()
    }
  }, [location])

  const loadProviders = async () => {
    try {
      const providersData = await oauthService.getProviders()
      setProviders(providersData)
    } catch (err: any) {
      console.error("Error loading providers:", err)
    }
  }

  const getPlatformIcon = (platform: string): string => {
    const provider = providers.find((p) => p.name === platform)
    return provider?.icon || ""
  }

  const getPlatformColor = (platform: string) => {
    const provider = providers.find((p) => p.name === platform)
    return provider?.color || "bg-gray-500"
  }

  const loadAccounts = async () => {
    try {
      const data = await fetchAccounts(false) // No incluir eliminadas por defecto
      setAccounts(data || [])
    } catch (err: any) {
      showAlert({
        type: "error",
        message: err.message || "Error loading accounts",
        duration: 5000,
      })
    }
  }

  const handleConnect = async (platform: string, accountType: string) => {
    try {
      const response = await oauthService.initOAuthFlow({ platform, account_type: accountType })
      localStorage.setItem("oauth_platform", platform)
      localStorage.setItem("oauth_account_type", accountType)
      localStorage.setItem("oauth_state", response.state)
      window.location.href = response.auth_url
    } catch (err: any) {
      showAlert({
        type: "error",
        message: err.message || "Error starting connection",
        duration: 5000,
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to disable this account? You can restore it later.")) {
      return
    }

    try {
      await deleteAccount(id, false) // Soft delete
      showAlert({
        type: "success",
        message: "Account disabled successfully",
        duration: 3000,
      })
      loadAccounts()
    } catch (err: any) {
      showAlert({
        type: "error",
        message: err.message || "Error deleting account",
        duration: 5000,
      })
    }
  }

  // const _handleRestore = async (id: number) => {
  //   try {
  //     await _restoreAccount(id)
  //     showAlert({
  //       type: "success",
  //       message: "Account restored successfully",
  //       duration: 3000,
  //     })
  //     loadAccounts()
  //   } catch (err: any) {
  //     showAlert({
  //       type: "error",
  //       message: err.message || "Error restoring account",
  //       duration: 5000,
  //     })
  //   }
  // }

  const handleToggleStatus = async (id: number) => {
    try {
      await toggleAccountStatus(id)
      showAlert({
        type: "success",
        message: "Account status updated successfully",
        duration: 3000,
      })
      loadAccounts()
    } catch (err: any) {
      showAlert({
        type: "error",
        message: err.message || "Error updating account status",
        duration: 5000,
      })
    }
  }

  const accountTypes = [
    { platform: "google", types: ["search_console", "analytics", "ads", "gbp"] },
    { platform: "meta", types: ["ads"] },
    { platform: "linkedin", types: ["ads"] },
    { platform: "tiktok", types: ["ads"] },
  ]

  // Statistics
  const stats = useMemo(() => {
    const total = accounts.length
    const active = accounts.filter((a) => a.is_active).length
    const inactive = total - active
    const platforms = new Set(accounts.map((a) => a.platform)).size
    const recentlyAdded = accounts.filter((a) => {
      const createdDate = new Date(a.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return createdDate > weekAgo
    }).length

    return { total, active, inactive, platforms, recentlyAdded }
  }, [accounts])

  // Filtered and sorted accounts
  const filteredAccounts = useMemo(() => {
    const filtered = accounts.filter((account) => {
      const matchesSearch =
        searchQuery === "" ||
        account.account_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.account_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.account_type.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesPlatform = selectedPlatform === "all" || account.platform === selectedPlatform
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && account.is_active) ||
        (selectedStatus === "inactive" && !account.is_active)

      return matchesSearch && matchesPlatform && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === "created_at" || sortField === "last_sync") {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      } else {
        aVal = String(aVal || "").toLowerCase()
        bVal = String(bVal || "").toLowerCase()
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [accounts, searchQuery, selectedPlatform, selectedStatus, sortField, sortOrder])

  // Paginated accounts
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAccounts.slice(startIndex, endIndex)
  }, [filteredAccounts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedPlatform, selectedStatus])

  // const _handleSort = (field: SortField) => {
  //   if (sortField === field) {
  //     setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  //   } else {
  //     setSortField(field)
  //     setSortOrder("asc")
  //   }
  // }

  const handleSelectAccount = (id: number) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedAccounts(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedAccounts.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedAccounts.size} account(s)?`)) {
      return
    }

    try {
      await Promise.all(Array.from(selectedAccounts).map((id) => deleteAccount(id)))
      showAlert({
        type: "success",
        message: `${selectedAccounts.size} account(s) deleted successfully`,
        duration: 3000,
      })
      setSelectedAccounts(new Set())
      loadAccounts()
    } catch (err: any) {
      showAlert({
        type: "error",
        message: err.message || "Error deleting accounts",
        duration: 5000,
      })
    }
  }

  const handleViewDetails = (account: Account) => {
    setSelectedAccount(account)
    setShowDetailsModal(true)
  }

  const handleRefresh = () => {
    loadAccounts()
    loadProviders()
    showAlert({
      type: "success",
      message: "Data updated",
      duration: 2000,
    })
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setSelectedPlatform("all")
    setSelectedStatus("all")
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  // Build platforms array for filters - MUST be before any conditional returns
  const platformsForFilters = useMemo(() => {
    const platformMap = new Map<string, { name: string; icon: string; color: string; count: number }>()
    
    accounts.forEach((account) => {
      if (!platformMap.has(account.platform)) {
        platformMap.set(account.platform, {
          name: account.platform,
          icon: getPlatformIcon(account.platform),
          color: getPlatformColor(account.platform),
          count: 1,
        })
      } else {
        const existing = platformMap.get(account.platform)!
        existing.count++
      }
    })
    
    return Array.from(platformMap.values())
  }, [accounts, providers])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      <AlertContainer />

      {/* Soft Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-medium text-text tracking-tight">Accounts</h1>
          <p className="text-sm text-text-secondary/70 mt-0.5">
            {accounts.length} connected account{accounts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary/80 hover:text-text bg-surface/30 hover:bg-surface/50 border border-border/40 hover:border-border/60 rounded-xl transition-all duration-200 disabled:opacity-50 group"
        >
          <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${loading ? "animate-spin" : "group-hover:rotate-45"}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* Filters Section */}
      {accounts.length > 0 && (
        <AccountsFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedPlatform={selectedPlatform}
          onPlatformChange={setSelectedPlatform}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          platforms={platformsForFilters}
          selectedCount={selectedAccounts.size}
          onBulkDelete={handleBulkDelete}
          totalAccounts={accounts.length}
          filteredCount={filteredAccounts.length}
          deleting={deleting}
          onClearFilters={handleClearFilters}
          stats={stats}
        />
      )}

      {/* Accounts Grouped View */}
      {filteredAccounts.length > 0 && (
        <>
          <AccountsGrouped
            accounts={paginatedAccounts}
            selectedAccounts={selectedAccounts}
            onSelectAccount={handleSelectAccount}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            getPlatformIcon={getPlatformIcon}
            getPlatformColor={getPlatformColor}
            deleting={deleting || restoring || toggling}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAccounts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              showItemsPerPage={true}
            />
          )}
        </>
      )}

      {/* Account Details Modal */}
      <AccountDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        account={selectedAccount}
        onDelete={handleDelete}
        getPlatformIcon={getPlatformIcon}
        getPlatformColor={getPlatformColor}
      />

      {/* Connect Accounts Section */}
      <ConnectAccountsSection
        accountTypes={accountTypes}
        accounts={accounts}
        onConnect={handleConnect}
        getPlatformIcon={getPlatformIcon}
        getPlatformColor={getPlatformColor}
      />

      {/* Empty State */}
      {accounts.length === 0 && !loading && (
        <EmptyAccountsState
          accountTypes={accountTypes}
          getPlatformIcon={getPlatformIcon}
          getPlatformColor={getPlatformColor}
        />
      )}

      {/* No Results State */}
      {filteredAccounts.length === 0 && accounts.length > 0 && <NoResultsState onClearFilters={handleClearFilters} />}
    </div>
  )
}
