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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-9 relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#FF9900]">
            <KeyRound size={22} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Reset your password
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            Enter your registered builder email to receive recovery instructions.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                If an account exists for <strong className="text-[#0F172A]">{email}</strong>, a password reset link has been dispatched to your inbox.
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed text-center">
              Please check your inbox (including your spam folder) and click the link to configure a new password.
            </p>

            <Link
              to="/login"
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shadow-sm"
            >
              <ArrowLeft size={14} />
              <span>Return to Sign In</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="builder@institution.edu"
                  autoComplete="email"
                  disabled={isSubmitting}
                  required
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-slate-100 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
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
