type StatCardProps = {
  title: string
  value: string | number
  icon?: React.ReactNode
}

// 🔥 CHANGE: Use named export instead of default export
export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-card-foreground">{value}</p>
      </div>
      {icon && <div className="text-muted-foreground">{icon}</div>}
    </div>
  )
}

// Keep default export for backwards compatibility
export default StatCard;