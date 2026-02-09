import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple/50',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          {
            // Primary: gradient with depth
            'bg-gradient-to-r from-brand-teal to-brand-purple text-white': variant === 'primary',
            'shadow-[0_4px_14px_0_rgba(139,92,246,0.39)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.5)]': variant === 'primary',
            'hover:scale-[1.02] active:scale-[0.98]': variant === 'primary',

            // Secondary: subtle with hover
            'bg-white text-gray-900 border-2 border-gray-200': variant === 'secondary',
            'shadow-sm hover:shadow-md hover:border-gray-300': variant === 'secondary',
            'hover:bg-gray-50': variant === 'secondary',

            // Outline: brand colored
            'bg-transparent border-2 border-brand-purple text-brand-purple': variant === 'outline',
            'hover:bg-brand-purple hover:text-white': variant === 'outline',
            'shadow-sm hover:shadow-lg': variant === 'outline',

            // Sizes
            'text-sm px-6 py-2.5': size === 'sm',
            'text-base px-8 py-3.5': size === 'md',
            'text-lg px-10 py-4': size === 'lg',
          }
        ),
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
