import { useEffect, useState } from 'react'
import CreateResourcePanel from '../components/CreateResourcePanel'
import Icon from '../components/Icon'
import { adminList, adminUsage, approve, crmList, crmOverview, crmPipelines, financeList, financeOverview, listApprovals, listAutomations, organization, organizationMembers, reject, runAutomation, updateDealStage, userProfile, ApiRecord, PipelineStage } from '../services/business'
import { cancelAITask, getAITasks, retryAITask, runAITask } from '../services/p0'
import { deleteAutomation, deleteCrm, deleteIntegration, updateAutomation, updateCrm, updateIntegration, updateInvoice } from '../services/mutations'

type Props={id:string;title:string}
type RowAction='approve'|'reject'|'run'|'run-task'|'retry-task'|'cancel-task'
const projectId=()=>{const value=Number(localStorage.getItem('selectedProjectId'));return value||undefined}
const loaders:Record<string,()=>Promise<unknown>>={
  tasks:()=>getAITasks({projectId:projectId()}),
  approvals:()=>listApprovals(projectId()),
  automations:()=>listAutomations(projectId()),
  crm:async()=>({overview:await crmOverview(),contacts:await crmList('contacts'),companies:await crmList('companies'),deals:await crmList('deals')}),
  finance:async()=>({overview:await financeOverview(projectId()),transactions:await financeList('transactions'),invoices:await financeList('invoices'),budgets:await financeList('budgets'),cashFlow:await financeList('cash-flow'),reports:await financeList('reports')}),
  settings:async()=>({organization:await organization(),members:await organizationMembers(),profile:await userProfile()}),
  admin:async()=>({users:await adminList('users'),usage:await adminUsage(),auditLogs:await adminList('audit-logs'),integrations:await adminList('integrations')}),
}

