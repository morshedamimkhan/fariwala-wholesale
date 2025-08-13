import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Multi-tenant marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b">
          <nav className="mx-auto max-w-6xl flex flex-wrap items-center gap-4 p-4 text-sm">
            <Link href="/">Storefront</Link>
            <Link href="/products">Products</Link>
            <Link href="/products/new">New Product</Link>
            <Link href="/admin">Admin</Link>
            <Link href="/admin/tenants">Tenants</Link>
            <Link href="/admin/tenants/new">New Tenant</Link>
            <Link href="/vendor">Vendor</Link>
            <Link href="/wms">WMS</Link>
            <Link href="/support">Support</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
