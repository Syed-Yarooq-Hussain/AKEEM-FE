import React from 'react'
import Button from '../components/Button'

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      <section className="col-span-2 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Welcome</h2>
        <p className="text-sm text-slate-600 mb-6">This is a scaffolded frontend matching the Figma layout. Implement pages as per design.</p>
        <div className="flex gap-3">
          <Button>Primary Action</Button>
          <Button variant="secondary">Secondary</Button>
        </div>
      </section>

      <aside className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-medium mb-2">Activity</h3>
        <ul className="text-sm text-slate-600 space-y-2">
          <li>Task A</li>
          <li>Task B</li>
          <li>Task C</li>
        </ul>
      </aside>
    </div>
  )
}
