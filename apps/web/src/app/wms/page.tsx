export default function WMSPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Warehouse (WMS)</h1>
      <ul className="list-disc list-inside text-sm text-gray-600">
        <li>Inbound</li>
        <li>Outbound</li>
        <li>Inventory</li>
        <li>Returns</li>
        <li>Carriers</li>
      </ul>
    </div>
  );
}