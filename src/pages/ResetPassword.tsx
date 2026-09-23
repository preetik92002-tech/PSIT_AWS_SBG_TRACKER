import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout } from '@/components/auth/AuthLayout'

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const { updatePassword, role } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await updatePassword(password)

      if (error) {
        setErrorMessage(error)
        setIsSubmitting(false)
        return
      }

      setIsSuccess(true)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while updating your password.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProceed = () => {
    const target = role === 'admin' ? '/admin/dashboard' : '/dashboard'
    navigate(target, { replace: true })
  }

  return (
    <AuthLayout maxWidthClass="max-w-md">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-9 relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#FF9900]">
            <Lock size={22} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Set new password
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            Choose a strong password for your AWS Builder Hub account.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Your password has been successfully updated! You can now proceed to your workspace.
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceed}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Enter Workspace</span>
              <ArrowRight size={16} />
            </button>
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
                New Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  disabled={isSubmitting}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={isSubmitting}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20 transition-all disabled:opacity-50"
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
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Set New Password</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-slate-100 text-center">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel and return to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
