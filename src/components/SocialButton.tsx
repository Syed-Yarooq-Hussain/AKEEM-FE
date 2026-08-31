import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode
  children: React.ReactNode
}

export default function SocialButton({ icon, children, className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`w-full inline-flex items-center justify-center gap-3 px-4 py-2 rounded-md border bg-white text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400 ${className}`}
    >
      <span className="w-5 h-5">{icon}</span>
      <span>{children}</span>
    </button>
  )
}
