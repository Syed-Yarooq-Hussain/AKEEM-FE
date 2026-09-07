import { FormEvent, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { CEOMessage, getCEOMessages, sendCEOMessage } from '../services/ceo'
import { createProject, getProjects, Project } from '../services/projects'

type Props = { onNavigate: (id: string) => void }

const briefing = [
  ['📈','Business Health','Strong','All KPIs green. Revenue +12.4% MoM.'],
  ['⚡','Priority Action','Sign Orbit Deal','$680K — final negotiation today.'],
  ['📋','Board Readiness','6 Days','Q1 deck 80% complete. 3 slides pending.'],
  ['🏆','Team Morale','High','eNPS: 72. Attrition at record low.'],
]
export default function CEOAssistant({ onNavigate }: Props) {
  const [selected,setSelected] = useState(-1), [input,setInput] = useState(''), [messages,setMessages] = useState<CEOMessage[]>([])
  const [conversationId,setConversationId] = useState<number|undefined>(), [loading,setLoading] = useState(false), [historyLoading,setHistoryLoading] = useState(false), [error,setError] = useState('')
  const [meta,setMeta] = useState('')
  const [projects,setProjects] = useState<Project[]>([]), [selectedProjectId,setSelectedProjectId] = useState<number|undefined>(), [projectsLoading,setProjectsLoading] = useState(true), [showCreate,setShowCreate] = useState(false), [creating,setCreating] = useState(false)

  useEffect(()=>{ void reloadProjects() },[])
  async function reloadProjects(selectId?:number) {
    setProjectsLoading(true)
    try { const list=await getProjects(); setProjects(list); setSelectedProjectId(current=>{const saved=Number(localStorage.getItem('selectedProjectId'))||undefined;const next=selectId??(list.some(project=>project.id===(current??saved))?(current??saved):list[0]?.id);if(next)localStorage.setItem('selectedProjectId',String(next));return next}) }
    catch(reason) { setError(reason instanceof Error ? reason.message : 'Unable to load projects.') }
    finally { setProjectsLoading(false) }
  }
  async function loadConversation(id:number,index:number) {
    setSelected(index); setConversationId(id); setHistoryLoading(true); setError('')
    try { const history=await getCEOMessages(id); if(history.length)setMessages(history) }
    catch(reason) { setError(reason instanceof Error ? reason.message : 'Unable to load conversation history.') }
    finally { setHistoryLoading(false) }
  }
  const newSession = () => { setMessages([]); setConversationId(undefined); setSelected(-1); setError(''); setMeta('') }
  const changeProject = (id:number|undefined) => { setSelectedProjectId(id); if(id)localStorage.setItem('selectedProjectId',String(id));else localStorage.removeItem('selectedProjectId'); newSession() }
  const submitProject = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setCreating(true); setError(''); const data=new FormData(event.currentTarget)
    try { const project=await createProject({name:String(data.get('name')),description:String(data.get('description')),status:String(data.get('status')),startDate:String(data.get('startDate')),dueDate:String(data.get('dueDate')),budget:Number(data.get('budget'))}); await reloadProjects(project.id); setShowCreate(false); newSession() }
    catch(reason) { setError(reason instanceof Error?reason.message:'Unable to create project.') }
    finally { setCreating(false) }
  }
  const send = async (event: FormEvent) => {
    event.preventDefault(); const text=input.trim(); if(!text||loading)return
    if(!selectedProjectId) { setError('Please select or create a project first.'); return }
    const time=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})
    setMessages(v=>[...v,{role:'user',text,time}]); setInput(''); setLoading(true); setError('')
    try {
      const response=await sendCEOMessage({projectId:selectedProjectId,message:text,...(conversationId?{conversationId}:{})})
      setConversationId(response.conversationId); setSelected(0); setMessages(v=>[...v,{id:response.messageId,role:'ai',text:response.answer,time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}])
      setMeta([response.model,response.usage?.inputTokens!=null?`${response.usage.inputTokens} in`:null,response.usage?.outputTokens!=null?`${response.usage.outputTokens} out`:null].filter(Boolean).join(' · '))
    } catch(reason) { const message=reason instanceof Error ? reason.message : 'CEO Assistant could not respond.'; setError(message); setMessages(v=>v.filter((_,i)=>i!==v.length-1)); if(message.toLowerCase().includes('project not found in your organization')) await reloadProjects() }
    finally { setLoading(false) }
  }
  return <div className="mx-auto max-w-7xl space-y-5">
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1"><span className="mb-1.5 block text-xs font-bold text-slate-700">Active project <b className="text-red-500">*</b></span><select disabled={projectsLoading} value={selectedProjectId??''} onChange={event=>changeProject(event.target.value?Number(event.target.value):undefined)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-blue-400 focus:bg-white"><option value="">{projectsLoading?'Loading projects…':'Select a project'}</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label><button onClick={()=>setShowCreate(value=>!value)} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-blue-700 hover:bg-blue-100"><Icon name="plus" className="h-4 w-4"/>{showCreate?'Cancel':'Create project'}</button><button onClick={()=>void reloadProjects()} disabled={projectsLoading} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Refresh</button></div>
      {!projectsLoading&&!projects.length&&!showCreate&&<p className="mt-2 text-xs text-amber-600">No project found. Create a project before using CEO Chat.</p>}
      {showCreate&&<form onSubmit={submitProject} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4"><ProjectField name="name" label="Project name" placeholder="AI Business Platform"/><ProjectField name="budget" label="Budget" type="number" min="0" placeholder="50000"/><ProjectField name="startDate" label="Start date" type="date" defaultValue="2026-08-31"/><ProjectField name="dueDate" label="Due date" type="date" defaultValue="2026-12-31"/><label className="sm:col-span-2 xl:col-span-3"><span className="mb-1 block text-xs font-medium text-slate-600">Description</span><input required name="description" defaultValue="Multi-tenant AI business management SaaS" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><input type="hidden" name="status" value="active"/><button disabled={creating} className="self-end h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-blue-300">{creating?'Creating…':'Create & select'}</button></form>}
    </section>
    <section className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3"><span className="text-xl">♛</span><h1 className="text-base font-bold">Good morning, James. Your CEO Intelligence Briefing.</h1><span className="text-xs font-medium text-orange-100 sm:ml-auto">March 9, 2024 · 9:00 AM</span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{briefing.map(([icon,label,value,detail])=><article key={label} className="rounded-xl bg-white/15 p-4 transition hover:bg-white/20"><span className="text-2xl">{icon}</span><p className="mt-2 text-[11px] font-medium text-orange-100">{label}</p><p className="mt-0.5 text-sm font-bold">{value}</p><p className="mt-1 text-xs leading-relaxed text-orange-100">{detail}</p></article>)}</div>
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:flex lg:h-[520px]">
      <aside className="border-b border-slate-100 lg:w-52 lg:shrink-0 lg:border-b-0 lg:border-r"><div className="border-b border-slate-100 p-3"><button onClick={newSession} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Icon name="plus" className="h-3 w-3"/>New Session</button></div><div className="p-2">{conversationId?<button onClick={()=>void loadConversation(conversationId,0)} className={`w-full rounded-lg p-2.5 text-left ${selected===0?'border border-blue-100 bg-blue-50':'hover:bg-slate-50'}`}><p className={`truncate text-xs font-semibold ${selected===0?'text-blue-700':'text-slate-700'}`}>Conversation #{conversationId}</p><p className="mt-0.5 text-[11px] text-slate-400">Current session</p></button>:<p className="px-2 py-3 text-center text-[11px] text-slate-400">No active conversation</p>}</div></aside>
      <div className="flex min-h-[500px] min-w-0 flex-1 flex-col"><header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">♛</span><div><p className="text-sm font-bold text-slate-800">CEO Assistant</p><p className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Online · Executive Strategy & Decision Support</p></div><span className="ml-auto rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">● Orbit Deal Workflow</span></header>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 bg-slate-50 px-5 py-2 text-[11px] text-slate-500">{['Strategic Analysis','Decision Support','Agent Orchestration'].map(x=><span key={x} className="flex items-center gap-1"><b className="text-emerald-500">✓</b>{x}</span>)}</div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">{historyLoading&&<p className="text-center text-xs text-slate-400">Loading conversation…</p>}{!historyLoading&&!messages.length&&<div className="mx-auto mt-16 max-w-sm text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-600">♛</span><p className="mt-3 text-sm font-bold text-slate-700">Start a CEO intelligence session</p><p className="mt-1 text-xs leading-5 text-slate-400">Select a project, then ask about progress, risks, priorities, or strategic decisions.</p></div>}{messages.map((message,i)=><ChatBubble key={message.id??i} {...message}/>) }{loading&&<div className="flex items-center gap-2 text-xs text-slate-400"><span className="h-2 w-2 animate-pulse rounded-full bg-orange-500"/>CEO Assistant is thinking…</div>}
          {messages.length>0&&<div className="ml-0 max-w-2xl rounded-xl border border-slate-100 bg-slate-50 p-3 sm:ml-11"><p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Parallel agent analysis</p><div className="grid gap-3 sm:grid-cols-2"><AgentCard label="Finance AI" task="Profitability, margin and cash-flow impact" onClick={()=>onNavigate('finance-ai')}/><AgentCard label="Legal AI" task="IP ownership and liability exposure" onClick={()=>onNavigate('legal')}/></div></div>}
        </div>
        <form onSubmit={send} className="border-t border-slate-100 p-3">{error&&<p role="alert" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-blue-400"><span className="text-blue-500">✦</span><input disabled={loading||!selectedProjectId} value={input} onChange={e=>setInput(e.target.value)} placeholder={selectedProjectId?'Ask CEO AI about this project…':'Select or create a project to start chatting'} className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"/><button disabled={loading||!input.trim()||!selectedProjectId} aria-label="Send message" className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300">➤</button></div>{meta&&<p className="mt-1 text-right text-[9px] text-slate-400">{meta}</p>}</form>
      </div>
    </section>
    <WorkspaceTabs/>
  </div>
}

function ChatBubble({role,text,time}:CEOMessage) { const user=role==='user'; return <div className={`flex gap-3 ${user?'flex-row-reverse':''}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center ${user?'rounded-full bg-slate-700 text-[11px] font-bold text-white':'rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white'}`}>{user?'JD':'♛'}</span><div className={`max-w-[82%] ${user?'text-right':''}`}><p className={`whitespace-pre-wrap rounded-xl px-4 py-3 text-left text-xs leading-relaxed ${user?'rounded-tr-sm bg-blue-600 text-white':'rounded-tl-sm border border-slate-100 bg-slate-50 text-slate-700'}`}>{text}</p><small className="px-1 text-[10px] text-slate-400">{time}</small></div></div> }
function ProjectField({label,...props}:React.InputHTMLAttributes<HTMLInputElement>&{label:string}) { return <label><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span><input required name={props.name} {...props} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"/></label> }
function AgentCard({label,task,onClick}:{label:string;task:string;onClick:()=>void}) { return <article className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"><div className="flex items-center gap-2"><span className="rounded bg-blue-600 px-1.5 py-1 text-[9px] text-white">AI</span><b className="text-[11px]">{label}</b><span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600">✓ Done</span></div><p className="mt-2 text-[11px] text-slate-500">{task}</p><div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-full bg-emerald-500"/></div><button onClick={onClick} className="mt-2 text-[10px] font-semibold text-blue-600 hover:underline">View Agent →</button></article> }

function WorkspaceTabs() { const [tab,setTab]=useState('Overview'); const tabs=['Overview','Tasks','Reports','Activity','Files']; return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><header className="flex flex-col justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:flex-row sm:items-center"><b className="text-xs uppercase tracking-wider text-slate-600">● Workspace</b><div className="flex overflow-x-auto">{tabs.map(x=><button key={x} onClick={()=>setTab(x)} className={`border-b-2 px-3 py-1.5 text-xs font-semibold ${tab===x?'border-orange-500 text-orange-600':'border-transparent text-slate-400 hover:text-slate-700'}`}>{x}</button>)}</div></header><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">{tab==='Overview'?[["94%",'Decision Accuracy','Last 30 days'],['12','Active Tasks','3 high priority'],['28','Reports Generated','This quarter'],['42h','Time Saved','This month']].map(([v,l,d])=><article key={l} className="rounded-xl border border-slate-100 p-3.5"><p className="text-xl font-bold">{v}</p><p className="mt-1 text-[11px] font-semibold text-slate-500">{l}</p><p className="text-[11px] text-slate-400">{d}</p></article>):<div className="sm:col-span-2 xl:col-span-4"><p className="text-sm font-semibold text-slate-700">{tab}</p><p className="mt-1 text-xs text-slate-400">CEO Assistant {tab.toLowerCase()} will appear here.</p></div>}</div></section> }
