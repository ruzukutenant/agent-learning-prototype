import { useState, useRef, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'

interface MetricsCardProps {
  title: string
  value: string | number
  subtitle?: string
  tooltip?: string
  trend?: {
    value: number  // e.g., +2.3 or -1.5
    label?: string // e.g., "vs last period"
  }
  icon?: React.ReactNode
}

export function MetricsCard({
  title,
  value,
  subtitle,
  tooltip,
  trend,
  icon,
}: MetricsCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close tooltip on outside click
  useEffect(() => {
    if (!showTooltip) return
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setShowTooltip(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showTooltip])
  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-emerald-600'
    if (value < 0) return 'text-red-500'
    return 'text-gray-400'
  }

  const getTrendBg = (value: number) => {
    if (value > 0) return 'bg-emerald-50'
    if (value < 0) return 'bg-red-50'
    return 'bg-gray-50'
  }

  const formatTrend = (value: number) => {
    if (value > 0) return `+${value}`
    return `${value}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors relative">
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          {tooltip && (
            <div className="relative">
              <button
                ref={triggerRef}
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-gray-300 hover:text-gray-500 transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
              {showTooltip && (
                <div
                  ref={tooltipRef}
                  className="absolute z-10 left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-gray-900 text-white text-xs leading-relaxed rounded-lg px-3 py-2.5 shadow-lg"
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  {tooltip}
                </div>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-3xl font-semibold text-gray-900 tabular-nums mb-1">
        {value}
      </div>

      {/* Subtitle and Trend */}
      <div className="flex items-center justify-between">
        {subtitle && (
          <span className="text-sm text-gray-500">{subtitle}</span>
        )}
        {trend && (
          <div
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${getTrendBg(trend.value)} ${getTrendColor(trend.value)}`}
          >
            {trend.value > 0 && <TrendingUp className="w-3 h-3" />}
            {trend.value < 0 && <TrendingDown className="w-3 h-3" />}
            {trend.value === 0 && <Minus className="w-3 h-3" />}
            <span>{formatTrend(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
