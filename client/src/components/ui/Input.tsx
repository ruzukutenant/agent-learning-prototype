import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-6 py-4 rounded-full border transition-all duration-200',
              'text-gray-900 text-lg bg-white',
              'placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-transparent',
              'shadow-sm',
              {
                'border-gray-200 hover:border-gray-300': !error,
                'border-red-500 focus:ring-red-500/50': error,
              }
            ),
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
