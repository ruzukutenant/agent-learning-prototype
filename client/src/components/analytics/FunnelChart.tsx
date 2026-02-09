import { Eye, MessageCircle, CheckCircle2, MousePointerClick, CalendarCheck, ArrowRight, AlertTriangle } from 'lucide-react'

interface FunnelStage {
  name: string
  count: number
  percentage: number
  dropOff: number
}

interface FunnelChartProps {
  stages: FunnelStage[]
}

// Map stage names to icons, labels, and colors
const stageConfig: Record<string, {
  icon: React.ReactNode
  label: string
  iconBg: string
  iconColor: string
}> = {
  'Landing Views': {
    icon: <Eye className="w-5 h-5" />,
    label: 'Landing',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
  },
  'Chats Started': {
    icon: <MessageCircle className="w-5 h-5" />,
    label: 'Started',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
  },
  'Chats Completed': {
    icon: <CheckCircle2 className="w-5 h-5" />,
    label: 'Completed',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  'Booking Clicked': {
    icon: <MousePointerClick className="w-5 h-5" />,
    label: 'Clicked',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  'Call Booked': {
    icon: <CalendarCheck className="w-5 h-5" />,
    label: 'Booked',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
}

const defaultConfig = {
  icon: <CheckCircle2 className="w-5 h-5" />,
  label: 'Stage',
  iconBg: 'bg-gray-100',
  iconColor: 'text-gray-500',
}

export function FunnelChart({ stages }: FunnelChartProps) {
  if (!stages || stages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No funnel data available
      </div>
    )
  }

  // Calculate conversion rates and find the lowest one
  const conversionRates: { index: number; rate: number }[] = []
  for (let i = 0; i < stages.length - 1; i++) {
    const current = stages[i]
    const next = stages[i + 1]
    const rate = current.count > 0 ? Math.round((next.count / current.count) * 100) : 0
    conversionRates.push({ index: i, rate })
  }

  // Find lowest conversion (only if there's actual data)
  const hasData = stages.some(s => s.count > 0)
  const lowestIndex = hasData && conversionRates.length > 0
    ? conversionRates.reduce((min, curr) => curr.rate < min.rate ? curr : min).index
    : -1

  return (
    <div className="py-6">
      {/* Funnel Visualization */}
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1
          const conversionRate = conversionRates.find(c => c.index === index)?.rate ?? null
          const isLowestConversion = index === lowestIndex && hasData

          const config = stageConfig[stage.name] || { ...defaultConfig, label: stage.name }

          return (
            <div key={stage.name} className="flex items-center flex-1">
              {/* Stage Card */}
              <div className="flex-1 flex flex-col items-center">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center ${config.iconColor} mb-3`}>
                  {config.icon}
                </div>

                {/* Label */}
                <div className="text-xs font-medium text-gray-500 mb-1">
                  {config.label}
                </div>

                {/* Count */}
                <div className="text-2xl font-bold text-gray-900 tabular-nums">
                  {stage.count.toLocaleString()}
                </div>
              </div>

              {/* Connector Arrow */}
              {!isLast && (
                <div className="flex flex-col items-center px-3 -mt-4">
                  <div className="flex items-center gap-1 mb-1">
                    <div className={`w-8 h-px ${isLowestConversion ? 'bg-amber-300' : 'bg-gray-200'}`} />
                    <ArrowRight className={`w-4 h-4 ${isLowestConversion ? 'text-amber-400' : 'text-gray-300'}`} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-xs font-semibold ${isLowestConversion ? 'text-amber-600' : 'text-gray-400'}`}>
                      {conversionRate}%
                    </span>
                    {isLowestConversion && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-600 mt-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        Lowest
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
