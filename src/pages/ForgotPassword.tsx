import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout } from '@/components/auth/AuthLayout'

export const ForgotPassword: React.FC = () => {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await sendPasswordReset(email.trim())

      if (error) {
        setErrorMessage(error)
        setIsSubmitting(false)
        return
      }

      // Always show generic success state to avoid email enumeration
      setIsSuccess(true)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'A network error occurred while sending password recovery link.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout maxWidthClass="max-w-md">
      <div className="bg-[#121824] rounded-2xl border border-[#1F293A] shadow-xl p-6 sm:p-9 relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#FF9900]/10 border border-[#FF9900]/30 flex items-center justify-center text-[#FF9900]">
            <KeyRound size={22} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            Reset your password
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Enter your registered builder email to receive recovery instructions.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                If an account exists for <strong className="text-white">{email}</strong>, a password reset link has been dispatched to your inbox.
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed text-center">
              Please check your inbox (including your spam folder) and click the link to configure a new password.
            </p>

            <Link
              to="/login"
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-300 bg-[#18202E] hover:bg-[#1E293B] border border-[#1F293A] transition-colors shadow-sm"
            >
              <ArrowLeft size={14} />
              <span>Return to Sign In</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg border border-rose-800 bg-rose-950/40 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="builder@institution.edu"
                  autoComplete="email"
                  disabled={isSubmitting}
                  required
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-slate-950" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-[#1F293A] text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
