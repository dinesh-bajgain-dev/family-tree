import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FamilyMember } from '../../types'

export interface MemberNodeData {
  member: FamilyMember
  hasChildren?: boolean
  isCollapsed?: boolean
  isHighlighted?: boolean
  isSelected?: boolean
  onToggleCollapse?: (memberId: string) => void
  onSelect?: (memberId: string) => void
  [key: string]: unknown
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function MemberNode({ data }: NodeProps) {
  const { member, hasChildren, isCollapsed, isHighlighted, isSelected, onToggleCollapse, onSelect } =
    data as MemberNodeData

  return (
    <div
      onClick={() => onSelect?.(member.id)}
      className={`glass relative w-[220px] cursor-pointer rounded-xl px-3 py-2.5 shadow-md transition-all ${
        isHighlighted ? 'ring-2 ring-brand-500' : ''
      } ${isSelected ? 'ring-2 ring-amber-400' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-ink-300" />
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold ${
            member.is_living
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
              : 'bg-ink-200 text-ink-500 dark:bg-ink-700 dark:text-ink-300'
          }`}
        >
          {member.profile_photo ? (
            <img src={member.profile_photo} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(member.full_name || '?')
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
            {member.full_name}
          </p>
          <p className="truncate text-xs text-ink-500 dark:text-ink-400">
            {member.date_of_birth ? new Date(member.date_of_birth).getFullYear() : '—'}
            {!member.is_living && ' · deceased'}
          </p>
        </div>
      </div>
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleCollapse?.(member.id)
          }}
          className="absolute -bottom-2.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-ink-200 bg-white text-xs text-ink-500 shadow dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"
        >
          {isCollapsed ? '+' : '−'}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-ink-300" />
    </div>
  )
}
