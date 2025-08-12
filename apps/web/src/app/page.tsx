import Image from "next/image";

export default function Home() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Storefront</h1>
        <p className="text-sm text-gray-500">Search and browse products across vendors and warehouses.</p>
      </section>
      <section>
        <input className="w-full max-w-md border rounded px-3 py-2" placeholder="Search products..." />
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="border rounded p-4">
            <div className="h-32 bg-gray-100 rounded mb-3" />
            <div className="font-medium">Product {i}</div>
            <div className="text-sm text-gray-500">$0.00</div>
            <button className="mt-2 inline-flex items-center rounded bg-black text-white text-sm px-3 py-2">Add to cart</button>
          </div>
        ))}
      </section>
    </div>
  );
}