export default function BusinessModule({id,title}:Props){
  const [data,setData]=useState<unknown>(),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tab,setTab]=useState(''),[createOpen,setCreateOpen]=useState(false)
  const [dealStages,setDealStages]=useState<PipelineStage[]>([])
  const load=async()=>{setLoading(true);setError('');try{const result=await loaders[id]();setData(result);if(result&&!Array.isArray(result)&&typeof result==='object'&&id!=='tasks')setTab(Object.keys(result)[0]??'')}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load data.')}finally{setLoading(false)}}

  useEffect(()=>{
    void load()
    if(id==='crm')crmPipelines().then(pipelines=>setDealStages((pipelines.find(pipeline=>pipeline.isDefault)??pipelines[0])?.stages??[])).catch(reason=>setError(reason instanceof Error?reason.message:'Unable to load CRM stages.'))
    const refresh=()=>void load()
    window.addEventListener('business:data-changed',refresh)
    return()=>window.removeEventListener('business:data-changed',refresh)
  },[id])

  const sections=data&&!Array.isArray(data)&&typeof data==='object'&&id!=='tasks'?Object.keys(data):[]
  const visible=sections.length?(data as Record<string,unknown>)[tab]:data
  const rows:Array<ApiRecord>=Array.isArray(visible)?visible:(visible&&typeof visible==='object'&&Array.isArray((visible as {items?:unknown[]}).items)?(visible as {items:ApiRecord[]}).items:[])
  const summary=!rows.length&&visible&&typeof visible==='object'&&!Array.isArray(visible)&&!('items' in visible)?visible as ApiRecord:null

  const act=async(action:RowAction,row:ApiRecord)=>{
    const value=Number(row.id);if(!value)return
    try{
      if(action==='approve')await approve(value)
      if(action==='reject')await reject(value)
      if(action==='run')await runAutomation(value)
      if(action==='run-task')await runAITask(value)
      if(action==='retry-task')await retryAITask(value)
      if(action==='cancel-task')await cancelAITask(value)
      await load()
    }catch(reason){setError(reason instanceof Error?reason.message:'Action failed.')}
  }

  const resourceAction=async(action:'toggle-automation'|'delete-automation'|'edit-crm'|'delete-crm'|'deal-stage'|'invoice-status'|'edit-integration'|'delete-integration',row:ApiRecord,input?:string)=>{
    const value=Number(row.id);if(!value)return
    try{
      if(action==='toggle-automation')await updateAutomation(value,{enabled:!Boolean(row.enabled)})
      if(action==='delete-automation'){if(!window.confirm('Delete this automation?'))return;await deleteAutomation(value)}
      if(action==='edit-crm'){const currentName=String(row.name??row.firstName??'');const name=window.prompt(tab==='contacts'?'First name':'Name',currentName);if(!name)return;if(tab==='contacts')await updateCrm('contacts',value,{firstName:name});else await updateCrm(tab as 'companies'|'deals',value,{name})}
      if(action==='delete-crm'){if(!window.confirm(`Delete this ${tab.slice(0,-1)}?`))return;await deleteCrm(tab as 'companies'|'contacts'|'deals',value)}
      if(action==='deal-stage'){if(!input)return;await updateDealStage(value,input)}
      if(action==='invoice-status'){const status=window.prompt('Invoice status',String(row.status??'sent'));if(!status)return;await updateInvoice(value,{status})}
      if(action==='edit-integration'){const displayName=window.prompt('Display name',String(row.displayName??row.provider??''));if(!displayName)return;await updateIntegration(value,{displayName})}
      if(action==='delete-integration'){if(!window.confirm('Delete this integration?'))return;await deleteIntegration(value)}
      await load()
    }catch(reason){setError(reason instanceof Error?reason.message:'Action failed.')}
  }

  const canCreate=['tasks','approvals','automations'].includes(id)||(id==='crm'&&['companies','contacts','deals'].includes(tab))||(id==='finance'&&['transactions','invoices','budgets'].includes(tab))||(id==='settings'&&['organization','members','profile'].includes(tab))||(id==='admin'&&tab==='integrations')
  const columns=rows.length?columnsFor(id,tab,rows[0]):[]
  const showActions=['tasks','approvals','automations'].includes(id)||(id==='crm'&&['companies','contacts','deals'].includes(tab))||(id==='finance'&&tab==='invoices')||(id==='admin'&&tab==='integrations')

  return <div className="mx-auto max-w-7xl">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-slate-500">Live organization data from the AKEEM API.</p></div><div className="flex gap-2">{canCreate&&<button onClick={()=>setCreateOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">{id==='settings'?'Update':'Create new'}</button>}<button onClick={()=>void load()} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold hover:bg-slate-50">Refresh</button></div></div>
    {createOpen&&<CreateResourcePanel module={id} section={tab||id} onClose={()=>setCreateOpen(false)} onDone={()=>void load()}/>} 
    {sections.length>1&&<div className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">{sections.map(section=><button key={section} onClick={()=>setTab(section)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold capitalize ${tab===section?'bg-[#0A0E1A] text-[#c9a84c]':'text-slate-500 hover:bg-slate-50'}`}>{section.replace(/([A-Z])/g,' $1')}</button>)}</div>}
    {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}
    {loading?<div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Loading data...</div>:rows.length?<div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{columns.map(key=><th key={key} className="whitespace-nowrap px-4 py-3 font-semibold capitalize">{key.replace(/([A-Z])/g,' $1')}</th>)}{showActions&&<th className="px-4 py-3">Actions</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row,index)=><tr key={String(row.id??index)} className="hover:bg-slate-50">{columns.map(key=><td key={key} className="max-w-52 truncate px-4 py-3 text-slate-700">{format(row[key])}</td>)}{id==='tasks'&&<td className="whitespace-nowrap px-4 py-3"><TaskActions row={row} act={act}/></td>}{id==='approvals'&&<td className="whitespace-nowrap px-4 py-3"><button disabled={String(row.status)!=='pending'} onClick={()=>void act('approve',row)} className="mr-2 text-emerald-600 disabled:text-slate-300">Approve</button><button disabled={String(row.status)!=='pending'} onClick={()=>void act('reject',row)} className="text-red-500 disabled:text-slate-300">Reject</button></td>}{id==='automations'&&<td className="whitespace-nowrap px-4 py-3"><button onClick={()=>void act('run',row)} className="mr-3 text-blue-600">Run now</button><button onClick={()=>void resourceAction('toggle-automation',row)} className="mr-3 text-slate-600">{row.enabled?'Disable':'Enable'}</button><button onClick={()=>void resourceAction('delete-automation',row)} className="text-red-500">Delete</button></td>}{id==='crm'&&['companies','contacts','deals'].includes(tab)&&<td className="whitespace-nowrap px-4 py-3"><button onClick={()=>void resourceAction('edit-crm',row)} className="mr-3 text-slate-600">Edit</button>{tab==='deals'&&<select value={String(row.stage??'')} onChange={event=>void resourceAction('deal-stage',row,event.target.value)} className="mr-3 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] text-blue-700" aria-label="Deal stage">{dealStages.map(stage=><option key={stage.id} value={stage.name}>{stage.name} ({stage.probability}%)</option>)}</select>}<button onClick={()=>void resourceAction('delete-crm',row)} className="text-red-500">Delete</button></td>}{id==='finance'&&tab==='invoices'&&<td className="px-4 py-3"><button onClick={()=>void resourceAction('invoice-status',row)} className="text-blue-600">Update status</button></td>}{id==='admin'&&tab==='integrations'&&<td className="whitespace-nowrap px-4 py-3"><button onClick={()=>void resourceAction('edit-integration',row)} className="mr-3 text-blue-600">Edit</button><button onClick={()=>void resourceAction('delete-integration',row)} className="text-red-500">Delete</button></td>}</tr>)}</tbody></table></div>:summary?<div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(summary).filter(([,value])=>typeof value!=='object').map(([key,value])=><article key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs capitalize text-slate-500">{key.replace(/([A-Z])/g,' $1')}</p><p className="mt-2 break-words text-lg font-bold">{format(value)}</p></article>)}</div>:<div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><Icon name="check" className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-600">No data found</p></div>}
  </div>
}

