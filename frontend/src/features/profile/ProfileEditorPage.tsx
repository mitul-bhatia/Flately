import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch } from '@/app/hooks'
import {
  ProfilePhotoManager,
  type CloudinaryStatusState,
} from '@/features/profile/ProfilePhotoManager'
import { setProfile } from '@/features/profile/profileSlice'
import {
  getCloudinaryUploadAvailability,
  uploadImageToCloudinary,
} from '@/services/cloudinary'
import { toApiErrorMessage } from '@/services/api'
import { getMyPreferences, saveMyPreferences } from '@/services/preferences.transport'
import { getMyProfile, saveMyProfile } from '@/services/profile.transport'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Tab = 'profile' | 'preferences'

type ProfileFormState = {
  name: string
  age: number
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say'
  bio: string
  occupation: 'student' | 'professional'
  photos: string[]
  city: string
  hasRoom: boolean
  sleepSchedule: 'early-bird' | 'night-owl' | 'flexible'
  noiseLevel: number
  guestPolicy: 'never' | 'rarely' | 'sometimes' | 'often'
  smoking: 'no' | 'outside' | 'yes'
  pets: 'no' | 'have' | 'love' | 'allergic'
}

type PreferenceFormState = {
  genderPreference: 'male' | 'female' | 'any'
  minBudget: number
  maxBudget: number
  city: string
  cleanliness: number
  sleepSchedule: number
  smoking: boolean
  drinking: boolean
  pets: boolean
  socialLevel: number
  weightCleanliness: number
  weightSleep: number
  weightHabits: number
  weightSocial: number
}

function getDefaultProfileForm(): ProfileFormState {
  return {
    name: '',
    age: 24,
    gender: 'prefer-not-to-say',
    bio: '',
    occupation: 'professional',
    photos: [],
    city: '',
    hasRoom: false,
    sleepSchedule: 'flexible',
    noiseLevel: 3,
    guestPolicy: 'sometimes',
    smoking: 'no',
    pets: 'no',
  }
}

function getDefaultPreferenceForm(city = ''): PreferenceFormState {
  return {
    genderPreference: 'any',
    minBudget: 500,
    maxBudget: 1200,
    city,
    cleanliness: 3,
    sleepSchedule: 3,
    smoking: false,
    drinking: false,
    pets: false,
    socialLevel: 3,
    weightCleanliness: 25,
    weightSleep: 25,
    weightHabits: 25,
    weightSocial: 25,
  }
}

