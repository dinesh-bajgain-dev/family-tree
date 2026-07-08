import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`glass rounded-2xl shadow-lg shadow-ink-900/5 dark:shadow-black/20 ${className}`}
      {...props}
    />
  )
}
