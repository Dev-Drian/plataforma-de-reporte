import { motion } from 'framer-motion'
import { Card } from '../../../components/common'
import { usePermissions } from '../../../hooks/usePermissions'
import { Lock, BarChart3, Megaphone, Search, MapPin } from 'lucide-react'

export interface Account {
  id: number
  organization_id: number
  platform: string
  account_type: string
  account_id: string
  account_name: string | null
  is_active: boolean
  parent_account_id: number | null
  last_sync: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type SortField = 'platform' | 'account_type' | 'created_at' | 'last_sync'
export type SortOrder = 'asc' | 'desc'

// Account type badge configuration with icons and colors
// Account type badge configuration - Soft colors per type
const accountTypeConfig: Record<string, { 
  label: string
  icon: JSX.Element
  styles: string
}> = {
  analytics: {
    label: "Analytics",
    icon: <BarChart3 className="w-3 h-3" />,
    styles: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
  },
  ads: {
    label: "Ads",
    icon: <Megaphone className="w-3 h-3" />,
    styles: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800"
  },
  search_console: {
    label: "Search Console",
    icon: <Search className="w-3 h-3" />,
    styles: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"
  },
  gbp: {
    label: "Business Profile",
    icon: <MapPin className="w-3 h-3" />,
    styles: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800"
  }
}

// Account Type Badge Component
const AccountTypeBadge = ({ accountType }: { accountType: string }) => {
  const config = accountTypeConfig[accountType] || {
    label: accountType.replace("_", " "),
    icon: null,
    styles: "bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/40"
  }

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium capitalize
      border ${config.styles}
    `}>
      {config.icon}
      {config.label}
    </span>
  )
}

interface AccountsTableProps {
  accounts: Account[]
  selectedAccounts: Set<number>
  onSelectAccount: (id: number) => void
  onSelectAll: () => void
  onViewDetails: (account: Account) => void
  onDelete: (id: number) => void
  onRestore?: (id: number) => void
  onToggleStatus?: (id: number) => void
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  getPlatformIcon: (platform: string) => string
  getPlatformColor: (platform: string) => string
  deleting: boolean
}

const isAllSelected = (accounts: Account[], selectedAccounts: Set<number>) => {
  return accounts.length > 0 && accounts.every(a => selectedAccounts.has(a.id))
}

export default function AccountsTable({
  accounts,
  selectedAccounts,
  onSelectAccount,
  onSelectAll,
  onViewDetails,
  onDelete,
  onRestore,
  onToggleStatus,
  sortField,
  sortOrder,
  onSort,
  getPlatformIcon,
  getPlatformColor,
  deleting
}: AccountsTableProps) {
  const { can, isViewer: _isViewer } = usePermissions()
  const canDeleteAccounts = can("accounts", "delete")
  const canUpdateAccounts = can("accounts", "update")
  
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return (
      <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Card className="overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={isAllSelected(accounts, selectedAccounts)}
                      onChange={onSelectAll}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </th>
                  <th
                    onClick={() => onSort('platform')}
                    className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider cursor-pointer hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Platform
                      <SortIcon field="platform" />
                    </div>
                  </th>
                  <th
                    onClick={() => onSort('account_type')}
                    className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider cursor-pointer hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Type
                      <SortIcon field="account_type" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    onClick={() => onSort('last_sync')}
                    className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider cursor-pointer hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Last Sync
                      <SortIcon field="last_sync" />
                    </div>
                  </th>
                  <th
                    onClick={() => onSort('created_at')}
                    className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider cursor-pointer hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Creation Date
                      <SortIcon field="created_at" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((account, index) => (
                  <motion.tr
                    key={account.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.has(account.id)}
                        onChange={() => onSelectAccount(account.id)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${getPlatformColor(account.platform)} flex items-center justify-center text-lg flex-shrink-0`}>
                          {getPlatformIcon(account.platform)}
                        </div>
                        <span className="font-medium text-text capitalize">{account.platform}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <AccountTypeBadge accountType={account.account_type} />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-text truncate max-w-xs">
                          {account.account_name || 'No name'}
                          {account.parent_account_id && (
                            <span className="ml-2 text-xs text-text-secondary" title="MCC sub-account">
                              (MCC)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-secondary truncate max-w-xs">
                          ID: {account.account_id}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium ${
                          account.is_active
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${account.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {account.deleted_at && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Deleted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-secondary">
                      {account.last_sync ? (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{new Date(account.last_sync).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-text-secondary">
                      {new Date(account.created_at).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!account.deleted_at && (
                          <>
                            <button
                              onClick={() => onViewDetails(account)}
                              className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="View details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            {onToggleStatus && canUpdateAccounts && (
                              <button
                                onClick={() => onToggleStatus(account.id)}
                                className="p-2 text-text-secondary hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title={account.is_active ? 'Deactivate account' : 'Activate account'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={account.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                </svg>
                              </button>
                            )}
                            {!canUpdateAccounts && (
                              <div className="p-2 text-text-secondary/30" title="No permission to edit">
                                <Lock className="w-4 h-4" />
                              </div>
                            )}
                          </>
                        )}
                        {account.deleted_at && onRestore && canDeleteAccounts ? (
                          <button
                            onClick={() => onRestore(account.id)}
                            className="p-2 text-text-secondary hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Restore account"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        ) : !account.deleted_at ? (
                          <button
                            onClick={() => onDelete(account.id)}
                            disabled={deleting}
                            className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete account"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {accounts.map((account, index) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-4 border border-border">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedAccounts.has(account.id)}
                  onChange={() => onSelectAccount(account.id)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-1 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-lg ${getPlatformColor(account.platform)} flex items-center justify-center text-xl flex-shrink-0`}>
                        {getPlatformIcon(account.platform)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-text capitalize truncate">{account.platform}</h3>
                        <div className="mt-1">
                          <AccountTypeBadge accountType={account.account_type} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!account.deleted_at && (
                        <>
                          <button
                            onClick={() => onViewDetails(account)}
                            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="View details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {onToggleStatus && (
                            <button
                              onClick={() => onToggleStatus(account.id)}
                              className="p-2 text-text-secondary hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title={account.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={account.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(account.id)}
                            disabled={deleting}
                            className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                      {account.deleted_at && onRestore && (
                        <button
                          onClick={() => onRestore(account.id)}
                          className="p-2 text-text-secondary hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                          title="Restore"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-text truncate">
                        {account.account_name || 'No name'}
                        {account.parent_account_id && (
                          <span className="ml-2 text-xs text-text-secondary">(MCC)</span>
                        )}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        ID: {account.account_id}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <AccountTypeBadge accountType={account.account_type} />
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium ${
                        account.is_active
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${account.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {account.deleted_at && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          Deleted
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary pt-1">
                      {account.last_sync && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Sync: {new Date(account.last_sync).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short'
                          })}</span>
                        </div>
                      )}
                      <div>
                        Created: {new Date(account.created_at).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

