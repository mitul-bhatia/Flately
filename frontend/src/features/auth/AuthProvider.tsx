import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  clearSession,
  finishAuthBootstrap,
  setAuthError,
  setAuthLoading,
  setSession,
} from '@/features/auth/authSlice'
import {
  exchangeGoogleAuthCode,
  getGoogleAuthStartUrl,
  signInWithPassword,
  signUpWithPassword,
} from '@/services/auth.transport'
import { setAccessTokenGetter, setUnauthorizedHandler, setAccessTokenSetter } from '@/services/api'
import {
  clearPersistedSession,
  persistSession,
  readPersistedSession,
} from '@/features/auth/auth.storage'
import { formatAuthError } from '@/features/auth/auth.error'
import { AUTH_REASON, ROUTES, buildPathWithQuery } from '@/app/routes'

type AuthContextValue = {
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signInWithGoogle: (source?: string) => void
  completeGoogleSignIn: (exchangeCode: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch()
  const { status, accessToken } = useAppSelector((state) => state.auth)

  useEffect(() => {
    const persistedSession = readPersistedSession()

    if (persistedSession) {
      dispatch(setSession(persistedSession))
      setAccessTokenGetter(() => persistedSession.accessToken)
    } else {
      dispatch(finishAuthBootstrap())
    }

    setAccessTokenSetter((token: string) => {
       if (persistedSession) {
           persistedSession.accessToken = token;
           dispatch(setSession({...persistedSession}))
           setAccessTokenGetter(() => token)
       }
    })

    setUnauthorizedHandler(() => {
      clearPersistedSession()
      dispatch(clearSession())

      if (window.location.pathname !== ROUTES.login) {
        window.location.assign(
          buildPathWithQuery(ROUTES.login, {
            reason: AUTH_REASON.sessionExpired,
          }),
        )
      }
    })

    return () => {
      setUnauthorizedHandler(() => undefined)
    }
  }, [dispatch])

  useEffect(() => {
     if (accessToken) {
         setAccessTokenGetter(() => accessToken)
     }
  }, [accessToken])


  const signIn = useCallback(
    async (email: string, password: string) => {
      dispatch(setAuthLoading())
      try {
        const result = await signInWithPassword({ email, password })
        dispatch(setSession(result))
        persistSession(result)
      } catch (error) {
        dispatch(setAuthError(formatAuthError(error, 'Sign in failed')))
        throw error
      }
    },
    [dispatch],
  )

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      dispatch(setAuthLoading())
      try {
        const result = await signUpWithPassword({ name, email, password })
        dispatch(setSession(result))
        persistSession(result)
      } catch (error) {
        dispatch(setAuthError(formatAuthError(error, 'Sign up failed')))
        throw error
      }
    },
    [dispatch],
  )

  const signInWithGoogle = useCallback((source?: string) => {
    const googleUrl = getGoogleAuthStartUrl(source)
    window.location.assign(googleUrl)
  }, [])

  const completeGoogleSignIn = useCallback(
    async (exchangeCode: string) => {
      dispatch(setAuthLoading())

      try {
        const result = await exchangeGoogleAuthCode(exchangeCode)
        dispatch(setSession(result))
        persistSession(result)
      } catch (error) {
        dispatch(setAuthError(formatAuthError(error, 'Google sign-in failed')))
        throw error
      }
    },
    [dispatch],
  )

  const signOut = useCallback(() => {
    clearPersistedSession()
    dispatch(clearSession())
    setAccessTokenGetter(() => null)
  }, [dispatch])

  const value = useMemo(
    () => ({
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      signIn,
      signUp,
      signInWithGoogle,
      completeGoogleSignIn,
      signOut,
    }),
    [status, signIn, signUp, signInWithGoogle, completeGoogleSignIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
