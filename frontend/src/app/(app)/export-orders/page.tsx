'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, kg, money } from '@/lib/api';
import { Badge, Field, Modal, PageHeader, Table, useModal } from '@/components/ui';

export default function ExportOrdersPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const modal = useModal();

  async function load() {
    const [c, o, s, b, inv] = await Promise.all([
      api<any[]>('/export-contracts'),
      api<any[]>('/sales-orders'),
      api<any[]>('/shipments'),
      api<{ items: any[] }>('/buyers?limit=50'),
      api<{ items: any[] }>('/inventory?limit=50'),
    ]);
    setContracts(c);
    setOrders(o);
    setShipments(s);
    setBuyers(b.items);
    setLots(inv.items);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function addContract(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/export-contracts', {
      method: 'POST',
      body: JSON.stringify({ ...d, quantityKg: Number(d.quantityKg), unitPrice: Number(d.unitPrice) }),
    });
    modal.close();
    await load();
  }

  async function addOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/sales-orders', {
      method: 'POST',
      body: JSON.stringify({ ...d, quantityKg: Number(d.quantityKg), deliveryDate: d.deliveryDate || undefined }),
    });
    modal.close();
    await load();
  }

  async function addShipment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/shipments', {
      method: 'POST',
      body: JSON.stringify({ ...d, quantityKg: Number(d.quantityKg), bags: Number(d.bags) }),
    });
    modal.close();
    await load();
  }

  async function addLot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api(`/shipments/${d.shipmentId}/lots`, {
      method: 'POST',
      body: JSON.stringify({ batchId: d.batchId, quantityKg: Number(d.quantityKg), bags: Number(d.bags) }),
    });
    modal.close();
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Export order management"
        subtitle="Contracts, sales orders, shipment planning, and partial lots"
        action={<button className="btn-primary" onClick={modal.openModal}>New export record</button>}
      />
      <h2 className="mb-3 font-display text-xl">Contracts</h2>
      <Table
        headers={['Number', 'Buyer', 'Origin', 'Grade', 'Qty', 'Shipped', 'Remaining', 'Price', 'Incoterm', 'Status']}
        rows={contracts.map((c) => [
          c.number,
          c.buyer?.name,
          c.origin,
          c.grade,
          kg(c.quantityKg),
          kg(c.shippedKg),
          kg(Number(c.quantityKg) - Number(c.shippedKg)),
          money(c.unitPrice, c.currency),
          c.incoterm,
          <Badge key={c.id} status={c.status} />,
        ])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Sales orders</h2>
      <Table
        headers={['Number', 'Contract', 'Date', 'Qty', 'Delivery', 'Status', '']}
        rows={orders.map((o) => [
          o.number,
          o.contract?.number,
          new Date(o.orderDate).toLocaleDateString(),
          kg(o.quantityKg),
          o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : '—',
          <Badge key={o.id} status={o.status} />,
          o.status === 'DRAFT' ? (
            <button
              className="text-leaf"
              onClick={async () => {
                await api(`/sales-orders/${o.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) });
                await load();
              }}
            >
              Confirm
            </button>
          ) : '—',
        ])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Shipments</h2>
      <Table
        headers={['Number', 'Vessel', 'Route', 'ETD', 'ETA', 'Qty', 'Lots', 'Status']}
        rows={shipments.map((s) => [
          s.number,
          s.vessel || '—',
          `${s.originPort} → ${s.destPort}`,
          s.etd ? new Date(s.etd).toLocaleDateString() : '—',
          s.eta ? new Date(s.eta).toLocaleDateString() : '—',
          kg(s.quantityKg),
          String(s.lots?.length ?? 0),
          <Badge key={s.id} status={s.status} />,
        ])}
      />
      <Modal title="Contract, sales order, shipment, and lot" open={modal.open} onClose={modal.close}>
        <div className="grid gap-8 md:grid-cols-2">
          <form className="space-y-3" onSubmit={addContract}>
            <h3 className="font-semibold">Contract</h3>
            <Field label="Number"><input name="number" className="input" required /></Field>
            <Field label="Buyer">
              <select name="buyerId" className="input">{buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            </Field>
            <Field label="Signed"><input name="signedAt" type="date" className="input" required /></Field>
            <Field label="Origin"><input name="origin" className="input" required /></Field>
            <Field label="Process">
              <select name="process" className="input"><option>WASHED</option><option>NATURAL</option><option>HONEY</option></select>
            </Field>
            <Field label="Grade"><input name="grade" className="input" defaultValue="G1" /></Field>
            <Field label="Quantity kg"><input name="quantityKg" type="number" className="input" required /></Field>
            <Field label="USD / kg"><input name="unitPrice" type="number" step="0.01" className="input" required /></Field>
            <Field label="Incoterm"><input name="incoterm" className="input" defaultValue="FOB Djibouti" /></Field>
            <button className="btn-primary w-full">Save contract</button>
          </form>
          <form className="space-y-3" onSubmit={addOrder}>
            <h3 className="font-semibold">Sales order</h3>
            <Field label="Number"><input name="number" className="input" required /></Field>
            <Field label="Contract">
              <select name="contractId" className="input">{contracts.map((c) => <option key={c.id} value={c.id}>{c.number}</option>)}</select>
            </Field>
            <Field label="Order date"><input name="orderDate" type="date" className="input" required /></Field>
            <Field label="Quantity kg"><input name="quantityKg" type="number" className="input" required /></Field>
            <Field label="Delivery date"><input name="deliveryDate" type="date" className="input" /></Field>
            <button className="btn-primary w-full">Save order</button>
          </form>
          <form className="space-y-3" onSubmit={addShipment}>
            <h3 className="font-semibold">Shipment</h3>
            <Field label="Number"><input name="number" className="input" required /></Field>
            <Field label="Sales order">
              <select name="salesOrderId" className="input">{orders.map((o) => <option key={o.id} value={o.id}>{o.number}</option>)}</select>
            </Field>
            <Field label="Vessel"><input name="vessel" className="input" /></Field>
            <Field label="Destination port"><input name="destPort" className="input" required /></Field>
            <Field label="ETD"><input name="etd" type="date" className="input" /></Field>
            <Field label="ETA"><input name="eta" type="date" className="input" /></Field>
            <Field label="Quantity kg"><input name="quantityKg" type="number" className="input" required /></Field>
            <Field label="Bags"><input name="bags" type="number" className="input" required /></Field>
            <button className="btn-primary w-full">Plan shipment</button>
          </form>
          <form className="space-y-3" onSubmit={addLot}>
            <h3 className="font-semibold">Assign warehouse lot (partial shipment)</h3>
            <Field label="Shipment">
              <select name="shipmentId" className="input">{shipments.map((s) => <option key={s.id} value={s.id}>{s.number}</option>)}</select>
            </Field>
            <Field label="Lot">
              <select name="batchId" className="input">{lots.map((l) => <option key={l.id} value={l.id}>{l.lotNumber}</option>)}</select>
            </Field>
            <Field label="Quantity kg"><input name="quantityKg" type="number" className="input" required /></Field>
            <Field label="Bags"><input name="bags" type="number" className="input" required /></Field>
            <button className="btn-primary w-full">Reserve lot</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
