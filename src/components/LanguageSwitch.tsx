import { useLanguage } from '../i18n/LanguageContext'

export default function LanguageSwitch({dark=false}:{dark?:boolean}) {
  const {language,setLanguage}=useLanguage()
  return <div aria-label="Language" className={`inline-flex rounded-lg border p-0.5 text-[11px] font-bold ${dark?'border-white/20 bg-white/10':'border-slate-200 bg-slate-50'}`}>
    {(['en','de'] as const).map(value=><button key={value} onClick={()=>setLanguage(value)} aria-pressed={language===value} className={`rounded-md px-2 py-1 transition ${language===value?(dark?'bg-white text-blue-800':'bg-white text-blue-600 shadow-sm'):(dark?'text-white/70':'text-slate-400')}`}>{value.toUpperCase()}</button>)}
  </div>
}
