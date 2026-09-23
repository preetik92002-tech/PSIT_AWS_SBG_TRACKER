import React from 'react'
import { LucideIcon } from 'lucide-react'

interface AuthFormFieldProps {
  label: string
  name?: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  icon?: LucideIcon
  error?: string
  helperText?: string
  autoComplete?: string
  maxLength?: number
  className?: string
  rightElement?: React.ReactNode
}

export const AuthFormField: React.FC<AuthFormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  icon: Icon,
  error,
  helperText,
  autoComplete,
  maxLength,
  className = '',
  rightElement,
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        )}
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={`w-full py-2.5 text-sm rounded-lg border bg-white text-slate-900 transition-all ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-10' : 'pr-3.5'} ${
            readOnly || disabled
              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed select-none'
              : error
              ? 'border-rose-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20'
          }`}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-[11px] text-rose-600 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  )
}
