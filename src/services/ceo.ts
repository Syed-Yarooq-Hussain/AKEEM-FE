import { API_URL, authHeaders, getErrorMessage } from './api'

export type CEOChatResponse = {
  conversationId: number
  messageId: number
  projectId: number
  answer: string
  model?: string
  usage?: { inputTokens?: number; outputTokens?: number }
}

export type CEOMessage = {
  id?: number
  role: 'ai' | 'user'
  text: string
  time: string
}

export async function sendCEOMessage(payload: { projectId: number; message: string; conversationId?: number }) {
  const response = await fetch(`${API_URL}/ai/ceo/chat`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
  if (!response.ok) throw new Error(await getErrorMessage(response))
  return response.json() as Promise<CEOChatResponse>
}

export async function getCEOMessages(conversationId: number): Promise<CEOMessage[]> {
  const response = await fetch(`${API_URL}/ai/ceo/conversations/${conversationId}/messages`, { headers: authHeaders(false) })
  if (!response.ok) throw new Error(await getErrorMessage(response))
  const body = await response.json()
  const raw = Array.isArray(body) ? body : body.messages ?? body.data?.messages ?? body.data ?? []
  if (!Array.isArray(raw)) return []
  return raw.map((item: Record<string, unknown>) => {
    const rawRole = String(item.role ?? item.sender ?? item.type ?? '').toLowerCase()
    const role: 'ai' | 'user' = ['user','human','client'].includes(rawRole) ? 'user' : 'ai'
    const date = item.createdAt ? new Date(String(item.createdAt)) : null
    return {
      id: typeof item.id === 'number' ? item.id : undefined,
      role,
      text: String(item.content ?? item.message ?? item.answer ?? item.text ?? ''),
      time: date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}) : '',
    }
  }).filter((message: CEOMessage) => message.text)
}
