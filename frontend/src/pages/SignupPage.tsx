import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { resolveAuthContinuationPath } from '@/features/auth/authContinuationResolver'
import { formatAuthError, formatAuthErrorCode } from '@/features/auth/auth.error'
import { ROUTES } from '@/app/routes'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { signUp, signInWithGoogle, isLoading, isAuthenticated } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const source = searchParams.get('source')
  const errorCode = searchParams.get('error')

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.appRoot, { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (errorCode) {
      setError(formatAuthErrorCode(errorCode, 'Sign up failed.'))
      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.delete('error')
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [errorCode, searchParams, setSearchParams])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await signUp(name, email, password)
      navigate(
        resolveAuthContinuationPath({
          entryPoint: 'signup',
          source,
        }),
        { replace: true },
      )
    } catch (submitError) {
      setError(formatAuthError(submitError, 'Unable to sign up'))
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute right-[-10%] top-[-24%] h-115 w-115 rounded-full bg-[radial-gradient(circle,rgba(15,76,92,0.16),rgba(15,76,92,0))]" />
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-6 py-10 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Start Matching</p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight text-slate-900">
            Create your account and unlock roommate matches built around your lifestyle.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Build your profile once and get ranked recommendations, safer conversations, and better fit from day one.
          </p>
        </section>

        <form
          className="w-full rounded-2xl border border-neutral-border bg-surface p-6 shadow-[0_28px_70px_-50px_rgba(15,76,92,0.55)] md:p-8"
          onSubmit={handleSubmit}
        >
          <h2 className="text-2xl font-semibold text-slate-900">Create account</h2>
          <p className="mt-2 text-sm text-slate-600">Use your email and password to create your account.</p>

          {source === 'questionnaire' ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Questionnaire answers were saved and will prefill onboarding after signup.
            </div>
          ) : null}

          <label htmlFor="signup-name" className="mt-6 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Full name
          </label>
          <Input
            id="signup-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-12"
            placeholder="Your name"
          />

          <label htmlFor="signup-email" className="mt-4 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Email
          </label>
          <Input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-12"
            placeholder="name@email.com"
          />

          <label htmlFor="signup-password" className="mt-4 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Password
          </label>
          <Input
            id="signup-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12"
            placeholder="At least 8 characters"
          />

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-6 w-full"
            onClick={() => signInWithGoogle(source || undefined)}
          >
            Continue with Google
          </Button>

          <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-6 w-full"
            disabled={isLoading}
            isLoading={isLoading}
          >
            Create account
          </Button>

          <p className="mt-5 text-sm text-slate-600">
            Already have an account?{' '}
            <Link to={ROUTES.login} className="font-semibold text-primary hover:text-primary-dark">
              Sign in
            </Link>
          </p>

          {source === 'questionnaire' ? (
            <p className="mt-2 text-sm text-slate-600">
              Want to adjust your answers?{' '}
              <Link to={ROUTES.start} className="font-semibold text-primary hover:text-primary-dark">
                Return to questionnaire
              </Link>
            </p>
          ) : null}
        </form>
      </div>
    </div>
  )
}
