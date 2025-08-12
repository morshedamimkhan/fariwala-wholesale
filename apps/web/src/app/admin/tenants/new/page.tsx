"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTenantPage() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      await fetch(baseUrl + "/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });
      router.push("/admin/tenants");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">New Tenant</h1>
      <div className="space-y-2">
        <label className="block text-sm">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Domain</label>
        <input value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <button disabled={submitting} className="inline-flex items-center rounded bg-black text-white text-sm px-3 py-2">
        {submitting ? "Creating..." : "Create"}
      </button>
    </form>
  );
}