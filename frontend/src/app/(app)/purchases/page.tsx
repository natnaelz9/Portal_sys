'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, kg, money } from '@/lib/api';
import { Badge, Field, Modal, PageHeader, Table, useModal } from '@/components/ui';

export default function PurchasesPage() {
  const [tab, setTab] = useState<'purchases' | 'orders'>('purchases');
  const [rows, setRows] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const modal = useModal();

  async function load() {
    const [p, s, w, f, po] = await Promise.all([
      api<{ items: any[] }>('/purchases?limit=50'),
      api<{ items: any[] }>('/suppliers?limit=50'),
      api<any[]>('/warehouses'),
      api<{ items: any[] }>('/farmers?limit=50'),
      api<any[]>('/purchase-orders'),
    ]);
    setRows(p.items);
    setSuppliers(s.items);
    setWarehouses(w);
    setFarmers(f.items);
    setOrders(po);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/purchases', {
      method: 'POST',
      body: JSON.stringify({
        ...d,
        farmerId: d.farmerId || undefined,
        purchaseOrderId: d.purchaseOrderId || undefined,
        bags: Number(d.bags),
        quantityKg: Number(d.quantityKg),
        moisturePct: Number(d.moisturePct),
        unitPrice: Number(d.unitPrice),
      }),
    });
    modal.close();
    await load();
  }

  async function createPo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        ...d,
        quantityKg: Number(d.quantityKg),
        unitPrice: Number(d.unitPrice),
      }),
    });
    modal.close();
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Coffee purchasing"
        subtitle="Orders, lots, moisture, grade, receipts, approval, and supplier payments"
        action={<button className="btn-primary" onClick={modal.openModal}>New record</button>}
      />
      <div className="mb-4 flex gap-2">
        <button className={tab === 'purchases' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('purchases')}>Purchases</button>
        <button className={tab === 'orders' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('orders')}>Purchase orders</button>
      </div>
      {tab === 'purchases' ? (
        <Table
          headers={['Number', 'Date', 'Supplier', 'Origin', 'Process', 'Grade', 'Qty', 'Moisture', 'Value', 'Receipt', 'Status', '']}
          rows={rows.map((r) => [
            r.number,
            new Date(r.purchaseDate).toLocaleDateString(),
            r.supplier?.name,
            r.origin,
            r.process,
            r.grade,
            kg(r.quantityKg),
            `${r.moisturePct}%`,
            money(Number(r.quantityKg) * Number(r.unitPrice), r.currency),
            r.receiptNo || '—',
            <Badge key={r.id} status={r.status} />,
            r.status === 'PENDING' ? (
              <span key={`a-${r.id}`} className="flex gap-2">
                <button
                  className="text-leaf"
                  onClick={async () => {
                    await api(`/purchases/${r.id}/approve`, { method: 'POST' });
                    await load();
                  }}
                >
                  Approve
                </button>
                <button
                  className="text-rose-700"
                  onClick={async () => {
                    await api(`/purchases/${r.id}/reject`, { method: 'POST' });
                    await load();
                  }}
                >
                  Reject
                </button>
              </span>
            ) : (
              '—'
            ),
          ])}
        />
      ) : (
        <Table
          headers={['Number', 'Supplier', 'Process', 'Grade', 'Qty', 'Price', 'Status']}
          rows={orders.map((o) => [
            o.number,
            o.supplier?.name,
            o.process,
            o.grade,
            kg(o.quantityKg),
            money(o.unitPrice, 'ETB'),
            <Badge key={o.id} status={o.status} />,
          ])}
        />
      )}
      <Modal title="Purchase order or coffee purchase" open={modal.open} onClose={modal.close}>
        <div className="grid gap-8 md:grid-cols-2">
          <form className="space-y-3" onSubmit={createPo}>
            <h3 className="font-semibold">Purchase order</h3>
            <Field label="Number"><input name="number" className="input" required /></Field>
            <Field label="Supplier">
              <select name="supplierId" className="input">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <Field label="Process">
              <select name="process" className="input">
                <option>WASHED</option>
                <option>NATURAL</option>
                <option>HONEY</option>
                <option>PULPED_NATURAL</option>
              </select>
            </Field>
            <Field label="Grade"><input name="grade" className="input" defaultValue="G1" /></Field>
            <Field label="Quantity kg"><input name="quantityKg" type="number" className="input" required /></Field>
            <Field label="Unit price"><input name="unitPrice" type="number" className="input" required /></Field>
            <button className="btn-primary w-full">Save order</button>
          </form>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <h3 className="font-semibold">Coffee purchase</h3>
            <Field label="Number"><input name="number" className="input" required /></Field>
            <Field label="Date"><input name="purchaseDate" type="date" className="input" required /></Field>
            <Field label="Supplier">
              <select name="supplierId" className="input">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <Field label="Farmer">
              <select name="farmerId" className="input">
                <option value="">None</option>
                {farmers.map((f) => <option key={f.id} value={f.id}>{f.fullName}</option>)}
              </select>
            </Field>
            <Field label="Purchase order">
              <select name="purchaseOrderId" className="input">
                <option value="">None</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.number}</option>)}
              </select>
            </Field>
            <Field label="Warehouse">
              <select name="warehouseId" className="input">{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            </Field>
            <Field label="Origin"><input name="origin" className="input" required /></Field>
            <Field label="Process">
              <select name="process" className="input">
                <option>WASHED</option>
                <option>NATURAL</option>
                <option>HONEY</option>
                <option>PULPED_NATURAL</option>
              </select>
            </Field>
            <Field label="Grade"><input name="grade" className="input" defaultValue="G1" /></Field>
            <Field label="Bags"><input name="bags" type="number" className="input" required /></Field>
            <Field label="Quantity kg"><input name="quantityKg" type="number" className="input" required /></Field>
            <Field label="Moisture %"><input name="moisturePct" type="number" step="0.1" className="input" required /></Field>
            <Field label="Unit price"><input name="unitPrice" type="number" className="input" required /></Field>
            <Field label="Inspection"><input name="inspection" className="input" /></Field>
            <button className="btn-primary">Save and receive into warehouse</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
