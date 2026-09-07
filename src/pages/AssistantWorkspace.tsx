import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import AgentResultCards from '../components/AgentResultCards'
import Icon from '../components/Icon'
import { ApiError } from '../services/api'
import {
  ActionResult,
  AssistantConversation,
  AssistantDirectoryItem,
  AssistantId,
  AssistantMessage,
  ChatResponse,
  ExecutionMode,
  deleteConversation,
  getAssistantDirectory,
  getConversationMessages,
  listConversations,
  sendChatMessage,
  sendDirectAssistantMessage,
} from '../services/ai'
import { createProject, getProjects, Project } from '../services/projects'

export type AssistantPageId = 'command' | 'ceo' | 'executive' | 'sales' | 'finance-ai' | 'marketing' | 'legal' | 'operations-ai' | 'success-ai'
type Props = { pageId: AssistantPageId; onNavigate: (id: string) => void }

export type AssistantConfig = {
  id: AssistantId
  route: string
  label: string
  shortLabel: string
  role: string
  description: string
  icon: string
  gradient: string
  soft: string
  text: string
  module: string
  capabilities: string[]
  prompts: string[]
}

export const assistantConfigs: AssistantConfig[] = [
  { id:'ceo', route:'ceo', label:'CEO Assistant', shortLabel:'CEO', role:'Strategy & Decision Support', description:'Company-wide strategy, priorities, risks, and executive decisions.', icon:'C', gradient:'from-amber-500 to-orange-600', soft:'bg-amber-50', text:'text-amber-700', module:'dashboard', capabilities:['Strategic analysis','Decision support','Agent orchestration'], prompts:['What needs my attention today?','Summarize the biggest project risks','Recommend my top three priorities'] },
  { id:'executive', route:'executive', label:'Executive Assistant', shortLabel:'Executive', role:'Planning & Productivity', description:'Meetings, executive briefs, planning, and follow-through.', icon:'E', gradient:'from-violet-500 to-indigo-600', soft:'bg-violet-50', text:'text-violet-700', module:'reports', capabilities:['Executive briefs','Meeting prep','Priority planning'], prompts:['Prepare my executive brief','Create an action plan for this week','Summarize open decisions'] },
  { id:'sales', route:'sales', label:'Sales AI', shortLabel:'Sales', role:'Pipeline & Revenue Intelligence', description:'Pipeline reviews, deal strategy, forecasting, and sales coaching.', icon:'S', gradient:'from-blue-500 to-indigo-600', soft:'bg-blue-50', text:'text-blue-700', module:'crm', capabilities:['Pipeline analysis','Deal strategy','Revenue forecast'], prompts:['Review our sales pipeline','Which deals are at risk?','Create a plan to improve conversions'] },
  { id:'finance', route:'finance-ai', label:'Finance AI', shortLabel:'Finance', role:'Financial Planning & Analysis', description:'Cash flow, budgets, profitability, and financial scenarios.', icon:'F', gradient:'from-emerald-500 to-teal-600', soft:'bg-emerald-50', text:'text-emerald-700', module:'finance', capabilities:['Cash-flow analysis','Budget planning','Financial scenarios'], prompts:['Analyze our cash-flow position','Where are we over budget?','Create a 90-day financial outlook'] },
  { id:'marketing', route:'marketing', label:'Marketing AI', shortLabel:'Marketing', role:'Growth & Campaign Intelligence', description:'Campaign ideas, positioning, content, and growth analysis.', icon:'M', gradient:'from-fuchsia-500 to-pink-600', soft:'bg-fuchsia-50', text:'text-fuchsia-700', module:'marketing', capabilities:['Campaign planning','Content strategy','Growth insights'], prompts:['Create a campaign plan','Analyze our marketing performance','Suggest content for this project'] },
  { id:'legal', route:'legal', label:'Legal AI', shortLabel:'Legal', role:'Contracts & Risk Review', description:'Contract review, compliance questions, and legal risk summaries.', icon:'L', gradient:'from-slate-600 to-slate-800', soft:'bg-slate-100', text:'text-slate-700', module:'legal', capabilities:['Contract review','Risk summary','Compliance support'], prompts:['Identify the main legal risks','Summarize our contract obligations','Create a compliance checklist'] },
  { id:'operations', route:'operations-ai', label:'Operations AI', shortLabel:'Operations', role:'Process & Delivery Optimization', description:'Workflows, delivery risks, capacity, and process improvement.', icon:'O', gradient:'from-cyan-500 to-blue-600', soft:'bg-cyan-50', text:'text-cyan-700', module:'projects', capabilities:['Process design','Delivery planning','Capacity analysis'], prompts:['Find our operational bottlenecks','Create a delivery improvement plan','Review project dependencies'] },
  { id:'customer-success', route:'success-ai', label:'Customer Success AI', shortLabel:'Customer Success', role:'Retention & Customer Intelligence', description:'Customer health, onboarding, retention, and expansion opportunities.', icon:'CS', gradient:'from-rose-500 to-red-600', soft:'bg-rose-50', text:'text-rose-700', module:'customer-success', capabilities:['Customer health','Retention planning','Onboarding support'], prompts:['Which customers need attention?','Create a customer success plan','Find expansion opportunities'] },
]

