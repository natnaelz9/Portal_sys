'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge, Field, Modal, PageHeader, Table, useModal } from '@/components/ui';

const types = [
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'EXPORT_PERMIT',
  'CERTIFICATE_OF_ORIGIN',
  'PHYTOSANITARY',
  'QUALITY_CERTIFICATE',
  'BILL_OF_LADING',
  'SHIPPING_INSTRUCTIONS',
  'CUSTOMS',
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const modal = useModal();

  async function load() {
    const [d, s, c] = await Promise.all([
      api<any[]>('/documents'),
      api<any[]>('/shipments'),
      api<any[]>('/quality/certificates'),
    ]);
    setDocs(d);
    setShipments(s);
    setCerts(c);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/documents', {
      method: 'POST',
      body: JSON.stringify({ ...d, certificateId: d.certificateId || undefined }),
    });
    modal.close();
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Export documentation"
        subtitle="Invoices, packing lists, permits, COO, phyto, B/L, and approval workflow"
        action={<button className="btn-primary" onClick={modal.openModal}>Add document</button>}
      />
      <Table
        headers={['Title', 'Type', 'Shipment', 'File', 'Status', 'Notes', '']}
        rows={docs.map((d) => [
          d.title,
          d.type.replaceAll('_', ' '),
          d.shipment?.number || '—',
          d.fileName || '—',
          <Badge key={d.id} status={d.status} />,
          d.notes ? <span key={`n-${d.id}`} className="block max-w-xs whitespace-pre-wrap text-xs">{d.notes}</span> : '—',
          d.status !== 'APPROVED' ? (
            <button
              className="text-leaf"
              onClick={async () => {
                await api(`/documents/${d.id}/approve`, { method: 'POST' });
                await load();
              }}
            >
              Approve
            </button>
          ) : (
            '—'
          ),
        ])}
      />
      <Modal title="Create or generate export documents" open={modal.open} onClose={modal.close}>
        <form className="mb-8 space-y-3" onSubmit={onSubmit}>
          <Field label="Title"><input name="title" className="input" required /></Field>
          <Field label="Type">
            <select name="type" className="input">{types.map((t) => <option key={t}>{t}</option>)}</select>
          </Field>
          <Field label="Shipment">
            <select name="shipmentId" className="input">{shipments.map((s) => <option key={s.id} value={s.id}>{s.number}</option>)}</select>
          </Field>
          <Field label="Quality certificate">
            <select name="certificateId" className="input">
              <option value="">None</option>
              {certs.map((c) => <option key={c.id} value={c.id}>{c.number}</option>)}
            </select>
          </Field>
          <Field label="File name / storage ref"><input name="fileName" className="input" placeholder="invoice-shp-004.pdf" /></Field>
          <Field label="Notes"><input name="notes" className="input" /></Field>
          <button className="btn-primary">Save</button>
        </form>
        <div className="border-t border-roast-700/10 pt-4">
          <h3 className="mb-3 font-semibold">Generate commercial invoice and packing list</h3>
          <div className="flex flex-wrap gap-2">
            {shipments.map((s) => (
              <button
                key={s.id}
                className="btn-ghost"
                onClick={async () => {
                  await api(`/documents/generate/${s.id}`, { method: 'POST' });
                  modal.close();
                  await load();
                }}
              >
                Generate for {s.number}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
