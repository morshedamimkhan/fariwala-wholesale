"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const [tenantId, setTenantId] = useState("");
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState<number>(0);
  const [currency, setCurrency] = useState("USD");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      await fetch(baseUrl + '/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId, sku, title, description, priceCents, currency }),
      });
      router.push('/products');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">New Product</h1>
      <div className="space-y-2">
        <label className="block text-sm">Tenant ID</label>
        <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">SKU</label>
        <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Price (cents)</label>
        <input type="number" value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} className="w-full border rounded px-3 py-2" required />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Currency</label>
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <button disabled={submitting} className="inline-flex items-center rounded bg-black text-white text-sm px-3 py-2">{submitting ? 'Creating...' : 'Create'}</button>
    </form>
  );
}