const routeAssistant: Record<Exclude<AssistantPageId, 'command'>, AssistantId> = {
  ceo:'ceo', executive:'executive', sales:'sales', 'finance-ai':'finance', marketing:'marketing', legal:'legal', 'operations-ai':'operations', 'success-ai':'customer-success',
}

export default function AssistantWorkspace({ pageId, onNavigate }: Props) {
  const commandMode = pageId === 'command'
  const [assistant, setAssistant] = useState<AssistantId>(commandMode ? 'ceo' : routeAssistant[pageId])
  const [directory, setDirectory] = useState<AssistantDirectoryItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<number>()
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [conversations, setConversations] = useState<AssistantConversation[]>([])
  const [conversationId, setConversationId] = useState<number>()
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('suggest')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [error, setError] = useState('')
  const [failedMessage, setFailedMessage] = useState('')
  const [providerUnavailable, setProviderUnavailable] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [creating, setCreating] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const config = configFor(assistant)
  const directoryItem = directory.find((item) => item.key === assistant)

  useEffect(() => {
    void loadProjects()
    getAssistantDirectory().then((result) => setDirectory(result.items ?? [])).catch(() => undefined)
  }, [])

  useEffect(() => {
    newConversation(false)
    void loadConversations(assistant, projectId, true)
  }, [assistant, projectId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, sending])

  async function loadProjects(preferredId?: number) {
    setProjectsLoading(true)
    try {
      const list = await getProjects()
      setProjects(list)
      const saved = Number(localStorage.getItem('selectedProjectId')) || undefined
      const next = preferredId ?? (list.some((project) => project.id === saved) ? saved : undefined)
      setProjectId(next)
      if (next) localStorage.setItem('selectedProjectId', String(next))
    } catch (reason) { setError(messageFor(reason, 'Unable to load projects.')) }
    finally { setProjectsLoading(false) }
  }

  async function loadConversations(nextAssistant = assistant, nextProjectId = projectId, restore = false) {
    setListLoading(true)
    try {
      const received = await listConversations({ assistant:nextAssistant, ...(nextProjectId ? { projectId:nextProjectId } : {}) })
      const items = nextProjectId ? received : received.filter((item) => item.projectId == null)
      setConversations(items)
      if (restore) {
        const savedId = Number(localStorage.getItem(historyKey(nextAssistant, nextProjectId)))
        const saved = items.find((item) => item.id === savedId)
        if (saved) await openConversation(saved, nextAssistant)
      }
    } catch (reason) { setError(messageFor(reason, 'Unable to load conversations.')) }
    finally { setListLoading(false) }
  }

  async function openConversation(conversation: AssistantConversation, nextAssistant = assistant) {
    setConversationId(conversation.id); setHistoryLoading(true); setMessages([]); setError(''); setFailedMessage('')
    localStorage.setItem(historyKey(nextAssistant, conversation.projectId ?? projectId), String(conversation.id))
    try { setMessages(await getConversationMessages(conversation.id)) }
    catch (reason) {
      const apiError = reason instanceof ApiError ? reason : undefined
      if (apiError?.status === 404) setConversations((items) => items.filter((item) => item.id !== conversation.id))
      setError(messageFor(reason, 'Unable to load conversation history.'))
    } finally { setHistoryLoading(false) }
  }

  function newConversation(clearStored = true) {
    if (clearStored) localStorage.removeItem(historyKey(assistant, projectId))
    setConversationId(undefined); setMessages([]); setInput(''); setFailedMessage(''); setError('')
  }

  async function removeConversation(event: React.MouseEvent, id: number) {
    event.stopPropagation()
    if (!window.confirm('Delete this conversation?')) return
    try {
      await deleteConversation(id)
      if (conversationId === id) newConversation()
      setConversations((items) => items.filter((item) => item.id !== id))
    } catch (reason) { setError(messageFor(reason, 'Unable to delete conversation.')) }
  }

  async function submitProject(event: FormEvent) {
    event.preventDefault()
    const name = projectName.trim()
    if (!name || creating) return
    setCreating(true); setError('')
    try {
      const project = await createProject({ name, status:'active' })
      setProjectName(''); setShowCreate(false)
      await loadProjects(project.id)
    } catch (reason) { setError(messageFor(reason, 'Unable to create project.')) }
    finally { setCreating(false) }
  }

  async function sendText(text: string, appendUser: boolean, force = false) {
    if (!text || sending || (providerUnavailable && !force)) return
    const optimistic: AssistantMessage = { id:`local-${Date.now()}`, role:'user', content:text, createdAt:new Date().toISOString() }
    if (appendUser) setMessages((items) => [...items, optimistic])
    setInput(''); setSending(true); setError(''); setFailedMessage('')
    try {
      const payload = {
        message:text,
        ...(projectId ? { projectId } : {}),
        ...(conversationId ? { conversationId } : {}),
        executionMode,
        context:{ module:config.module, page:commandMode ? 'command-center' : `${config.id}-assistant` },
      }
      const response = commandMode
        ? await sendChatMessage({ ...payload, assistant })
        : await sendDirectAssistantMessage(assistant, payload)
      receiveResponse(response)
    } catch (reason) {
      handleSendError(reason, text)
    } finally { setSending(false) }
  }

  function receiveResponse(response: ChatResponse) {
    setProviderUnavailable(false)
    setConversationId(response.conversationId)
    localStorage.setItem(historyKey(assistant, projectId), String(response.conversationId))
    setMessages((items) => [...items.map((message) => message.failed ? { ...message, failed:false } : message), {
      id:response.messageId, role:'assistant', content:response.answer, createdAt:response.createdAt ?? new Date().toISOString(),
      model:response.model, delegations:response.delegations, actions:response.actions,
    }])
    announceActions(response.actions, response.delegations)
    void loadConversations(assistant, projectId)
  }

  function handleSendError(reason: unknown, text: string) {
    const apiError = reason instanceof ApiError ? reason : undefined
    if (apiError?.status === 503) setProviderUnavailable(true)
    if (apiError?.status === 403) { setConversationId(undefined); localStorage.removeItem(historyKey(assistant, projectId)) }
    if (apiError?.status === 404 && apiError.code === 'PROJECT_NOT_FOUND') {
      setProjectId(undefined); localStorage.removeItem('selectedProjectId'); void loadProjects()
    }
    setFailedMessage(text)
    setMessages((items) => items.map((message, index) => index === items.length - 1 && message.role === 'user' ? { ...message, failed:true } : message))
    setError(messageFor(reason, `${config.label} could not respond.`))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (text) void sendText(text, true)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() }
  }

  const changeProject = (value: string) => {
    const next = value ? Number(value) : undefined
    setProjectId(next)
    if (next) localStorage.setItem('selectedProjectId', String(next)); else localStorage.removeItem('selectedProjectId')
  }

  const availableConfigs = directory.length
    ? directory.map((item) => ({ ...configFor(item.key), label:item.label || configFor(item.key).label, description:item.description || configFor(item.key).description }))
    : assistantConfigs

  return <div className="mx-auto max-w-7xl space-y-4">
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">{commandMode ? 'AI workspace' : 'Specialist assistant'}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{commandMode ? 'AI Command Center' : config.label}</h1><p className="mt-1 text-sm text-slate-500">{commandMode ? 'Ask the CEO agent to coordinate work, or select a specialist for a focused response.' : directoryItem?.description || config.description}</p></div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select disabled={projectsLoading} value={projectId ?? ''} onChange={(event) => changeProject(event.target.value)} aria-label="Chat project" className="h-10 min-w-56 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:border-blue-400"><option value="">{projectsLoading ? 'Loading projects...' : 'Organization-wide (no project)'}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <button onClick={() => setShowCreate((value) => !value)} className="h-10 rounded-lg border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-blue-700 hover:bg-blue-100">{showCreate ? 'Cancel' : 'New project'}</button>
      </div>
    </div>

    {showCreate && <form onSubmit={submitProject} className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:flex-row"><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Project name" className="h-10 min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-400"/><button disabled={creating || !projectName.trim()} className="h-10 rounded-lg bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-blue-300">{creating ? 'Creating...' : 'Create & select'}</button></form>}

    {commandMode && <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{availableConfigs.map((item) => <button key={item.id} onClick={() => setAssistant(item.id)} className={`group rounded-xl border p-3 text-left transition ${assistant === item.id ? 'border-blue-300 bg-white shadow-sm ring-2 ring-blue-100' : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-[11px] font-bold text-white ${item.gradient}`}>{item.icon}</span><b className="mt-2 block truncate text-[11px] text-slate-700">{item.shortLabel}</b></button>)}</section>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex lg:h-[650px]">
      <aside className="flex max-h-48 flex-col border-b border-slate-200 bg-slate-50/60 lg:max-h-none lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="p-3"><button onClick={() => newConversation()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A0E1A] py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="plus" className="h-3.5 w-3.5"/>New conversation</button></div>
        <div className="flex-1 overflow-y-auto px-2 pb-3"><p className="px-2 pb-2 text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">Recent conversations</p>{listLoading && <p className="px-2 py-4 text-center text-[11px] text-slate-400">Loading...</p>}{!listLoading && !conversations.length && <p className="px-3 py-4 text-center text-[11px] leading-5 text-slate-400">No conversations yet.<br/>Start a new one.</p>}<div className="space-y-1">{conversations.map((conversation) => <button key={conversation.id} onClick={() => void openConversation(conversation)} className={`group flex w-full items-start gap-2 rounded-lg p-2.5 text-left ${conversationId === conversation.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-white'}`}><Icon name="bot" className="mt-0.5 h-3.5 w-3.5 shrink-0"/><span className="min-w-0 flex-1"><b className="block truncate text-[11px]">{conversation.title || `Conversation #${conversation.id}`}</b><small className="mt-0.5 block truncate text-[9px] text-slate-400">{conversation.lastMessage || relativeDate(conversation.updatedAt || conversation.createdAt)}</small></span><span role="button" aria-label="Delete conversation" onClick={(event) => void removeConversation(event, conversation.id)} className="hidden px-1 text-sm leading-none text-slate-400 hover:text-red-500 group-hover:block">x</span></button>)}</div></div>
      </aside>

      <div className="flex min-h-[540px] min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[11px] font-bold text-white shadow-sm ${config.gradient}`}>{config.icon}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{config.label}</p><p className="flex items-center gap-1.5 truncate text-[11px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Online - {config.role}</p></div><ModeSwitch value={executionMode} onChange={setExecutionMode}/></header>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 bg-slate-50/70 px-5 py-2 text-[10px] text-slate-500">{(directoryItem?.capabilities?.length ? directoryItem.capabilities : config.capabilities).map((capability) => <span key={capability} className="flex items-center gap-1"><b className="text-emerald-500">✓</b>{capability}</span>)}</div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {historyLoading && <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading conversation...</div>}
          {!historyLoading && !messages.length && <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center py-10 text-center"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xs font-bold ${config.soft} ${config.text}`}>{config.icon}</span><h2 className="mt-4 text-base font-bold text-slate-800">How can {config.label} help?</h2><p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">{projectId ? `The assistant will use ${projects.find((project) => project.id === projectId)?.name || 'the selected project'} as context.` : 'Ask an organization-wide question, or select a project for focused context.'}</p><div className="mt-5 grid w-full gap-2 sm:grid-cols-3">{config.prompts.map((prompt) => <button key={prompt} onClick={() => setInput(prompt)} className="rounded-xl border border-slate-200 bg-white p-3 text-left text-[11px] leading-4 text-slate-600 hover:border-blue-300 hover:bg-blue-50/40">{prompt}</button>)}</div></div>}
          {!historyLoading && messages.length > 0 && <div className="space-y-5">{messages.map((message, index) => <MessageBubble key={message.id ?? `${message.role}-${index}`} message={message} config={config} onNavigate={onNavigate}/>)}</div>}
          {sending && <div className="mt-5 flex items-center gap-3 text-xs text-slate-500"><span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-[10px] font-bold text-white ${config.gradient}`}>{config.icon}</span><span>Agent team is working...</span><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"/><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]"/><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]"/></span></div>}
          <div ref={endRef}/>
        </div>

        <form onSubmit={submit} className="border-t border-slate-100 bg-white p-3 sm:p-4">
          {error && <div role="alert" className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"><span className="min-w-0 flex-1">{error}</span>{failedMessage && <button type="button" onClick={() => void sendText(failedMessage, false, true)} className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 font-bold hover:bg-red-100">Retry</button>}</div>}
          {providerUnavailable && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">AI provider is not configured. Chat will be available after an administrator completes setup.</p>}
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50"><textarea rows={1} disabled={sending || providerUnavailable} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder={`Message ${config.label}...`} className="max-h-28 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-xs leading-5 text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"/><button disabled={sending || providerUnavailable || !input.trim()} aria-label="Send message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300">→</button></div>
          <div className="mt-1.5 flex justify-between px-1 text-[9px] text-slate-400"><span>Enter to send - Shift + Enter for a new line</span><span>{executionMode === 'auto' ? 'Safe actions may run automatically' : 'Actions will be proposed only'}</span></div>
        </form>
      </div>
    </section>
  </div>
}

function MessageBubble({ message, config, onNavigate }: { message: AssistantMessage; config: AssistantConfig; onNavigate: (id: string) => void }) {
  const user = message.role === 'user'
  const date = message.createdAt ? new Date(message.createdAt) : null
  const time = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }) : ''
  return <div className={`flex gap-3 ${user ? 'flex-row-reverse' : ''}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center text-[9px] font-bold ${user ? 'rounded-full bg-slate-800 text-white' : `rounded-xl bg-gradient-to-br text-white ${config.gradient}`}`}>{user ? 'YOU' : config.icon}</span><div className={`max-w-[88%] ${user ? 'text-right' : ''}`}><div className={`rounded-2xl px-4 py-3 text-left text-xs leading-5 ${user ? `rounded-tr-sm bg-blue-600 text-white ${message.failed ? 'ring-2 ring-red-300' : ''}` : 'rounded-tl-sm border border-slate-100 bg-slate-50 text-slate-700'}`}><p className="whitespace-pre-wrap">{message.content}</p>{!user && <AgentResultCards delegations={message.delegations} actions={message.actions} onNavigate={onNavigate}/>}</div><small className="px-1 text-[9px] text-slate-400">{[time, message.model].filter(Boolean).join(' · ')}</small></div></div>
}

export function ModeSwitch({ value, onChange }: { value: ExecutionMode; onChange: (mode: ExecutionMode) => void }) {
  return <div className="ml-auto flex rounded-lg bg-slate-100 p-1" aria-label="Execution mode">{(['suggest','auto'] as ExecutionMode[]).map((mode) => <button key={mode} type="button" onClick={() => onChange(mode)} className={`rounded-md px-2.5 py-1 text-[10px] font-bold capitalize ${value === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title={mode === 'auto' ? 'Allow safe actions to execute' : 'Propose actions without executing'}>{mode}</button>)}</div>
}

function announceActions(actions?: ActionResult[], delegations?: ChatResponse['delegations']) {
  const all = [...(actions ?? []), ...(delegations ?? []).flatMap((delegation) => delegation.actions ?? [])]
  const executed = all.filter((action) => action.status === 'executed')
  if (executed.length) window.dispatchEvent(new CustomEvent('business:data-changed', { detail:{ actions:executed } }))
}

function historyKey(assistant: AssistantId, projectId?: number | null) { return `ai:last:${assistant}:${projectId ?? 'global'}` }
function configFor(assistant: AssistantId) { return assistantConfigs.find((item) => item.id === assistant)! }
function relativeDate(value?: string) { if (!value) return 'Open conversation'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Open conversation' : date.toLocaleDateString([], { month:'short', day:'numeric' }) }
function messageFor(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback }

export function AssistantHub({ onNavigate }: { onNavigate: (id: string) => void }) {
  return <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Your AI team</p><h1 className="mt-1 text-2xl font-bold">AI Assistants Hub</h1><p className="mt-1 text-sm text-slate-500">Choose a specialist and start a context-aware conversation.</p></div><button onClick={() => onNavigate('command')} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"><Icon name="bot" className="h-4 w-4"/>Open Command Center</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{assistantConfigs.map((assistant) => <button key={assistant.id} onClick={() => onNavigate(assistant.route)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white shadow-sm ${assistant.gradient}`}>{assistant.icon}</span><h2 className="mt-4 text-sm font-bold text-slate-800">{assistant.label}</h2><p className="mt-1 text-xs font-medium text-slate-400">{assistant.role}</p><p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{assistant.description}</p><span className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600">Start conversation <span className="transition group-hover:translate-x-1">→</span></span></button>)}</div></div>
}
