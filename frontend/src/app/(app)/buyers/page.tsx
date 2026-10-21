'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '@/lib/api';
import { Field, Modal, PageHeader, Table, useModal } from '@/components/ui';

export default function BuyersPage() {
  const [tab, setTab] = useState<'buyers' | 'detail'>('buyers');
  const [buyers, setBuyers] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const modal = useModal();

  async function load() {
    const [b, c] = await Promise.all([api<{ items: any[] }>('/buyers?limit=50'), api<any[]>('/countries')]);
    setBuyers(b.items);
    setCountries(c);
  }

  async function openBuyer(id: string) {
    const detail = await api(`/buyers/${id}`);
    setSelected(detail);
    setTab('detail');
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/buyers', {
      method: 'POST',
      body: JSON.stringify({ ...d, creditLimit: Number(d.creditLimit || 0) }),
    });
    modal.close();
    await load();
  }

  async function addCountry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await api('/countries', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget).entries())) });
    modal.close();
    await load();
  }

  async function addRelated(path: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api(path, { method: 'POST', body: JSON.stringify({ ...d, buyerId: selected.id, priceUsd: d.priceUsd ? Number(d.priceUsd) : undefined }) });
    await openBuyer(selected.id);
  }

  return (
    <div>
      <PageHeader
        title="International buyers"
        subtitle="Profiles, countries, contacts, credit limits, price agreements, and communications"
        action={<button className="btn-primary" onClick={modal.openModal}>Register buyer / country</button>}
      />
      {tab === 'buyers' ? (
        <Table
          headers={['Code', 'Buyer', 'Country', 'Email', 'Credit limit', 'Contracts', '']}
          rows={buyers.map((b) => [
            b.code,
            b.name,
            b.country?.name,
            b.email || '—',
            money(b.creditLimit, b.currency),
            String(b._count?.contracts ?? 0),
            <button key={b.id} className="text-leaf" onClick={() => openBuyer(b.id)}>Open</button>,
          ])}
        />
      ) : selected ? (
        <div className="space-y-6">
          <button className="btn-ghost" onClick={() => setTab('buyers')}>Back to buyers</button>
          <div className="card p-5">
            <h2 className="font-display text-xl">{selected.name}</h2>
            <p className="text-sm text-roast-600">{selected.country?.name} · credit {money(selected.creditLimit, selected.currency)}</p>
          </div>
          <h3 className="font-semibold">Contacts</h3>
          <Table headers={['Name', 'Role', 'Email', 'Phone']} rows={(selected.contacts || []).map((c: any) => [c.name, c.role || '—', c.email || '—', c.phone || '—'])} />
          <h3 className="font-semibold">Price agreements</h3>
          <Table headers={['Grade', 'Process', 'USD/kg', 'Valid']} rows={(selected.agreements || []).map((a: any) => [a.grade, a.process, money(a.priceUsd, 'USD'), `${new Date(a.validFrom).toLocaleDateString()} – ${new Date(a.validTo).toLocaleDateString()}`])} />
          <h3 className="font-semibold">Communications</h3>
          <Table headers={['Subject', 'Body']} rows={(selected.communications || []).map((n: any) => [n.subject, n.body])} />
          <h3 className="font-semibold">Contract history</h3>
          <Table headers={['Number', 'Origin', 'Qty', 'Status']} rows={(selected.contracts || []).map((c: any) => [c.number, c.origin, String(c.quantityKg), c.status])} />
          <div className="grid gap-6 md:grid-cols-3">
            <form className="card space-y-3 p-4" onSubmit={(e) => addRelated('/buyer-contacts', e)}>
              <h4 className="font-semibold">Add contact</h4>
              <Field label="Name"><input name="name" className="input" required /></Field>
              <Field label="Role"><input name="role" className="input" /></Field>
              <Field label="Email"><input name="email" className="input" /></Field>
              <button className="btn-primary w-full">Save</button>
            </form>
            <form className="card space-y-3 p-4" onSubmit={(e) => addRelated('/price-agreements', e)}>
              <h4 className="font-semibold">Price agreement</h4>
              <Field label="Grade"><input name="grade" className="input" required /></Field>
              <Field label="Process"><select name="process" className="input"><option>WASHED</option><option>NATURAL</option><option>HONEY</option></select></Field>
              <Field label="USD / kg"><input name="priceUsd" type="number" step="0.01" className="input" required /></Field>
              <Field label="From"><input name="validFrom" type="date" className="input" required /></Field>
              <Field label="To"><input name="validTo" type="date" className="input" required /></Field>
              <button className="btn-primary w-full">Save</button>
            </form>
            <form className="card space-y-3 p-4" onSubmit={(e) => addRelated('/buyer-notes', e)}>
              <h4 className="font-semibold">Communication</h4>
              <Field label="Subject"><input name="subject" className="input" required /></Field>
              <Field label="Body"><input name="body" className="input" required /></Field>
              <button className="btn-primary w-full">Save</button>
            </form>
          </div>
        </div>
      ) : null}
      <Modal title="Buyer registration" open={modal.open} onClose={modal.close}>
        <div className="grid gap-8 md:grid-cols-2">
          <form className="space-y-3" onSubmit={onSubmit}>
            <h3 className="font-semibold">Buyer</h3>
            <Field label="Code"><input name="code" className="input" required /></Field>
            <Field label="Name"><input name="name" className="input" required /></Field>
            <Field label="Country">
              <select name="countryId" className="input">{countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </Field>
            <Field label="Email"><input name="email" className="input" /></Field>
            <Field label="Phone"><input name="phone" className="input" /></Field>
            <Field label="Credit limit USD"><input name="creditLimit" type="number" className="input" /></Field>
            <button className="btn-primary">Save buyer</button>
          </form>
          <form className="space-y-3" onSubmit={addCountry}>
            <h3 className="font-semibold">Country</h3>
            <Field label="Name"><input name="name" className="input" required /></Field>
            <Field label="Code"><input name="code" className="input" required /></Field>
            <button className="btn-primary w-full">Save country</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
