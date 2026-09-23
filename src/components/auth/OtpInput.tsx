import React, { useRef, useEffect } from 'react'

interface OtpInputProps {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
  hasError?: boolean
  isSuccess?: boolean
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  disabled = false,
  hasError = false,
  isSuccess = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus first input on mount if empty
    if (!disabled && value.every((v) => !v)) {
      inputRefs.current[0]?.focus()
    }
  }, [disabled])

  const handleInputChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '')
    if (!cleanVal) {
      const newOtp = [...value]
      newOtp[index] = ''
      onChange(newOtp)
      return
    }

    const char = cleanVal.slice(-1)
    const newOtp = [...value]
    newOtp[index] = char
    onChange(newOtp)

    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    const digits = pastedData.replace(/[^0-9]/g, '').slice(0, 6).split('')

    if (digits.length > 0) {
      const newOtp = [...value]
      digits.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit
      })
      onChange(newOtp)

      const targetIdx = Math.min(digits.length, 5)
      inputRefs.current[targetIdx]?.focus()
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleInputChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of 6`}
          className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono rounded-lg border-2 bg-white text-slate-900 transition-all disabled:opacity-50 ${
            hasError
              ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : isSuccess
              ? 'border-emerald-400 bg-emerald-50/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-emerald-800'
              : 'border-slate-300 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-orange-500/20'
          }`}
        />
      ))}
    </div>
  )
}
