'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, kg, money } from '@/lib/api';
import { Badge, Field, Modal, PageHeader, Table, useModal } from '@/components/ui';

type Supplier = {
  id: string;
  code: string;
  name: string;
  type: string;
  origin?: string;
  region?: string;
  contactName?: string;
  _count?: { farmers: number; purchases: number };
};

const tabs = ['suppliers', 'farmers', 'sites', 'stations', 'contracts', 'payments', 'evaluations'] as const;

export default function SuppliersPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const modal = useModal();

  async function load() {
    const [s, f, si, st, c, p, e] = await Promise.all([
      api<{ items: Supplier[] }>('/suppliers?limit=50'),
      api<{ items: any[] }>('/farmers?limit=50'),
      api<any[]>('/sites'),
      api<any[]>('/washing-stations'),
      api<any[]>('/supplier-contracts'),
      api<any[]>('/supplier-payments'),
      api<any[]>('/supplier-evaluations'),
    ]);
    setSuppliers(s.items);
    setFarmers(f.items);
    setSites(si);
    setStations(st);
    setContracts(c);
    setPayments(p);
    setEvaluations(e);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function post(path: string, body: unknown) {
    await api(path, { method: 'POST', body: JSON.stringify(body) });
    modal.close();
    await load();
  }

  async function createSupplier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await post('/suppliers', Object.fromEntries(new FormData(e.currentTarget).entries()));
  }

  async function createFarmer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/farmers', {
      ...data,
      farmSizeHa: Number(data.farmSizeHa || 0),
      supplierId: data.supplierId || undefined,
    });
  }

  async function createSite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/sites', { ...data, altitudeM: data.altitudeM ? Number(data.altitudeM) : undefined });
  }

  async function createStation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/washing-stations', { ...data, capacityKg: data.capacityKg ? Number(data.capacityKg) : undefined });
  }

  async function createContract(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/supplier-contracts', {
      ...data,
      volumeKg: Number(data.volumeKg),
      unitPrice: Number(data.unitPrice),
    });
  }

  async function createPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/supplier-payments', { ...data, amount: Number(data.amount) });
  }

  async function createEval(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/supplier-evaluations', {
      ...data,
      quality: Number(data.quality),
      delivery: Number(data.delivery),
      reliability: Number(data.reliability),
    });
  }

  return (
    <div>
      <PageHeader
        title="Supplier & farmer management"
        subtitle="Cooperatives, washing stations, sites, contracts, payments, and performance"
        action={
          <button className="btn-primary" onClick={modal.openModal}>
            Add record
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} className={tab === t ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'suppliers' ? (
        <Table
          headers={['Code', 'Name', 'Type', 'Origin', 'Farmers', 'Purchases', 'Contact']}
          rows={suppliers.map((s) => [
            s.code,
            s.name,
            s.type,
            s.origin || '—',
            String(s._count?.farmers ?? 0),
            String(s._count?.purchases ?? 0),
            s.contactName || '—',
          ])}
        />
      ) : null}
      {tab === 'farmers' ? (
        <Table
          headers={['Code', 'Name', 'Region', 'Woreda', 'Variety', 'Supplier']}
          rows={farmers.map((f) => [f.code, f.fullName, f.region, f.woreda || '—', f.variety || '—', f.supplier?.name || '—'])}
        />
      ) : null}
      {tab === 'sites' ? (
        <Table
          headers={['Site', 'Location', 'Altitude', 'Supplier']}
          rows={sites.map((s) => [s.name, s.location, s.altitudeM ? `${s.altitudeM} m` : '—', s.supplier?.name])}
        />
      ) : null}
      {tab === 'stations' ? (
        <Table
          headers={['Station', 'Location', 'Capacity', 'Supplier']}
          rows={stations.map((s) => [s.name, s.location, s.capacityKg ? kg(s.capacityKg) : '—', s.supplier?.name])}
        />
      ) : null}
      {tab === 'contracts' ? (
        <Table
          headers={['Number', 'Supplier', 'Volume', 'Price', 'Status']}
          rows={contracts.map((c) => [c.number, c.supplier?.name, kg(c.volumeKg), `${c.currency} ${c.unitPrice}`, <Badge key={c.id} status={c.status} />])}
        />
      ) : null}
      {tab === 'payments' ? (
        <Table
          headers={['Date', 'Supplier', 'Amount', 'Method', 'Reference']}
          rows={payments.map((p) => [
            new Date(p.paidAt).toLocaleDateString(),
            p.supplier?.name,
            money(p.amount, p.currency),
            p.method,
            p.reference || '—',
          ])}
        />
      ) : null}
      {tab === 'evaluations' ? (
        <Table
          headers={['Supplier', 'Period', 'Quality', 'Delivery', 'Reliability']}
          rows={evaluations.map((e) => [e.supplier?.name, e.period, String(e.quality), String(e.delivery), String(e.reliability)])}
        />
      ) : null}

      <Modal title="Register supplier records" open={modal.open} onClose={modal.close}>
        <div className="grid gap-8 md:grid-cols-2">
          <form className="space-y-3" onSubmit={createSupplier}>
            <h3 className="font-semibold">Supplier</h3>
            <Field label="Code"><input name="code" className="input" required /></Field>
            <Field label="Name"><input name="name" className="input" required /></Field>
            <Field label="Type">
              <select name="type" className="input">
                <option>COOPERATIVE</option>
                <option>FARMER</option>
                <option>LOCAL_SUPPLIER</option>
                <option>WASHING_STATION</option>
              </select>
            </Field>
            <Field label="Origin"><input name="origin" className="input" /></Field>
            <Field label="Region"><input name="region" className="input" /></Field>
            <Field label="Phone"><input name="phone" className="input" /></Field>
            <Field label="Email"><input name="email" className="input" /></Field>
            <Field label="Contact"><input name="contactName" className="input" /></Field>
            <button className="btn-primary w-full">Save supplier</button>
          </form>
          <form className="space-y-3" onSubmit={createFarmer}>
            <h3 className="font-semibold">Farmer</h3>
            <Field label="Code"><input name="code" className="input" required /></Field>
            <Field label="Full name"><input name="fullName" className="input" required /></Field>
            <Field label="Region"><input name="region" className="input" required /></Field>
            <Field label="Woreda"><input name="woreda" className="input" /></Field>
            <Field label="Kebele"><input name="kebele" className="input" /></Field>
            <Field label="Variety"><input name="variety" className="input" /></Field>
            <Field label="Farm size (ha)"><input name="farmSizeHa" type="number" step="0.1" className="input" /></Field>
            <Field label="Supplier">
              <select name="supplierId" className="input">
                <option value="">Independent</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <button className="btn-primary w-full">Save farmer</button>
          </form>
          <form className="space-y-3" onSubmit={createSite}>
            <h3 className="font-semibold">Site</h3>
            <Field label="Name"><input name="name" className="input" required /></Field>
            <Field label="Location"><input name="location" className="input" required /></Field>
            <Field label="Altitude m"><input name="altitudeM" type="number" className="input" /></Field>
            <Field label="Supplier">
              <select name="supplierId" className="input">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <button className="btn-primary w-full">Save site</button>
          </form>
          <form className="space-y-3" onSubmit={createStation}>
            <h3 className="font-semibold">Washing station</h3>
            <Field label="Name"><input name="name" className="input" required /></Field>
            <Field label="Location"><input name="location" className="input" required /></Field>
            <Field label="Capacity kg"><input name="capacityKg" type="number" className="input" /></Field>
            <Field label="Supplier">
              <select name="supplierId" className="input">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <button className="btn-primary w-full">Save station</button>
          </form>
          <form className="space-y-3" onSubmit={createContract}>
            <h3 className="font-semibold">Supplier contract</h3>
            <Field label="Number"><input name="number" className="input" required /></Field>
            <Field label="Supplier">
              <select name="supplierId" className="input">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <Field label="Start"><input name="startDate" type="date" className="input" required /></Field>
            <Field label="End"><input name="endDate" type="date" className="input" required /></Field>
            <Field label="Volume kg"><input name="volumeKg" type="number" className="input" required /></Field>
            <Field label="Unit price"><input name="unitPrice" type="number" className="input" required /></Field>
            <button className="btn-primary w-full">Save contract</button>
          </form>
          <form className="space-y-3" onSubmit={createPayment}>
            <h3 className="font-semibold">Supplier payment</h3>
            <Field label="Supplier">
              <select name="supplierId" className="input">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <Field label="Amount"><input name="amount" type="number" className="input" required /></Field>
            <Field label="Currency"><input name="currency" className="input" defaultValue="ETB" /></Field>
            <Field label="Paid at"><input name="paidAt" type="date" className="input" required /></Field>
            <Field label="Method"><input name="method" className="input" required /></Field>
            <Field label="Reference"><input name="reference" className="input" /></Field>
            <button className="btn-primary w-full">Save payment</button>
          </form>
          <form className="space-y-3" onSubmit={createEval}>
            <h3 className="font-semibold">Performance evaluation</h3>
            <Field label="Supplier">
              <select name="supplierId" className="input">{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <Field label="Period"><input name="period" className="input" required /></Field>
            <Field label="Quality"><input name="quality" type="number" className="input" required /></Field>
            <Field label="Delivery"><input name="delivery" type="number" className="input" required /></Field>
            <Field label="Reliability"><input name="reliability" type="number" className="input" required /></Field>
            <button className="btn-primary w-full">Save evaluation</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
