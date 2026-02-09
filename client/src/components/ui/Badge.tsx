interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-4 py-2 rounded-full
                  bg-white/80 backdrop-blur-sm border border-gray-200
                  text-sm font-medium text-gray-700 shadow-sm ${className}`}
    >
      {children}
    </span>
  )
}
