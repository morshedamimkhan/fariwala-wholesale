async function getTenants() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(baseUrl + "/tenants", { next: { revalidate: 0 } });
    if (!res.ok) return { items: [] };
    return res.json();
  } catch {
    return { items: [] };
  }
}

export default async function TenantsPage() {
  const data = await getTenants();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tenants</h1>
      <ul className="space-y-2">
        {data.items?.map((t: any) => (
          <li key={t.id} className="border rounded p-3">
            <div className="font-medium">{t.name}</div>
            <div className="text-xs text-gray-500">{t.domain}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}