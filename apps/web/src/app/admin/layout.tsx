export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <nav className="text-sm flex gap-3">
        <a href="/admin">Overview</a>
        <a href="/admin/tenants">Tenants</a>
      </nav>
      {children}
    </div>
  );
}