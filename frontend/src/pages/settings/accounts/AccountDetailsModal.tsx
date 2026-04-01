import { Modal } from '../../../components/common'
import { Trash2 } from 'lucide-react'
import { Account } from './AccountsTable'

// SVG Icons for platforms (large size for modal)
const PlatformIconLarge = ({ platform }: { platform: string }) => {
  const icons: Record<string, JSX.Element> = {
    google: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    meta: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#0081FB"/>
      </svg>
    ),
    linkedin: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
      </svg>
    ),
    tiktok: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-text">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
      </svg>
    ),
  }
  return icons[platform] || <span className="text-3xl">📱</span>
}

interface AccountDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  account: Account | null
  onDelete: (id: number) => void
  getPlatformIcon: (platform: string) => string
  getPlatformColor: (platform: string) => string
}

export default function AccountDetailsModal({
  isOpen,
  onClose,
  account,
  onDelete,
}: AccountDetailsModalProps) {
  if (!account) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Details"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-surface rounded-lg">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/20 dark:from-blue-400/10 dark:to-blue-500/20 border border-blue-200/50 dark:border-blue-700/30 flex items-center justify-center">
            <PlatformIconLarge platform={account.platform} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text capitalize">{account.platform}</h3>
            <p className="text-text-secondary capitalize">{account.account_type.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-surface rounded-lg">
            <p className="text-xs text-text-secondary uppercase font-semibold mb-1">Status</p>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
              account.is_active
                ? 'bg-green-500/20 text-green-600'
                : 'bg-gray-500/20 text-gray-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${account.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
              {account.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="p-4 bg-surface rounded-lg">
            <p className="text-xs text-text-secondary uppercase font-semibold mb-1">Account ID</p>
            <p className="text-sm text-text font-mono">{account.id}</p>
          </div>
        </div>

        <div className="p-4 bg-surface rounded-lg">
          <p className="text-xs text-text-secondary uppercase font-semibold mb-2">Account Information</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Name:</span>
              <span className="text-sm text-text font-medium">{account.account_name || 'No name'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">External ID:</span>
              <span className="text-sm text-text font-mono">{account.account_id}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-surface rounded-lg">
          <p className="text-xs text-text-secondary uppercase font-semibold mb-2">Dates</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Created:</span>
              <span className="text-sm text-text">
                {new Date(account.created_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {account.last_sync && (
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">Last Sync:</span>
                <span className="text-sm text-text">
                  {new Date(account.last_sync).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text bg-surface hover:bg-background border border-border/50 hover:border-border rounded-xl transition-all duration-150"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose()
              onDelete(account.id)
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-xl transition-all duration-150 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </Modal>
  )
}

