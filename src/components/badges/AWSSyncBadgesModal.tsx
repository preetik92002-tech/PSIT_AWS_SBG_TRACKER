import React from 'react'
import {
  X,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Link2,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react'

interface AWSSyncBadgesModalProps {
  isOpen: boolean
  onClose: () => void
  alias?: string | null
  profileUrl?: string | null
  isConnected: boolean
}

export const AWSSyncBadgesModal: React.FC<AWSSyncBadgesModalProps> = ({
  isOpen,
  onClose,
  alias,
  profileUrl,
  isConnected,
}) => {
  if (!isOpen) return null

  const resolvedAlias = alias || '@builder'
  const resolvedUrl =
    profileUrl || `https://builder.aws.com/community/builders/${resolvedAlias.replace('@', '')}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xl p-6 sm:p-7 relative font-sans text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#FF9900]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button [X] */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#18202E] hover:bg-[#1F293A] border border-[#1F293A] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 flex items-center justify-center shrink-0">
            <Link2 size={20} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF9900] block">
              AWS Builder Center
            </span>
            <h2 className="text-base sm:text-lg font-bold font-mono tracking-tight text-white">
              AWS BUILDER CONNECTION
            </h2>
          </div>
        </div>

        {/* Informational Notice */}
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs leading-relaxed space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="font-semibold text-white">
              Badge synchronization will be available once AWS Builder Center badge data is connected.
            </div>
          </div>
          <p className="text-[11px] text-amber-300/80 pl-6 font-sans">
            To protect your account integrity, AWS Community Manager does not scrape or simulate third-party credentials. Official AWS Builder ID badge synchronization will be enabled via an upcoming supported integration.
          </p>
        </div>

        {/* Connection Specification Box */}
        <div className="p-4 rounded-xl bg-[#18202E] border border-[#1F293A] space-y-3 font-mono text-xs mb-5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Integration Status:</span>
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 size={11} /> CONNECTED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                NOT CONNECTED
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Builder Alias:</span>
            <span className="text-white font-bold">{resolvedAlias}</span>
          </div>

          <div>
            <span className="text-slate-400 font-sans block mb-1">Registered Profile:</span>
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#FF9900] hover:underline truncate block"
            >
              {resolvedUrl}
            </a>
          </div>
        </div>

        {/* Privacy & Security Assurances */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-5">
          <Lock size={13} className="text-emerald-400 shrink-0" />
          <span>Zero-credential storage: We never ask for or store your AWS password.</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#1F293A]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-300 hover:text-white bg-[#18202E] hover:bg-[#1F293A] border border-[#1F293A] transition-colors cursor-pointer"
          >
            Dismiss
          </button>

          <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs"
          >
            <span>View AWS Builder Profile</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}