export function ProfileEditorPage() {
  const dispatch = useAppDispatch()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [cloudinaryStatus, setCloudinaryStatus] = useState<CloudinaryStatusState>('checking')
  const [profileForm, setProfileForm] = useState<ProfileFormState>(getDefaultProfileForm())
  const [preferenceForm, setPreferenceForm] = useState<PreferenceFormState>(
    getDefaultPreferenceForm(),
  )

  useEffect(() => {
    let cancelled = false

    async function loadCloudinaryStatus(): Promise<void> {
      try {
        const status = await getCloudinaryUploadAvailability()
        if (!cancelled) {
          setCloudinaryStatus(status)
        }
      } catch {
        if (!cancelled) {
          setCloudinaryStatus('unavailable')
        }
      }
    }

    loadCloudinaryStatus()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setLoading(true)
      setError(null)

      try {
        const [profile, preferences] = await Promise.all([
          getMyProfile(),
          getMyPreferences(),
        ])

        if (cancelled) {
          return
        }

        const nextProfile = profile
          ? {
              name: profile.name || '',
              age: profile.age ?? 24,
              gender: profile.gender || 'prefer-not-to-say',
              bio: profile.bio || '',
              occupation: profile.occupation || 'professional',
              photos: profile.photos || [],
              city: profile.city || '',
              hasRoom: profile.hasRoom,
              sleepSchedule: profile.sleepSchedule || 'flexible',
              noiseLevel: profile.noiseLevel ?? 3,
              guestPolicy: profile.guestPolicy || 'sometimes',
              smoking: profile.smoking || 'no',
              pets: profile.pets || 'no',
            }
          : getDefaultProfileForm()

        setProfileForm(nextProfile)

        const nextPreferences = preferences
          ? {
              genderPreference: preferences.genderPreference,
              minBudget: preferences.minBudget,
              maxBudget: preferences.maxBudget,
              city: preferences.city,
              cleanliness: preferences.cleanliness,
              sleepSchedule: preferences.sleepSchedule,
              smoking: preferences.smoking,
              drinking: preferences.drinking,
              pets: preferences.pets,
              socialLevel: preferences.socialLevel,
              weightCleanliness: preferences.weightCleanliness,
              weightSleep: preferences.weightSleep,
              weightHabits: preferences.weightHabits,
              weightSocial: preferences.weightSocial,
            }
          : getDefaultPreferenceForm(nextProfile.city)

        setPreferenceForm(nextPreferences)
      } catch (loadError) {
        if (!cancelled) {
          setError(toApiErrorMessage(loadError, 'Failed to load profile editor data'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  function retryLoad(): void {
    setReloadToken((value) => value + 1)
  }

  const weightsTotal = useMemo(
    () =>
      preferenceForm.weightCleanliness +
      preferenceForm.weightSleep +
      preferenceForm.weightHabits +
      preferenceForm.weightSocial,
    [preferenceForm],
  )

  async function onUploadPhoto(file: File): Promise<void> {
    setError(null)
    setNotice(null)
    setUploading(true)

    try {
      const uploadedUrl = await uploadImageToCloudinary(file)
      setProfileForm((prev) => ({
        ...prev,
        photos: prev.photos.includes(uploadedUrl) ? prev.photos : [...prev.photos, uploadedUrl],
      }))
    } catch (uploadError) {
      setError(toApiErrorMessage(uploadError, 'Image upload failed'))
    } finally {
      setUploading(false)
    }
  }

  function removePhoto(url: string): void {
    setNotice(null)
    setProfileForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((photo) => photo !== url),
    }))
  }

  function setPrimaryPhoto(index: number): void {
    setNotice(null)
    setProfileForm((prev) => {
      if (index <= 0 || index >= prev.photos.length) {
        return prev
      }

      const nextPhotos = [...prev.photos]
      const [primaryPhoto] = nextPhotos.splice(index, 1)
      nextPhotos.unshift(primaryPhoto)

      return {
        ...prev,
        photos: nextPhotos,
      }
    })
  }

  async function saveCurrentTab(): Promise<void> {
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      if (activeTab === 'profile') {
        if (profileForm.name.trim().length < 2) {
          setError('Name must be at least 2 characters.')
          return
        }

        if (profileForm.city.trim().length < 2) {
          setError('City is required.')
          return
        }

        const savedProfile = await saveMyProfile({
          name: profileForm.name.trim(),
          age: profileForm.age,
          gender: profileForm.gender,
          bio: profileForm.bio.trim(),
          occupation: profileForm.occupation,
          photos: profileForm.photos,
          city: profileForm.city.trim(),
          hasRoom: profileForm.hasRoom,
          sleepSchedule: profileForm.sleepSchedule,
          noiseLevel: profileForm.noiseLevel,
          guestPolicy: profileForm.guestPolicy,
          smoking: profileForm.smoking,
          pets: profileForm.pets,
        })

        dispatch(setProfile(savedProfile))
        setNotice('Profile saved.')
        return
      }

      if (preferenceForm.maxBudget < preferenceForm.minBudget) {
        setError('Maximum budget must be greater than or equal to minimum budget.')
        return
      }

      if (weightsTotal !== 100) {
        setError('Weights must sum to 100.')
        return
      }

      await saveMyPreferences({
        genderPreference: preferenceForm.genderPreference,
        minBudget: preferenceForm.minBudget,
        maxBudget: preferenceForm.maxBudget,
        city: preferenceForm.city.trim(),
        cleanliness: preferenceForm.cleanliness,
        sleepSchedule: preferenceForm.sleepSchedule,
        smoking: preferenceForm.smoking,
        drinking: preferenceForm.drinking,
        pets: preferenceForm.pets,
        socialLevel: preferenceForm.socialLevel,
        weightCleanliness: preferenceForm.weightCleanliness,
        weightSleep: preferenceForm.weightSleep,
        weightHabits: preferenceForm.weightHabits,
        weightSocial: preferenceForm.weightSocial,
      })

      setNotice('Preferences saved.')
    } catch (saveError) {
      setError(toApiErrorMessage(saveError, 'Failed to save changes'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading profile editor...</p>
  }

  return (
    <section className="space-y-4 rounded-lg border border-neutral-border bg-surface p-5">
      <header className="border-b border-neutral-border pb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Profile Editor</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">Manage profile and matching preferences</h2>
        <button
          type="button"
          onClick={retryLoad}
          className="mt-3 rounded border border-neutral-border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={[
            'rounded-md border px-3 py-2 text-sm font-semibold',
            activeTab === 'profile'
              ? 'border-primary bg-mint text-primary'
              : 'border-neutral-border text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          My Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={[
            'rounded-md border px-3 py-2 text-sm font-semibold',
            activeTab === 'preferences'
              ? 'border-primary bg-mint text-primary'
              : 'border-neutral-border text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          Preferences
        </button>
      </div>

      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {activeTab === 'profile' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <ProfilePhotoManager
              photos={profileForm.photos}
              cloudinaryStatus={cloudinaryStatus}
              uploading={uploading}
              onUploadFile={onUploadPhoto}
              onRemovePhoto={removePhoto}
              onSetPrimary={setPrimaryPhoto}
              statusTestId="profile-cloudinary-status-badge"
              uploadButtonLabel="Choose photo"
              emptyStateLabel="No photos yet. Add one so others can recognize you."
            />
          </div>

          <label className="text-sm">
            <span className="font-medium text-slate-700">Name</span>
            <Input
              type="text"
              value={profileForm.name}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Age</span>
            <Input
              type="number"
              min={18}
              max={99}
              value={profileForm.age}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, age: Number(event.target.value) }))
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">City</span>
            <Input
              type="text"
              value={profileForm.city}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, city: event.target.value }))
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Occupation</span>
            <select
              value={profileForm.occupation}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  occupation: event.target.value as ProfileFormState['occupation'],
                }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="student">Student</option>
              <option value="professional">Professional</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Bio</span>
            <textarea
              rows={4}
              value={profileForm.bio}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, bio: event.target.value }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Has Room</span>
            <select
              value={profileForm.hasRoom ? 'yes' : 'no'}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, hasRoom: event.target.value === 'yes' }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Gender</span>
            <select
              value={profileForm.gender}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  gender: event.target.value as ProfileFormState['gender'],
                }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Sleep Schedule</span>
            <select
              value={profileForm.sleepSchedule}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  sleepSchedule: event.target.value as ProfileFormState['sleepSchedule'],
                }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="early-bird">Early Bird</option>
              <option value="flexible">Flexible</option>
              <option value="night-owl">Night Owl</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Noise Level ({profileForm.noiseLevel}/5)</span>
            <input
              type="range"
              min={1}
              max={5}
              value={profileForm.noiseLevel}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, noiseLevel: Number(event.target.value) }))
              }
              className="mt-2 w-full accent-primary"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Guest Policy</span>
            <select
              value={profileForm.guestPolicy}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  guestPolicy: event.target.value as ProfileFormState['guestPolicy'],
                }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="never">Never</option>
              <option value="rarely">Rarely</option>
              <option value="sometimes">Sometimes</option>
              <option value="often">Often</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Smoking</span>
            <select
              value={profileForm.smoking}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  smoking: event.target.value as ProfileFormState['smoking'],
                }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="no">No</option>
              <option value="outside">Outside</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Pets</span>
            <select
              value={profileForm.pets}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  pets: event.target.value as ProfileFormState['pets'],
                }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="no">No</option>
              <option value="have">Have</option>
              <option value="love">Love</option>
              <option value="allergic">Allergic</option>
            </select>
          </label>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-slate-700">Gender Preference</span>
            <select
              value={preferenceForm.genderPreference}
              onChange={(event) =>
                setPreferenceForm((prev) => ({
                  ...prev,
                  genderPreference: event.target.value as PreferenceFormState['genderPreference'],
                }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="any">Any</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">City</span>
            <Input
              type="text"
              value={preferenceForm.city}
              onChange={(event) =>
                setPreferenceForm((prev) => ({ ...prev, city: event.target.value }))
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Minimum Budget</span>
            <Input
              type="number"
              min={0}
              value={preferenceForm.minBudget}
              onChange={(event) =>
                setPreferenceForm((prev) => ({ ...prev, minBudget: Number(event.target.value) }))
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Maximum Budget</span>
            <Input
              type="number"
              min={0}
              value={preferenceForm.maxBudget}
              onChange={(event) =>
                setPreferenceForm((prev) => ({ ...prev, maxBudget: Number(event.target.value) }))
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Cleanliness ({preferenceForm.cleanliness}/5)</span>
            <input
              type="range"
              min={1}
              max={5}
              value={preferenceForm.cleanliness}
              onChange={(event) =>
                setPreferenceForm((prev) => ({ ...prev, cleanliness: Number(event.target.value) }))
              }
              className="mt-2 w-full accent-primary"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Sleep Score ({preferenceForm.sleepSchedule}/5)</span>
            <input
              type="range"
              min={1}
              max={5}
              value={preferenceForm.sleepSchedule}
              onChange={(event) =>
                setPreferenceForm((prev) => ({ ...prev, sleepSchedule: Number(event.target.value) }))
              }
              className="mt-2 w-full accent-primary"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Social Level ({preferenceForm.socialLevel}/5)</span>
            <input
              type="range"
              min={1}
              max={5}
              value={preferenceForm.socialLevel}
              onChange={(event) =>
                setPreferenceForm((prev) => ({ ...prev, socialLevel: Number(event.target.value) }))
              }
              className="mt-2 w-full accent-primary"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Smoking Preference</span>
            <select
              value={preferenceForm.smoking ? 'yes' : 'no'}
              onChange={(event) =>
                setPreferenceForm((prev) => ({ ...prev, smoking: event.target.value === 'yes' }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Drinking Preference</span>
            <select
              value={preferenceForm.drinking ? 'yes' : 'no'}
              onChange={(event) =>
                setPreferenceForm((prev) => ({ ...prev, drinking: event.target.value === 'yes' }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Pets Preference</span>
            <select
              value={preferenceForm.pets ? 'yes' : 'no'}
              onChange={(event) =>
                setPreferenceForm((prev) => ({ ...prev, pets: event.target.value === 'yes' }))
              }
              className="mt-1 w-full rounded-md border border-neutral-border px-3 py-2"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          <div className="rounded-md border border-neutral-border p-3 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Weights (must sum to 100)</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium text-slate-700">Cleanliness</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={preferenceForm.weightCleanliness}
                  onChange={(event) =>
                    setPreferenceForm((prev) => ({
                      ...prev,
                      weightCleanliness: Number(event.target.value),
                    }))
                  }
                  className="mt-1"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-slate-700">Sleep</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={preferenceForm.weightSleep}
                  onChange={(event) =>
                    setPreferenceForm((prev) => ({
                      ...prev,
                      weightSleep: Number(event.target.value),
                    }))
                  }
                  className="mt-1"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-slate-700">Habits</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={preferenceForm.weightHabits}
                  onChange={(event) =>
                    setPreferenceForm((prev) => ({
                      ...prev,
                      weightHabits: Number(event.target.value),
                    }))
                  }
                  className="mt-1"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-slate-700">Social</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={preferenceForm.weightSocial}
                  onChange={(event) =>
                    setPreferenceForm((prev) => ({
                      ...prev,
                      weightSocial: Number(event.target.value),
                    }))
                  }
                  className="mt-1"
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-slate-600">Total: {weightsTotal}</p>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-neutral-border mt-4">
        <Button
          type="button"
          onClick={() => {
            void saveCurrentTab()
          }}
          disabled={saving || uploading}
          isLoading={saving}
          className="mt-4"
        >
          {activeTab === 'profile' ? 'Save profile' : 'Save preferences'}
        </Button>
      </div>
    </section>
  )
}