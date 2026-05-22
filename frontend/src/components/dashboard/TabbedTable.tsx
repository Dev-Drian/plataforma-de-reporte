import { useState, useMemo } from "react"
import Card from "../common/Card"

export type TabType = "all" | "growing" | "decaying"

export interface TabbedTableItem {
  id: string
  name: string
  clicks: number
  changePercent: number
  [key: string]: any // Para permitir campos adicionales
}

interface TabbedTableProps {
  title: string
  items: TabbedTableItem[]
  tabs?: TabType[]
  onExpand?: () => void
  maxItems?: number
  renderItem?: (item: TabbedTableItem) => React.ReactNode
}

export default function TabbedTable({
  title,
  items,
  tabs = ["all", "growing", "decaying"],
  onExpand,
  maxItems = 10,
  renderItem,
}: TabbedTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all")

  const filteredItems = useMemo(() => {
    let filtered = items

    if (activeTab === "growing") {
      filtered = items.filter((item) => item.changePercent > 0)
    } else if (activeTab === "decaying") {
      filtered = items.filter((item) => item.changePercent < 0)
    }

    // Ordenar por clicks descendente
    filtered = [...filtered].sort((a, b) => b.clicks - a.clicks)

    return filtered.slice(0, maxItems)
  }, [items, activeTab, maxItems])

  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toString()
  }

  const formatPercent = (percent: number): string => {
    const sign = percent >= 0 ? "+" : ""
    return `${sign}${percent.toFixed(0)}%`
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text">{title}</h3>
        <div className="flex gap-1">
          {tabs.includes("all") && (
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === "all"
                  ? "bg-primary text-white"
                  : "bg-background-secondary text-text-secondary hover:bg-background"
              }`}
            >
              All
            </button>
          )}
          {tabs.includes("growing") && (
            <button
              onClick={() => setActiveTab("growing")}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === "growing"
                  ? "bg-primary text-white"
                  : "bg-background-secondary text-text-secondary hover:bg-background"
              }`}
            >
              Growing
            </button>
          )}
          {tabs.includes("decaying") && (
            <button
              onClick={() => setActiveTab("decaying")}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === "decaying"
                  ? "bg-primary text-white"
                  : "bg-background-secondary text-text-secondary hover:bg-background"
              }`}
            >
              Decaying
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-text-secondary pb-2 border-b border-border">
          <div className="col-span-7">Name</div>
          <div className="col-span-3 text-right">Clicks</div>
          <div className="col-span-2 text-right">Change</div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-text-secondary text-sm">
            No items found
          </div>
        ) : (
          <>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 py-2 hover:bg-background-secondary rounded transition-colors"
              >
                <div className="col-span-7">
                  {renderItem ? (
                    renderItem(item)
                  ) : (
                    <span className="text-sm text-text truncate block" title={item.name}>
                      {item.name}
                    </span>
                  )}
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm font-medium text-text">{formatNumber(item.clicks)}</span>
                </div>
                <div className="col-span-2 text-right">
                  <span
                    className={`text-sm font-medium ${
                      item.changePercent >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {formatPercent(item.changePercent)}
                  </span>
                </div>
              </div>
            ))}

            {onExpand && items.length > maxItems && (
              <button
                onClick={onExpand}
                className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors mt-2"
              >
                Expand
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
