import { ReactNode } from 'react'

type LayoutProps = {
  children: ReactNode
}

export default function DefaultLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow p-4">
        <h1 className="text-xl font-semibold">Bridge CRM</h1>
      </header>

      <main className="p-6">{children}</main>
    </div>
  )
}