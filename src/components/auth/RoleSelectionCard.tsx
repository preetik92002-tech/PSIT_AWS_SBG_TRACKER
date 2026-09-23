import React from 'react'
import { CheckCircle2, LucideIcon } from 'lucide-react'

interface RoleSelectionCardProps {
  roleId: 'manager' | 'member'
  title: string
  description: string
  icon: LucideIcon
  isSelected: boolean
  onSelect: (roleId: 'manager' | 'member') => void
}

export const RoleSelectionCard: React.FC<RoleSelectionCardProps> = ({
  roleId,
  title,
  description,
  icon: Icon,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(roleId)}
      className={`relative cursor-pointer rounded-xl border p-3.5 transition-all duration-150 select-none ${
        isSelected
          ? 'border-[#FF9900] bg-[#FFFBF5] shadow-xs ring-1 ring-[#FF9900]'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected
              ? 'bg-orange-100/80 text-[#FF9900]'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Icon size={16} />
        </div>

        {/* Orange Radio Indicator */}
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
            isSelected
              ? 'border-[#FF9900] bg-white'
              : 'border-slate-300 bg-white'
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-[#FF9900]" />}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900">
          {title}
        </h3>
        <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
          {description}
        </p>
      </div>
    </div>
  )
}
