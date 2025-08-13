async function getProducts(tenantId?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const url = new URL(baseUrl + '/products');
  if (tenantId) url.searchParams.set('tenantId', tenantId);
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return { items: [] };
    return res.json();
  } catch {
    return { items: [] };
  }
}

export default async function ProductsPage({ searchParams }: { searchParams: { tenantId?: string } }) {
  const data = await getProducts(searchParams?.tenantId);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.items?.map((p: any) => (
          <div key={p.id} className="border rounded p-4">
            <div className="font-medium">{p.title}</div>
            <div className="text-xs text-gray-500">{p.sku}</div>
            <div className="text-sm">{(p.priceCents/100).toFixed(2)} {p.currency}</div>
          </div>
        ))}
      </div>
    </div>
  );
}