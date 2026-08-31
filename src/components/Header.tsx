import React from 'react'

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold">KI</div>
          <h1 className="text-lg font-semibold">KI Agentic</h1>
        </div>
        <nav>
          <ul className="flex items-center gap-4 text-sm text-slate-600">
            <li className="hover:text-slate-900">Dashboard</li>
            <li className="hover:text-slate-900">Projects</li>
            <li className="hover:text-slate-900">Settings</li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
