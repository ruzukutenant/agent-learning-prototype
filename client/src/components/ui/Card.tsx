import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface CardProps {
  className?: string
  children: React.ReactNode
  highlight?: boolean
}

export function Card({ className, children, highlight = false }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white rounded-2xl shadow-sm',
          'p-6',
          {
            'border border-gray-100': !highlight,
            'border-2 border-brand-purple': highlight,
          }
        ),
        className
      )}
    >
      {children}
    </div>
  )
}
