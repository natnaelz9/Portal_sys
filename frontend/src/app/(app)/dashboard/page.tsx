'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, kg, money } from '@/lib/api';
import { PageHeader } from '@/components/ui';

type Kpis = {
  suppliers: number;
  farmers: number;
  purchases: number;
  purchaseVolumeKg: number;
  stockKg: number;
  buyers: number;
  openOrders: number;
  shipments: number;
  employees: number;
  revenue: number;
  profit: number;
  inventoryByGrade: { origin: string; grade: string; _sum: { quantityKg: string } }[];
  exportByCountry: Record<string, number>;
  lowStock: { lotNumber: string; quantityKg: string; warehouse: { name: string }; origin: string }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Kpis | null>(null);

  useEffect(() => {
    api<Kpis>('/dashboard/kpis').then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <p>Loading dashboard…</p>;

  const cards = [
    ['On-hand stock', kg(data.stockKg)],
    ['Purchased volume', kg(data.purchaseVolumeKg)],
    ['Export revenue', money(data.revenue, 'USD')],
    ['Estimated profit', money(data.profit, 'USD')],
    ['Suppliers', String(data.suppliers)],
    ['Farmers', String(data.farmers)],
    ['Open orders', String(data.openOrders)],
    ['Shipments', String(data.shipments)],
  ];

  const chart = Object.entries(data.exportByCountry).map(([country, qty]) => ({ country, qty }));
  const grades = data.inventoryByGrade.map((r) => ({
    name: `${r.origin} ${r.grade}`,
    qty: Number(r._sum.quantityKg),
  }));

  return (
    <div>
      <PageHeader title="Executive dashboard" subtitle="Live KPIs across procurement, warehouse, export, and finance" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-xs uppercase tracking-wide text-roast-600">{label}</p>
            <p className="mt-2 font-display text-2xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-display text-lg">Export volume by destination</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.length ? chart : [{ country: 'No shipments', qty: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" fill="#3d2914" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="mb-4 font-display text-lg">Inventory by origin and grade</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grades}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" fill="#c4a574" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="card mt-6 p-5">
        <h3 className="mb-3 font-display text-lg">Low stock alerts</h3>
        {data.lowStock.length === 0 ? (
          <p className="text-sm text-roast-600">No lots below the 800 kg alert threshold.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.lowStock.map((lot) => (
              <li key={lot.lotNumber} className="flex justify-between rounded-xl bg-cream px-3 py-2">
                <span>
                  {lot.lotNumber} · {lot.origin} · {lot.warehouse.name}
                </span>
                <span className="font-semibold">{kg(lot.quantityKg)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
