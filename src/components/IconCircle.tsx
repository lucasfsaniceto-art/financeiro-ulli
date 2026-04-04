'use client'

import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface IconCircleProps {
  icon: LucideIcon
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
  className?: string
}

const sizeMap = {
  sm: { container: 'w-8 h-8', icon: 14 },
  md: { container: 'w-10 h-10', icon: 18 },
  lg: { container: 'w-12 h-12', icon: 20 },
}

export default function IconCircle({ icon: Icon, size = 'md', active = true, className }: IconCircleProps) {
  const s = sizeMap[size]
  return (
    <div className={cn(
      s.container,
      'rounded-full flex items-center justify-center flex-shrink-0',
      active ? 'bg-accent-subtle' : 'bg-transparent',
      className
    )}>
      <Icon
        size={s.icon}
        strokeWidth={1.5}
        className={active ? 'text-accent' : 'text-text-muted'}
      />
    </div>
  )
}
