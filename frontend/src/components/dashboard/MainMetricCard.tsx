import Card from "../common/Card"

interface MainMetricCardProps {
  value: string | number
  changePercent: number
  label?: string
  trendData?: Array<{ date: string; value: number }>
}

export default function MainMetricCard({
  value,
  changePercent,
  label,
  trendData,
}: MainMetricCardProps) {
  const formatNumber = (num: number | string): string => {
    if (typeof num === "string") return num
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toString()
  }

  const formatPercent = (percent: number): string => {
    const sign = percent >= 0 ? "+" : ""
    return `${sign}${percent.toFixed(0)}%`
  }

  return (
    <Card className="p-6">
      {label && (
        <p className="text-sm text-text-secondary mb-2">{label}</p>
      )}
      <div className="flex items-baseline gap-3">
        <h2 className="text-4xl font-bold text-text">{formatNumber(value)}</h2>
        <span
          className={`text-lg font-semibold ${
            changePercent >= 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {formatPercent(changePercent)}
        </span>
      </div>
      {trendData && trendData.length > 0 && (
        <div className="mt-4 h-16 flex items-end gap-1">
          {trendData.map((point, index) => {
            const maxValue = Math.max(...trendData.map((p) => p.value))
            const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0
            return (
              <div
                key={index}
                className="flex-1 bg-primary/30 rounded-t hover:bg-primary/50 transition-colors"
                style={{ height: `${height}%` }}
                title={`${point.date}: ${point.value}`}
              />
            )
          })}
        </div>
      )}
    </Card>
  )
}
