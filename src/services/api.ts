export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export function authHeaders(json = true): HeadersInit {
  const token = localStorage.getItem('accessToken')
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function getErrorMessage(response: Response) {
  try {
    const body = await response.json()
    return body.message ?? body.error ?? `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}
