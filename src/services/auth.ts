import { API_URL } from './api'

export type SignupPayload = {
  firstName: string
  lastName: string
  email: string
  password: string
  organizationName: string
  timezone: string
  currency: string
}

export type LoginPayload = Pick<SignupPayload, 'email' | 'password'>

type AuthResponse = Record<string, unknown>

async function request(path: string, payload: LoginPayload | SignupPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const contentType = response.headers.get('content-type') ?? ''
  const data: AuthResponse = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() }

  if (!response.ok) {
    const message = data.message ?? data.error ?? `Request failed (${response.status})`
    throw new Error(typeof message === 'string' ? message : 'Unable to complete the request.')
  }
  return data
}

export const login = (payload: LoginPayload) => request('/auth/login', payload)
export const signup = (payload: SignupPayload) => request('/auth/signup', payload)

export function saveAuth(response: AuthResponse) {
  const nested = typeof response.data === 'object' && response.data ? response.data as AuthResponse : {}
  const token = response.accessToken ?? response.token ?? nested.accessToken ?? nested.token
  if (typeof token === 'string') localStorage.setItem('accessToken', token)
}
