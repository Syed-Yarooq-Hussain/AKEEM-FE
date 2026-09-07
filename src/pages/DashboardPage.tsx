import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { DashboardOverview, getDashboardOverview } from '../services/dashboard'
import { getProjects, Project } from '../services/projects'

type Props={onNavigate:(id:string)=>void;userName:string}

export default function DashboardPage({onNavigate,userName}:Props){
  const [projects,setProjects]=useState<Project[]>([])
  const [projectId,setProjectId]=useState<number>()
  const [period,setPeriod]=useState('6m')
  const [data,setData]=useState<DashboardOverview>()
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{getProjects().then(items=>{setProjects(items);const saved=Number(localStorage.getItem('selectedProjectId'))||undefined;const next=items.some(item=>item.id===saved)?saved:items[0]?.id;setProjectId(next);if(next)localStorage.setItem('selectedProjectId',String(next))}).catch(reason=>setError(reason instanceof Error?reason.message:'Unable to load projects.'))},[])
  useEffect(()=>{if(!projectId){setLoading(false);setData(undefined);return}setLoading(true);setError('');getDashboardOverview(projectId,period).then(setData).catch(reason=>setError(reason instanceof Error?reason.message:'Unable to load dashboard.')).finally(()=>setLoading(false))},[projectId,period])

  const selectProject=(value:string)=>{const next=value?Number(value):undefined;setProjectId(next);if(next)localStorage.setItem('selectedProjectId',String(next))}
  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end"><div><h1 className="text-2xl font-bold text-slate-900">Good morning{userName?`, ${userName}`:''}</h1><p className="mt-1 text-sm text-slate-500">Here is what is happening across your business today.</p></div><div className="flex flex-col gap-2 sm:flex-row"><select value={projectId??''} onChange={event=>selectProject(event.target.value)} className="h-10 min-w-52 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"><option value="">Select a project</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select><button onClick={()=>onNavigate('command')} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700"><Icon name="bot" className="h-4 w-4"/>Ask AI Assistant</button></div></div>
    {error&&<p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}
    {!projectId&&!loading&&<div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Icon name="dashboard" className="mx-auto h-8 w-8 text-slate-300"/><h2 className="mt-3 text-sm font-bold">Create your first project</h2><p className="mt-1 text-xs text-slate-400">Dashboard intelligence is calculated for the selected project.</p><button onClick={()=>onNavigate('projects')} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white">Open projects</button></div>}
    {loading&&<div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(item=><div key={item} className="h-28 animate-pulse rounded-xl bg-slate-200"/>)}</div>}
    {data&&<DashboardContent data={data} period={period} setPeriod={setPeriod}/>} 
  </div>
}

function DashboardContent({data,period,setPeriod}:{data:DashboardOverview;period:string;setPeriod:(value:string)=>void}){
  const metrics=[
    ['Revenue',money(data.metrics.revenue.value,data.metrics.revenue.currency),signed(data.metrics.revenue.changePercent)+' vs previous period','chart'],
    ['Active Deals',String(data.metrics.activeDeals.value),`+${data.metrics.activeDeals.newThisWeek} this week`,'users'],
    ['Pending Tasks',String(data.metrics.pendingTasks.value),`${data.metrics.pendingTasks.highPriority} high priority`,'check'],
    ['AI Hours Saved',`${data.metrics.aiHoursSaved.value}h`,signed(data.metrics.aiHoursSaved.changePercent)+' vs previous period','bot'],
  ]
  const max=Math.max(1,...data.chart.flatMap(item=>[item.revenue,item.expenses]))
  return <><section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label,value,change,icon])=><article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Icon name={icon} className="h-5 w-5"/></span></div><p className="mt-3 text-xs font-medium text-emerald-600">{change}</p></article>)}</section><section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]"><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">Business overview</h2><div className="mt-1 flex gap-3 text-[10px] text-slate-400"><span><b className="text-blue-500">●</b> Revenue</span><span><b className="text-slate-300">●</b> Expenses</span></div></div><select value={period} onChange={event=>setPeriod(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"><option value="3m">Last 3 months</option><option value="6m">Last 6 months</option><option value="12m">Last 12 months</option></select></div><div className="mt-6 flex h-52 items-end gap-3 border-b border-l border-slate-200 px-3">{data.chart.map((item,index)=><div key={`${item.period}-${index}`} className="group flex min-w-0 flex-1 items-end justify-center gap-0.5" title={`${item.period}: revenue ${item.revenue}, expenses ${item.expenses}`}><div className="w-2/5 rounded-t bg-blue-500" style={{height:`${Math.max(3,item.revenue/max*180)}px`}}/><div className="w-2/5 rounded-t bg-slate-300" style={{height:`${Math.max(3,item.expenses/max*180)}px`}}/></div>)}</div><div className="mt-3 flex justify-between gap-2 overflow-hidden text-[9px] text-slate-400">{data.chart.map((item,index)=><span key={`${item.period}-${index}`} className="truncate">{item.period}</span>)}</div></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">AI activity</h2><div className="mt-4 space-y-4">{data.aiActivity.length?data.aiActivity.map(item=><div key={item.id} className="flex gap-3"><span className="mt-0.5 rounded-lg bg-violet-50 p-2 text-violet-600"><Icon name="bot" className="h-4 w-4"/></span><div className="min-w-0"><b className="block truncate text-xs capitalize">{item.assistant.replace('-', ' ')}</b><p className="truncate text-xs text-slate-500">{item.title}</p><small className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</small></div></div>):<p className="py-10 text-center text-xs text-slate-400">No AI activity yet.</p>}</div></article></section></>
}

function signed(value:number){return `${value>=0?'+':''}${value}%`}
function money(value:number,currency:string){try{return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:0}).format(value)}catch{return `${currency} ${value.toLocaleString()}`}}
