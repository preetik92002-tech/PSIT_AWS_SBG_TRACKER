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
          ? 'border-[#FF9900] bg-[#FF9900]/10 shadow-xs ring-1 ring-[#FF9900]'
          : 'border-[#1F293A] bg-[#121824] hover:border-slate-600 hover:bg-[#18202E]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected
              ? 'bg-[#FF9900]/20 text-[#FF9900]'
              : 'bg-[#18202E] text-slate-400'
          }`}
        >
          <Icon size={16} />
        </div>

        {/* Orange Radio Indicator */}
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
            isSelected
              ? 'border-[#FF9900] bg-[#0E141F]'
              : 'border-[#1F293A] bg-[#0E141F]'
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-[#FF9900]" />}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">
          {title}
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
          {description}
        </p>
      </div>
    </div>
  )
}
