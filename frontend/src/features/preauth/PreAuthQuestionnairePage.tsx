import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DEFAULT_FORM_DATA, PRIORITY_LABELS } from '@/features/onboarding/onboarding.mapper'
import { AUTH_SOURCE, ROUTES, buildPathWithQuery } from '@/app/routes'
import {
  savePreAuthQuestionnaireDraft,
  type PreAuthQuestionnaireDraft,
} from '@/features/preauth/preauth.storage'
import type { OnboardingFormData } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const INITIAL_DRAFT: PreAuthQuestionnaireDraft = {
  hasRoom: DEFAULT_FORM_DATA.hasRoom,
  city: DEFAULT_FORM_DATA.city,
  minBudget: DEFAULT_FORM_DATA.minBudget,
  maxBudget: DEFAULT_FORM_DATA.maxBudget,
  sleepSchedule: DEFAULT_FORM_DATA.sleepSchedule,
  cleanliness: DEFAULT_FORM_DATA.cleanliness,
  socialLevel: DEFAULT_FORM_DATA.socialLevel,
  genderPreference: DEFAULT_FORM_DATA.genderPreference,
  priorityOrder: [...DEFAULT_FORM_DATA.priorityOrder],
}

function stepTitle(step: number): string {
  if (step === 1) {
    return 'Housing intent'
  }
  if (step === 2) {
    return 'Budget envelope'
  }
  if (step === 3) {
    return 'Lifestyle fit'
  }
  return 'Priority ranking'
}

export function PreAuthQuestionnairePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<PreAuthQuestionnaireDraft>(INITIAL_DRAFT)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof PreAuthQuestionnaireDraft>(
    key: K,
    value: PreAuthQuestionnaireDraft[K],
  ): void {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function movePriority(index: number, direction: -1 | 1): void {
    setDraft((prev) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= prev.priorityOrder.length) {
        return prev
      }

      const nextOrder = [...prev.priorityOrder]
      const [item] = nextOrder.splice(index, 1)
      nextOrder.splice(nextIndex, 0, item)

      return {
        ...prev,
        priorityOrder: nextOrder,
      }
    })
  }

  function validateCurrentStep(): string | null {
    if (step === 1 && draft.city.trim().length < 2) {
      return 'City is required before continuing.'
    }

    if (step === 2) {
      if (draft.minBudget < 0 || draft.maxBudget < 0) {
        return 'Budget must be non-negative.'
      }
      if (draft.maxBudget < draft.minBudget) {
        return 'Maximum budget must be greater than or equal to minimum budget.'
      }
    }

    return null
  }

  function goNext(): void {
    const validationError = validateCurrentStep()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setStep((prev) => Math.min(prev + 1, 4))
  }

  function goBack(): void {
    setError(null)
    setStep((prev) => Math.max(prev - 1, 1))
  }

  function handoff(path: typeof ROUTES.signup | typeof ROUTES.login): void {
    const validationError = validateCurrentStep()
    if (validationError) {
      setError(validationError)
      return
    }

    savePreAuthQuestionnaireDraft(draft)
    navigate({
      pathname: path,
      search: buildPathWithQuery('', { source: AUTH_SOURCE.questionnaire }),
    })
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="rounded-2xl border border-neutral-border bg-surface p-6 shadow-[0_26px_70px_-52px_rgba(15,76,92,0.55)] md:p-8">
        <header className="border-b border-neutral-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Pre-user questionnaire</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Tell us your baseline before account creation.</h1>
          <p className="mt-2 text-sm text-slate-600">This takes under a minute and pre-fills your onboarding after sign up.</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
            Step {step} of 4 · {stepTitle(step)}
          </p>
        </header>

        <div className="mt-5 space-y-5">
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800">What is your current housing intent?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => update('hasRoom', true)}
                  className={[
                    'rounded-xl border px-4 py-4 text-left transition-colors',
                    draft.hasRoom
                      ? 'border-primary bg-mint text-primary'
                      : 'border-neutral-border text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <p className="font-semibold">I have a room</p>
                  <p className="mt-1 text-sm">I want a compatible person to join.</p>
                </button>
                <button
                  type="button"
                  onClick={() => update('hasRoom', false)}
                  className={[
                    'rounded-xl border px-4 py-4 text-left transition-colors',
                    !draft.hasRoom
                      ? 'border-primary bg-mint text-primary'
                      : 'border-neutral-border text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <p className="font-semibold">I need a room</p>
                  <p className="mt-1 text-sm">I am searching for a fit and a place.</p>
                </button>
              </div>

              <label className="block text-sm">
                <span className="font-medium text-slate-700">City</span>
                <Input
                  type="text"
                  value={draft.city}
                  onChange={(event) => update('city', event.target.value)}
                  className="mt-2 h-12 rounded-xl"
                  placeholder="Where are you searching?"
                />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Minimum budget</span>
                <Input
                  type="number"
                  min={0}
                  value={draft.minBudget}
                  onChange={(event) => update('minBudget', Number(event.target.value))}
                  className="mt-2 h-12 rounded-xl"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Maximum budget</span>
                <Input
                  type="number"
                  min={0}
                  value={draft.maxBudget}
                  onChange={(event) => update('maxBudget', Number(event.target.value))}
                  className="mt-2 h-12 rounded-xl"
                />
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Sleep style</span>
                <select
                  value={draft.sleepSchedule}
                  onChange={(event) =>
                    update('sleepSchedule', event.target.value as OnboardingFormData['sleepSchedule'])
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="early-bird">Early bird</option>
                  <option value="flexible">Flexible</option>
                  <option value="night-owl">Night owl</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="font-medium text-slate-700">Cleanliness preference ({draft.cleanliness}/5)</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={draft.cleanliness}
                  onChange={(event) => update('cleanliness', Number(event.target.value))}
                  className="mt-2 w-full accent-primary"
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-slate-700">Social preference ({draft.socialLevel}/5)</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={draft.socialLevel}
                  onChange={(event) => update('socialLevel', Number(event.target.value))}
                  className="mt-2 w-full accent-primary"
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-slate-700">Gender preference</span>
                <select
                  value={draft.genderPreference}
                  onChange={(event) =>
                    update('genderPreference', event.target.value as OnboardingFormData['genderPreference'])
                  }
                  className="mt-2 w-full rounded-xl border border-neutral-border px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="any">Any</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800">Rank what matters most</p>
              <div className="space-y-2">
                {draft.priorityOrder.map((key, index) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-neutral-border px-4 py-3"
                  >
                    <p className="text-sm font-medium text-slate-800">{index + 1}. {PRIORITY_LABELS[key]}</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => movePriority(index, -1)}
                        disabled={index === 0}
                      >
                        Up
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => movePriority(index, 1)}
                        disabled={index === draft.priorityOrder.length - 1}
                      >
                        Down
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-neutral-border bg-canvas p-4 text-sm text-slate-600">
                We will pre-fill your onboarding with these answers right after account creation.
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 1}
            >
              Back
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                onClick={goNext}
              >
                Continue
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => handoff(ROUTES.signup)}
                >
                  Continue to sign up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handoff(ROUTES.login)}
                >
                  I already have an account
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        Want to skip this for now? <Link to={ROUTES.signup} className="font-semibold text-primary">Go straight to account creation.</Link>
      </p>
    </section>
  )
}