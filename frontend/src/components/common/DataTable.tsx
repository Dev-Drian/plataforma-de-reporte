import { useState, useMemo, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// import { useTheme } from '../../contexts/ThemeContext' // No usado actualmente
import Input from './Input'
import Button from './Button'

export interface Column<T> {
  key: string
  label: string
  render?: (value: any, row: T) => ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: string
}

export interface FilterConfig {
  key: string
  type: 'text' | 'select' | 'boolean'
  options?: { value: string; label: string }[]
  placeholder?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  filters?: FilterConfig[]
  searchable?: boolean
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  loading?: boolean
  actions?: (row: T) => ReactNode
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  filters = [],
  searchable = true,
  searchPlaceholder = 'Search...',
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
  actions
}: DataTableProps<T>) {
  // const { colors } = useTheme() // No usado actualmente
  const [searchTerm, setSearchTerm] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [expandedRows, _setExpandedRows] = useState<Set<number>>(new Set())

  const handleSort = (key: string) => {
    const column = columns.find(col => col.key === key)
    if (!column?.sortable) return

    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null
      }
      return { key, direction: 'asc' }
    })
  }

  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      result = result.filter(row =>
        columns.some(col => {
          const value = row[col.key]
          return value?.toString().toLowerCase().includes(searchLower)
        })
      )
    }

    // Apply filters
    filters.forEach(filter => {
      const filterValue = filterValues[filter.key]
      if (filterValue) {
        result = result.filter(row => {
          const value = row[filter.key]
          if (filter.type === 'boolean') {
            return value?.toString() === filterValue
          }
          return value?.toString().toLowerCase().includes(filterValue.toLowerCase())
        })
      }
    })

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1
        
        const comparison = aValue.toString().localeCompare(bValue.toString())
        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, searchTerm, filterValues, sortConfig, columns, filters])

  // const toggleRowExpansion = (index: number) => {
  //   setExpandedRows(prev => {
  //     const newSet = new Set(prev)
  //     if (newSet.has(index)) {
  //       newSet.delete(index)
  //     } else {
  //       newSet.add(index)
  //     }
  //     return newSet
  //   })
  // }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return (
        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0-12l-4 4m4-4l4 4" />
        </svg>
      )
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        {searchable && (
          <div className="flex-1">
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
        )}
        
        {filters.map(filter => (
          <div key={filter.key} className="md:w-48">
            {filter.type === 'select' && filter.options ? (
              <select
                value={filterValues[filter.key] || ''}
                onChange={(e) => setFilterValues(prev => ({ ...prev, [filter.key]: e.target.value }))}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">All</option>
                {filter.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'boolean' ? (
              <select
                value={filterValues[filter.key] || ''}
                onChange={(e) => setFilterValues(prev => ({ ...prev, [filter.key]: e.target.value }))}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <Input
                placeholder={filter.placeholder || `Filter by ${filter.key}`}
                value={filterValues[filter.key] || ''}
                onChange={(e) => setFilterValues(prev => ({ ...prev, [filter.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background/50">
              {columns.map(column => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={`
                    px-6 py-4 text-left text-sm font-semibold text-text
                    ${column.sortable ? 'cursor-pointer hover:bg-background/80 transition-colors' : ''}
                  `}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-4 text-left text-sm font-semibold text-text w-24">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-text-secondary">
                      <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((row, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={`
                      border-b border-border/50
                      ${onRowClick ? 'cursor-pointer hover:bg-background/50 transition-colors' : ''}
                      ${expandedRows.has(index) ? 'bg-background/30' : ''}
                    `}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map(column => (
                      <td key={column.key} className="px-6 py-4 text-sm text-text">
                        {column.render 
                          ? column.render(row[column.key], row)
                          : row[column.key]?.toString() || '-'
                        }
                      </td>
                    ))}
                    {actions && (
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Información de resultados */}
      {!loading && filteredAndSortedData.length > 0 && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <p>
            Mostrando <span className="font-semibold text-text">{filteredAndSortedData.length}</span> de{' '}
            <span className="font-semibold text-text">{data.length}</span> resultados
          </p>
          {(searchTerm || Object.values(filterValues).some(v => v)) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setFilterValues({})
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

