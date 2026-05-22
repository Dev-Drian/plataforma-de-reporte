import { motion } from 'framer-motion'
import { Card, Button } from '../../../components/common'

interface EmptyAccountsStateProps {
  accountTypes: Array<{ platform: string }>
  getPlatformIcon: (platform: string) => string
  getPlatformColor: (platform: string) => string
}

export function EmptyAccountsState({ accountTypes, getPlatformIcon, getPlatformColor }: EmptyAccountsStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-12 text-center border-2 border-dashed border-border">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-text mb-2">No Connected Accounts</h3>
          <p className="text-text-secondary mb-6">
            Start by connecting your platform accounts to get real-time metrics and analytics data.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {accountTypes.slice(0, 4).map(platform => (
              <span
                key={platform.platform}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${getPlatformColor(platform.platform)} bg-opacity-20 font-medium capitalize`}
              >
                <span className="text-lg">{getPlatformIcon(platform.platform)}</span>
                {platform.platform}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

interface NoResultsStateProps {
  onClearFilters: () => void
}

export function NoResultsState({ onClearFilters }: NoResultsStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-text mb-2">No Results Found</h3>
          <p className="text-text-secondary mb-4">
            No accounts match the applied filters.
          </p>
          <Button
            onClick={onClearFilters}
            variant="outline"
            size="sm"
          >
            Clear Filters
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

