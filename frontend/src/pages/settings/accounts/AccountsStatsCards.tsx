import { motion } from 'framer-motion'
import { Card } from '../../../components/common'

interface AccountsStatsCardsProps {
  stats: {
    total: number
    active: number
    inactive: number
    platforms: number
    recentlyAdded: number
  }
}

export default function AccountsStatsCards({ stats }: AccountsStatsCardsProps) {
  const statCards = [
    {
      value: stats.total,
      label: 'Total',
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      bgColor: 'bg-blue-500/10'
    },
    {
      value: stats.active,
      label: 'Active',
      icon: (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-green-500/10'
    },
    {
      value: stats.inactive,
      label: 'Inactive',
      icon: (
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      bgColor: 'bg-gray-500/10'
    },
    {
      value: stats.platforms,
      label: 'Platforms',
      icon: (
        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      bgColor: 'bg-purple-500/10'
    },
    {
      value: stats.recentlyAdded,
      label: 'This Week',
      icon: (
        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      bgColor: 'bg-orange-500/10'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
    >
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + index * 0.03 }}
        >
          <Card className="p-2.5 border border-border hover:border-primary/30 transition-all h-full">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                <div className="w-4 h-4">
                  {stat.icon}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-text leading-tight">{stat.value}</p>
                <p className="text-xs text-text-secondary truncate">{stat.label}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}

