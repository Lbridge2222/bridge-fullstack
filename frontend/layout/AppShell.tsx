import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function AppShell({ children }: Props) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900 text-white p-4 space-y-4">
        <h2 className="text-xl font-bold">Bridge CRM</h2>
        <nav className="space-y-2">
          <a href="#" className="block hover:text-indigo-400">Dashboard</a>
          <a href="#" className="block hover:text-indigo-400">Leads</a>
          <a href="#" className="block hover:text-indigo-400">Forecasts</a>
        </nav>
      </aside>
      <main className="flex-1 bg-gray-100 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}