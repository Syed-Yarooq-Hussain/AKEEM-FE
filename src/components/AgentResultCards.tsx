import { ActionResult, DelegationResult, actionLabels, actionResourceModule } from '../services/ai'

type Props = {
  delegations?: DelegationResult[]
  actions?: ActionResult[]
  onNavigate: (module: string) => void
}

const assistantNames: Record<string, string> = {
  ceo:'CEO', executive:'Executive', sales:'Sales', finance:'Finance', marketing:'Marketing', legal:'Legal', operations:'Operations', 'customer-success':'Customer Success',
}

export default function AgentResultCards({ delegations, actions, onNavigate }: Props) {
  if (!delegations?.length && !actions?.length) return null
  return <div className="mt-2 space-y-2 text-left">
    {delegations?.map((delegation) => <details key={delegation.id} className={`rounded-xl border ${delegation.status === 'completed' ? 'border-violet-100 bg-violet-50/60' : 'border-amber-200 bg-amber-50'}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[11px]">
        <span className={`h-2 w-2 rounded-full ${delegation.status === 'completed' ? 'bg-violet-500' : 'bg-amber-500'}`}/>
        <b>{assistantNames[delegation.assistant] ?? delegation.assistant} specialist</b>
        <span className="min-w-0 flex-1 truncate text-slate-500">{delegation.objective}</span>
        <span className="capitalize text-slate-400">{delegation.status}</span>
      </summary>
      <div className="border-t border-current/5 px-3 py-2 text-[11px] leading-5 text-slate-600">
        {delegation.error ? <p className="text-red-600">{delegation.error}</p> : <p className="whitespace-pre-wrap">{delegation.answer}</p>}
        {delegation.model && <p className="mt-1 text-[9px] text-slate-400">{delegation.model}{delegation.usage ? ` · ${delegation.usage.inputTokens ?? 0} in · ${delegation.usage.outputTokens ?? 0} out` : ''}</p>}
        {delegation.actions?.length ? <ActionRows actions={delegation.actions} onNavigate={onNavigate}/> : null}
      </div>
    </details>)}
    {actions?.length ? <ActionRows actions={actions} onNavigate={onNavigate}/> : null}
  </div>
}

function ActionRows({ actions, onNavigate }: { actions: ActionResult[]; onNavigate: (module: string) => void }) {
  return <div className="mt-2 space-y-1.5">{actions.map((action, index) => {
    const successful = action.status === 'executed'
    const failed = action.status === 'failed'
    return <div key={`${action.type}-${action.resource?.id ?? index}`} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[10px] ${successful ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : failed ? 'border-red-100 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600'}`}>
      <span className="font-bold">{successful ? '✓' : failed ? '!' : '○'}</span>
      <span className="min-w-0 flex-1"><b className="block">{successful ? actionLabels[action.type] : action.type.replaceAll('_', ' ')}</b><span>{action.error || action.reason}</span></span>
      {successful && action.resource && <button onClick={() => onNavigate(actionResourceModule[action.resource!.type])} className="shrink-0 font-bold text-blue-600 hover:underline">View #{action.resource.id}</button>}
    </div>
  })}</div>
}
