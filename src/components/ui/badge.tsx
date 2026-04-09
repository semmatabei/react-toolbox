import * as React from 'react'
import { cn } from '@/lib/utils'

const Badge = ({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'outline' }) => (
  <div
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
      {
        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200': variant === 'default',
        'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200': variant === 'secondary',
        'border border-zinc-200 dark:border-zinc-700': variant === 'outline',
      },
      className,
    )}
    {...props}
  />
)

export { Badge }
