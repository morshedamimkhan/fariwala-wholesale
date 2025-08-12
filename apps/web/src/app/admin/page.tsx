export default function AdminPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <ul className="list-disc list-inside text-sm text-gray-600">
        <li>Tenants</li>
        <li>Users & Roles</li>
        <li>Catalog governance</li>
        <li>Payments & Settings</li>
        <li>Reports</li>
      </ul>
    </div>
  );
}