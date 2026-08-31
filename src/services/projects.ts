import { API_URL, authHeaders, getErrorMessage } from './api'

export type Project = {
  id: number
  name: string
  description?: string
  status?: string
  startDate?: string
  dueDate?: string
  budget?: number
}

export type CreateProjectPayload = Omit<Project, 'id'>

function normalizeProjects(body: unknown): Project[] {
  if (Array.isArray(body)) return body
  if (!body || typeof body !== 'object') return []
  const value = body as Record<string, unknown>
  const list = value.projects ?? value.data
  if (Array.isArray(list)) return list as Project[]
  if (list && typeof list === 'object' && Array.isArray((list as Record<string, unknown>).projects)) return (list as { projects: Project[] }).projects
  return []
}

export async function getProjects() {
  const response = await fetch(`${API_URL}/projects`, { headers: authHeaders(false) })
  if (!response.ok) throw new Error(await getErrorMessage(response))
  return normalizeProjects(await response.json())
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const response = await fetch(`${API_URL}/projects`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
  if (!response.ok) throw new Error(await getErrorMessage(response))
  const body = await response.json()
  return (body.data ?? body.project ?? body) as Project
}
