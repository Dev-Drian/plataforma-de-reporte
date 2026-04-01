import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import Card from "../common/Card"

interface AdSpendCardProps {
  title: string
  value: string
  percentageChange: number
  currency?: string
}

export function AdSpendCard({
  title,
  value,
  percentageChange,
  currency = "$",
}: AdSpendCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-8 h-full flex flex-col justify-center items-center text-center">
        <h3 className="text-sm font-medium text-text-secondary mb-6">{title}</h3>

        <p className="text-5xl font-bold text-primary mb-4">
          {currency}
          {value}
        </p>

        <div className="flex items-center justify-center gap-2">
          {percentageChange >= 0 ? (
            <>
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-lg font-semibold text-green-500">
                +{percentageChange.toFixed(0)} %
              </span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-lg font-semibold text-red-500">
                {percentageChange.toFixed(0)} %
              </span>
            </>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
