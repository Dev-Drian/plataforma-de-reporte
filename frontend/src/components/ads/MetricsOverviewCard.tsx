import { useState } from "react"
import { motion } from "framer-motion"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { MoreVertical, Clock, Download, Eye } from "lucide-react"
import Card from "../common/Card"

interface MetricItem {
  label: string
  value: string
  previousValue: string
  percentageChange: number
  data: Array<{ date: string; value: number }>
}

interface MetricsOverviewCardProps {
  title: string
  metrics: MetricItem[]
  color?: string
}

// Custom Tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; payload?: any }>
}) {
  if (active && payload && payload.length) {
    const date = payload[0].payload?.date || "N/A"
    return (
      <div className="bg-surface border border-border rounded-lg shadow-lg p-2">
        <p className="text-xs text-text-secondary">{date}</p>
        <p className="text-sm font-bold text-text">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

export function MetricsOverviewCard({
  title,
  metrics,
  color = "#3b82f6",
}: MetricsOverviewCardProps) {
  const [activeMenu, setActiveMenu] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-background-secondary rounded-lg transition-colors">
              <Clock className="w-4 h-4 text-text-secondary" />
            </button>
            <button className="p-2 hover:bg-background-secondary rounded-lg transition-colors">
              <Download className="w-4 h-4 text-text-secondary" />
            </button>
            <button className="p-2 hover:bg-background-secondary rounded-lg transition-colors">
              <Eye className="w-4 h-4 text-text-secondary" />
            </button>
            <div className="relative">
              <button
                onClick={() => setActiveMenu(!activeMenu)}
                className="p-2 hover:bg-background-secondary rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.map((metric, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4">
              <p className="text-xs text-text-secondary mb-2">{metric.label}</p>
              <p className="text-2xl font-bold text-text mb-1">{metric.value}</p>
              <p className="text-xs text-text-secondary mb-3">
                vs {metric.previousValue}
              </p>
              <div className="flex items-center gap-1 mb-4">
                <span
                  className={`text-sm font-semibold ${
                    metric.percentageChange >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {metric.percentageChange >= 0 ? "+" : ""}{metric.percentageChange.toFixed(0)}%
                </span>
              </div>

              {/* Tiny Chart with Tooltip */}
              <div className="h-12 -mx-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metric.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: color, strokeWidth: 1, opacity: 0.5 }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}
