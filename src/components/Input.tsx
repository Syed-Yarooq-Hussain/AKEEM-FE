import React from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Input({ label, className = '', ...rest }: Props) {
  return (
    <label className="block">
      {label && <span className="text-sm font-medium text-slate-700 mb-1 block">{label}</span>}
      <input
        className={`w-full px-3 py-2 border rounded-md bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
        {...rest}
      />
    </label>
  )
}
