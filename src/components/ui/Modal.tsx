import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={ref}
            className={cn(
              'relative w-full bg-[var(--surface)] border border-[var(--border-bright)]',
              'shadow-2xl overflow-hidden',
              sizes[size],
              className
            )}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Pixel corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-[var(--accent)]" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-[var(--accent-secondary)]" />

            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between p-4 border-b border-[var(--border)]">
                <div>
                  {title && (
                    <h2 className="font-mono font-bold text-sm text-text-primary tracking-tight">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-xs text-text-secondary mt-0.5 font-mono">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-text-muted hover:text-text-primary transition-colors ml-4 p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[80vh]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
