'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, kg, money } from '@/lib/api';
import { Badge, Field, Modal, PageHeader, Table, useModal } from '@/components/ui';

export default function InventoryPage() {
  const [tab, setTab] = useState<'lots' | 'transfers' | 'damaged'>('lots');
  const [lots, setLots] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [damaged, setDamaged] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const modal = useModal();

  async function load() {
    const [inv, wh, al, tr, dmg] = await Promise.all([
      api<{ items: any[] }>('/inventory?limit=50'),
      api<any[]>('/warehouses'),
      api('/inventory/alerts'),
      api<any[]>('/stock-transfers'),
      api<any[]>('/damaged-stock'),
    ]);
    setLots(inv.items);
    setWarehouses(wh);
    setAlerts(al);
    setTransfers(tr);
    setDamaged(dmg);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function post(path: string, body: unknown) {
    await api(path, { method: 'POST', body: JSON.stringify(body) });
    modal.close();
    await load();
  }

  async function transfer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/stock-transfers', {
      ...d,
      quantityKg: Number(d.quantityKg),
      bags: Number(d.bags),
      transferredAt: new Date().toISOString(),
    });
  }

  async function createWarehouse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/warehouses', { ...d, capacityKg: Number(d.capacityKg) });
  }

  async function addBag(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post(`/inventory/${d.batchId}/bags`, { bagNo: d.bagNo, weightKg: Number(d.weightKg) });
  }

  async function adjust(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/stock-adjustments', { ...d, quantityKg: Number(d.quantityKg) });
  }

  async function reportDamage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/damaged-stock', { ...d, quantityKg: Number(d.quantityKg), bags: Number(d.bags) });
  }

  return (
    <div>
      <PageHeader
        title="Warehouse & inventory"
        subtitle="Lots, bags, transfers, valuation, damaged stock, and low-stock alerts"
        action={<button className="btn-primary" onClick={modal.openModal}>Warehouse action</button>}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase text-roast-600">On hand</p>
          <p className="font-display text-2xl">{kg(alerts?.onHandKg)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-roast-600">Inventory value</p>
          <p className="font-display text-2xl">{money(alerts?.valuationEtb, 'ETB')}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-roast-600">Warehouses</p>
          <p className="font-display text-2xl">{warehouses.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-roast-600">Low stock lots</p>
          <p className="font-display text-2xl">{alerts?.lowStock?.length ?? 0}</p>
        </div>
      </div>
      <div className="mb-4 flex gap-2">
        {(['lots', 'transfers', 'damaged'] as const).map((t) => (
          <button key={t} className={tab === t ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'lots' ? (
        <Table
          headers={['Lot', 'Warehouse', 'Origin', 'Process', 'Grade', 'Bags', 'Qty', 'Moisture', 'Unit value', 'Status']}
          rows={lots.map((l) => [
            l.lotNumber,
            l.warehouse?.name,
            l.origin,
            l.process,
            l.grade,
            String(l.bags),
            kg(l.quantityKg),
            `${l.moisturePct}%`,
            money(l.unitValue, l.currency),
            <Badge key={l.id} status={l.status} />,
          ])}
        />
      ) : null}
      {tab === 'transfers' ? (
        <Table
          headers={['Date', 'Lot', 'From', 'To', 'Qty', 'Bags']}
          rows={transfers.map((t) => [
            new Date(t.transferredAt).toLocaleDateString(),
            t.batch?.lotNumber,
            t.fromWarehouse?.name,
            t.toWarehouse?.name,
            kg(t.quantityKg),
            String(t.bags),
          ])}
        />
      ) : null}
      {tab === 'damaged' ? (
        <Table
          headers={['Date', 'Lot', 'Qty', 'Bags', 'Reason']}
          rows={damaged.map((d) => [
            new Date(d.reportedAt).toLocaleDateString(),
            d.batch?.lotNumber,
            kg(d.quantityKg),
            String(d.bags),
            d.reason,
          ])}
        />
      ) : null}
      <Modal title="Warehouse, bags, transfer, adjust, damage" open={modal.open} onClose={modal.close}>
        <div className="grid gap-8 md:grid-cols-2">
          <form className="space-y-3" onSubmit={createWarehouse}>
            <h3 className="font-semibold">Register warehouse</h3>
            <Field label="Code"><input name="code" className="input" required /></Field>
            <Field label="Name"><input name="name" className="input" required /></Field>
            <Field label="Location"><input name="location" className="input" required /></Field>
            <Field label="Capacity kg"><input name="capacityKg" type="number" className="input" required /></Field>
            <button className="btn-primary w-full">Save warehouse</button>
          </form>
          <form className="space-y-3" onSubmit={transfer}>
            <h3 className="font-semibold">Transfer stock</h3>
            <Field label="Lot">
              <select name="batchId" className="input">{lots.map((l) => <option key={l.id} value={l.id}>{l.lotNumber}</option>)}</select>
            </Field>
            <Field label="From">
              <select name="fromWarehouseId" className="input">{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            </Field>
            <Field label="To">
              <select name="toWarehouseId" className="input">{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            </Field>
            <Field label="Quantity kg"><input name="quantityKg" type="number" className="input" required /></Field>
            <Field label="Bags"><input name="bags" type="number" className="input" required /></Field>
            <button className="btn-primary w-full">Transfer</button>
          </form>
          <form className="space-y-3" onSubmit={addBag}>
            <h3 className="font-semibold">Coffee bag</h3>
            <Field label="Lot">
              <select name="batchId" className="input">{lots.map((l) => <option key={l.id} value={l.id}>{l.lotNumber}</option>)}</select>
            </Field>
            <Field label="Bag no"><input name="bagNo" className="input" required /></Field>
            <Field label="Weight kg"><input name="weightKg" type="number" step="0.1" className="input" required /></Field>
            <button className="btn-primary w-full">Add bag</button>
          </form>
          <form className="space-y-3" onSubmit={adjust}>
            <h3 className="font-semibold">Stock adjustment</h3>
            <Field label="Lot">
              <select name="batchId" className="input">{lots.map((l) => <option key={l.id} value={l.id}>{l.lotNumber}</option>)}</select>
            </Field>
            <Field label="Quantity kg (+/-)"><input name="quantityKg" type="number" className="input" required /></Field>
            <Field label="Reason"><input name="reason" className="input" required /></Field>
            <button className="btn-primary w-full">Adjust</button>
          </form>
          <form className="space-y-3" onSubmit={reportDamage}>
            <h3 className="font-semibold">Damaged stock</h3>
            <Field label="Lot">
              <select name="batchId" className="input">{lots.map((l) => <option key={l.id} value={l.id}>{l.lotNumber}</option>)}</select>
            </Field>
            <Field label="Quantity kg"><input name="quantityKg" type="number" className="input" required /></Field>
            <Field label="Bags"><input name="bags" type="number" className="input" required /></Field>
            <Field label="Reason"><input name="reason" className="input" required /></Field>
            <button className="btn-primary w-full">Report damage</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