function TaskActions({row,act}:{row:ApiRecord;act:(action:RowAction,row:ApiRecord)=>Promise<void>}){
  const status=String(row.status??'queued')
  return <>{status==='queued'&&<button onClick={()=>void act('run-task',row)} className="mr-3 font-semibold text-blue-600">Run</button>}{['queued','running'].includes(status)&&<button onClick={()=>void act('cancel-task',row)} className="font-semibold text-red-500">Cancel</button>}{['failed','cancelled'].includes(status)&&<button onClick={()=>void act('retry-task',row)} className="font-semibold text-blue-600">Retry</button>}{status==='completed'&&<span className="font-semibold text-emerald-600">Completed</span>}</>
}

function format(value:unknown){if(value==null)return '—';if(typeof value==='object')return JSON.stringify(value);if(typeof value==='boolean')return value?'Yes':'No';return String(value)}
function columnsFor(module:string,section:string,row:ApiRecord){const map:Record<string,string[]>={tasks:['title','assistant','status','priority','progress','dueDate','createdAt'],approvals:['title','type','amount','currency','status','requestedBy','createdAt'],automations:['name','enabled','lastRunAt','nextRunAt','trigger'],contacts:['firstName','lastName','email','phone','jobTitle','lifecycleStage'],companies:['name','domain','industry','phone','website','createdAt'],deals:['name','value','currency','stage','probability','status','expectedCloseDate'],transactions:['type','amount','currency','transactionDate','description','reference','status'],invoices:['invoiceNumber','status','issueDate','dueDate','currency','total','createdAt'],budgets:['name','amount','currency','periodStart','periodEnd','createdAt'],users:['firstName','lastName','email','status','role','createdAt'],auditLogs:['action','resourceType','resourceId','userId','createdAt'],integrations:['provider','displayName','status','createdAt','updatedAt']};const preferred=map[module]??map[section]??[];const available=preferred.filter(key=>key in row);return available.length?available:Object.keys(row).filter(key=>!['passwordHash','credentials','deletedAt','organizationId'].includes(key)).slice(0,7)}
