'use client';

import { useEffect, useState } from 'react';
import { api, kg, money } from '@/lib/api';
import { PageHeader, Table } from '@/components/ui';

export default function ReportsPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api('/dashboard/kpis'),
      api('/dashboard/reports'),
      api<{ items: any[] }>('/purchases?limit=20'),
      api<{ items: any[] }>('/inventory?limit=20'),
      api<{ items: any[] }>('/buyers?limit=20'),
      api<any[]>('/shipments'),
    ]).then(([k, r, p, i, b, s]) => {
      setKpis(k);
      setReports(r);
      setPurchases(p.items);
      setInventory(i.items);
      setBuyers(b.items);
      setShipments(s);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Reports & analytics" subtitle="Purchases, stock, grades, processing, aging, buyers, destinations, forecast, and profit" />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="card p-4"><p className="text-xs uppercase text-roast-600">Stock</p><p className="font-display text-2xl">{kg(kpis?.stockKg)}</p></div>
        <div className="card p-4"><p className="text-xs uppercase text-roast-600">Purchased</p><p className="font-display text-2xl">{kg(kpis?.purchaseVolumeKg)}</p></div>
        <div className="card p-4"><p className="text-xs uppercase text-roast-600">Revenue</p><p className="font-display text-2xl">{money(kpis?.revenue, 'USD')}</p></div>
        <div className="card p-4"><p className="text-xs uppercase text-roast-600">Profit</p><p className="font-display text-2xl">{money(kpis?.profit, 'mixed')}</p></div>
      </div>
      <h2 className="mb-3 font-display text-xl">Inventory aging</h2>
      <Table
        headers={['0–30 days', '31–90 days', '90+ days']}
        rows={[[kg(reports?.inventoryAging?.d0_30), kg(reports?.inventoryAging?.d31_90), kg(reports?.inventoryAging?.d90plus)]]}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Processing report</h2>
      <Table
        headers={['Process', 'On-hand qty']}
        rows={(reports?.processing || []).map((p: any) => [p.process, kg(p._sum?.quantityKg)])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Coffee grade report</h2>
      <Table
        headers={['Grade', 'On-hand qty']}
        rows={(reports?.grades || []).map((g: any) => [g.grade, kg(g._sum?.quantityKg)])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Purchase report</h2>
      <Table
        headers={['Number', 'Supplier', 'Origin', 'Grade', 'Qty', 'Status']}
        rows={purchases.map((p) => [p.number, p.supplier?.name, p.origin, p.grade, kg(p.quantityKg), p.status])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Warehouse stock report</h2>
      <Table
        headers={['Lot', 'Warehouse', 'Origin', 'Grade', 'Qty']}
        rows={inventory.map((l) => [l.lotNumber, l.warehouse?.name, l.origin, l.grade, kg(l.quantityKg)])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Supplier report</h2>
      <Table
        headers={['Supplier', 'Origin', 'Purchases', 'Score']}
        rows={(reports?.suppliers || []).map((s: any) => [s.name, s.origin || '—', String(s.purchases), s.lastScore ? Number(s.lastScore).toFixed(1) : '—'])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Buyer report</h2>
      <Table
        headers={['Buyer', 'Country', 'Contracts']}
        rows={buyers.map((b) => [b.name, b.country?.name, String(b._count?.contracts ?? 0)])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Export by destination</h2>
      <Table
        headers={['Shipment', 'Port', 'Qty', 'Status']}
        rows={shipments.map((s) => [s.number, s.destPort, kg(s.quantityKg), s.status])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Forecast (open contract remainder)</h2>
      <Table
        headers={['Contract', 'Buyer', 'Country', 'Remaining', 'Value']}
        rows={(reports?.forecast || []).map((f: any) => [f.contract, f.buyer, f.country, kg(f.remainingKg), money(f.valueUsd, 'USD')])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Employee performance</h2>
      <Table
        headers={['Employee', 'Period', 'Score']}
        rows={(reports?.employeePerformance || []).map((e: any) => [e.employee?.fullName, e.period, String(e.score)])}
      />
    </div>
  );
}
