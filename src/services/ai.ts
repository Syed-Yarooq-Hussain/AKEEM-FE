import { apiRequest } from './api'

export type AssistantId = 'ceo' | 'executive' | 'sales' | 'finance' | 'marketing' | 'legal' | 'operations' | 'customer-success'
export type ExecutionMode = 'auto' | 'suggest'
export type ActionType = 'create_task' | 'create_draft_invoice' | 'create_budget' | 'create_report' | 'create_approval' | 'create_crm_activity'

export type ChatPageContext = {
  module?: string
  page?: string
  entityType?: string
  entityId?: number
  selection?: Record<string, unknown>
}

export type ChatRequest = {
  message: string
  projectId?: number
  conversationId?: number
  assistant?: AssistantId
  executionMode?: ExecutionMode
  context?: ChatPageContext
}

export type ActionResult = {
  type: ActionType
  status: 'executed' | 'proposed' | 'failed'
  reason: string
  resource?: { type: 'task' | 'invoice' | 'budget' | 'report' | 'approval' | 'crm_activity'; id: number }
  data?: Record<string, unknown>
  error?: string
}

export type DelegationResult = {
  id: number
  assistant: AssistantId
  objective: string
  status: 'completed' | 'failed'
  answer: string
  model?: string
  usage?: { inputTokens?: number; outputTokens?: number }
  actions?: ActionResult[]
  error?: string
}

export type ChatResponse = {
  conversationId: number
  messageId: number
  projectId: number | null
  assistant: AssistantId
  answer: string
  model?: string
  routing?: { delegated: boolean; specialists: AssistantId[] }
  delegations?: DelegationResult[]
  actions?: ActionResult[]
  usage?: { inputTokens?: number; outputTokens?: number }
  createdAt?: string
}

export type AssistantDirectoryItem = {
  key: AssistantId
  label: string
  description: string
  capabilities: string[]
  actions: ActionType[]
  model: string
}

export type AssistantConversation = {
  id: number
  projectId?: number | null
  assistant?: AssistantId
  title: string
  lastMessage?: string
  messageCount?: number
  createdAt?: string
  updatedAt?: string
}

export type AssistantMessage = {
  id?: number | string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
  model?: string
  delegations?: DelegationResult[]
  actions?: ActionResult[]
  failed?: boolean
}

type ListResult<T> = { items?: T[] }

export const actionLabels: Record<ActionType, string> = {
  create_task: 'Task created',
  create_draft_invoice: 'Draft invoice created',
  create_budget: 'Budget created',
  create_report: 'Report created',
  create_approval: 'Approval requested',
  create_crm_activity: 'CRM activity created',
}

export const actionResourceModule: Record<NonNullable<ActionResult['resource']>['type'], string> = {
  task: 'tasks', invoice: 'finance', budget: 'finance', report: 'command', approval: 'approvals', crm_activity: 'crm',
}

export const getAssistantDirectory = () => apiRequest<{ items: AssistantDirectoryItem[]; defaultAssistant: AssistantId; executionModes: ExecutionMode[] }>('/ai/assistants')

export const sendChatMessage = (payload: ChatRequest) =>
  apiRequest<ChatResponse>('/ai/chat', { method: 'POST', body: JSON.stringify(payload) })

export const sendDirectAssistantMessage = (assistant: AssistantId, payload: Omit<ChatRequest, 'assistant'>) =>
  apiRequest<ChatResponse>(`/ai/${assistant}/chat`, { method: 'POST', body: JSON.stringify(payload) })

export async function listConversations(filters: { projectId?: number; assistant?: AssistantId; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams()
  if (filters.projectId) query.set('projectId', String(filters.projectId))
  if (filters.assistant) query.set('assistant', filters.assistant)
  query.set('page', String(filters.page ?? 1))
  query.set('limit', String(filters.limit ?? 50))
  const data = await apiRequest<ListResult<AssistantConversation> | AssistantConversation[]>(`/ai/conversations?${query}`)
  return Array.isArray(data) ? data : data.items ?? []
}

export async function getConversationMessages(conversationId: number): Promise<AssistantMessage[]> {
  const data = await apiRequest<{ messages?: Record<string, unknown>[] } | Record<string, unknown>[]>(`/ai/conversations/${conversationId}/messages`)
  const rows = Array.isArray(data) ? data : data.messages ?? []
  return rows.map(normalizeMessage).filter((message) => message.content)
}

export const deleteConversation = (conversationId: number) =>
  apiRequest(`/ai/conversations/${conversationId}`, { method: 'DELETE' })

export async function listDelegations(filters: { conversationId?: number; projectId?: number; status?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams()
  Object.entries({ ...filters, page:filters.page ?? 1, limit:filters.limit ?? 20 }).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  return apiRequest<ListResult<DelegationResult>>(`/ai/delegations?${query}`)
}

export const getDelegation = (id: number) => apiRequest<DelegationResult>(`/ai/delegations/${id}`)

function normalizeMessage(row: Record<string, unknown>): AssistantMessage {
  const rawRole = String(row.role ?? row.sender ?? row.type ?? '').toLowerCase()
  const metadata = toRecord(row.metadata)
  return {
    id: typeof row.id === 'number' || typeof row.id === 'string' ? row.id : undefined,
    role: ['user', 'human', 'client'].includes(rawRole) ? 'user' : 'assistant',
    content: String(row.content ?? row.message ?? row.answer ?? row.text ?? ''),
    createdAt: row.createdAt ? String(row.createdAt) : undefined,
    model: typeof row.model === 'string' ? row.model : typeof metadata.model === 'string' ? metadata.model : undefined,
    delegations: arrayValue<DelegationResult>(row.delegations ?? metadata.delegations),
    actions: arrayValue<ActionResult>(row.actions ?? metadata.actions),
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : {} } catch { return {} } }
  return {}
}

function arrayValue<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) && value.length ? value as T[] : undefined
}
