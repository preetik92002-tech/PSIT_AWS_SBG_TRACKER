import React from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'orange'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', leftIcon, rightIcon, loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-mono font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]'

    const variants = {
      primary: 'bg-accent hover:bg-accent-bright text-white border border-accent focus-visible:ring-accent',
      secondary: 'bg-surface-secondary hover:bg-surface-hover text-text-primary border border-border hover:border-border-bright',
      ghost: 'bg-transparent hover:bg-surface-secondary text-text-secondary hover:text-text-primary border border-transparent',
      danger: 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 hover:border-danger/60',
      orange: 'bg-accent-secondary hover:opacity-90 text-white border border-accent-secondary',
    }

    const sizes = {
      xs: 'px-2 py-1 text-[10px] h-6',
      sm: 'px-3 py-1.5 text-[11px] h-7',
      md: 'px-4 py-2 text-[12px] h-8',
      lg: 'px-5 py-2.5 text-[13px] h-10',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)
Button.displayName = 'Button'
