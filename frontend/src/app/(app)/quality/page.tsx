'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge, Field, Modal, PageHeader, Table, useModal } from '@/components/ui';

export default function QualityPage() {
  const [tab, setTab] = useState<'tests' | 'certs' | 'rejects'>('tests');
  const [tests, setTests] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [rejects, setRejects] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const modal = useModal();

  async function load() {
    const [t, s, c, inv, r] = await Promise.all([
      api<any[]>('/quality/tests'),
      api<any[]>('/quality/samples'),
      api<any[]>('/quality/certificates'),
      api<{ items: any[] }>('/inventory?limit=50'),
      api<any[]>('/quality/rejections'),
    ]);
    setTests(t);
    setSamples(s);
    setCerts(c);
    setLots(inv.items);
    setRejects(r);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function addSample(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/quality/samples', { method: 'POST', body: JSON.stringify(d) });
    modal.close();
    await load();
  }

  async function addTest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/quality/tests', {
      method: 'POST',
      body: JSON.stringify({
        ...d,
        moisturePct: Number(d.moisturePct),
        cupScore: Number(d.cupScore),
        defectCount: Number(d.defectCount || 0),
        passed: d.passed === 'true',
      }),
    });
    modal.close();
    await load();
  }

  async function addCert(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/quality/certificates', { method: 'POST', body: JSON.stringify(d) });
    modal.close();
    await load();
  }

  async function addReject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/quality/rejections', { method: 'POST', body: JSON.stringify(d) });
    modal.close();
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Quality control"
        subtitle="Cupping, moisture, defects, samples, certificates, and rejected lots"
        action={<button className="btn-primary" onClick={modal.openModal}>New quality record</button>}
      />
      <div className="mb-4 flex gap-2">
        <button className={tab === 'tests' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('tests')}>Lab tests</button>
        <button className={tab === 'certs' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('certs')}>Certificates</button>
        <button className={tab === 'rejects' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('rejects')}>Rejected batches</button>
      </div>
      {tab === 'tests' ? (
        <Table
          headers={['Sample', 'Lot', 'Moisture', 'Cup score', 'Aroma', 'Grade', 'Defects', 'Result']}
          rows={tests.map((t) => [
            t.sample?.code,
            t.sample?.batch?.lotNumber || '—',
            `${t.moisturePct}%`,
            String(t.cupScore),
            t.aroma || '—',
            t.gradeResult,
            String(t.defectCount),
            <Badge key={t.id} status={t.passed ? 'APPROVED' : 'REJECTED'} />,
          ])}
        />
      ) : null}
      {tab === 'certs' ? (
        <Table
          headers={['Number', 'Issuer', 'Issued', 'Expires', 'Sample']}
          rows={certs.map((c) => [
            c.number,
            c.issuer,
            new Date(c.issuedAt).toLocaleDateString(),
            c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—',
            c.test?.sample?.code,
          ])}
        />
      ) : null}
      {tab === 'rejects' ? (
        <Table
          headers={['Sample', 'Lot', 'Reason', 'Action']}
          rows={rejects.map((r) => [r.test?.sample?.code, r.test?.sample?.batch?.lotNumber || '—', r.reason, r.action])}
        />
      ) : null}
      <Modal title="Quality sample, cupping, certificate, rejection" open={modal.open} onClose={modal.close}>
        <div className="grid gap-8 md:grid-cols-2">
          <form className="space-y-3" onSubmit={addSample}>
            <h3 className="font-semibold">Sample</h3>
            <Field label="Code"><input name="code" className="input" required /></Field>
            <Field label="Lot">
              <select name="batchId" className="input">{lots.map((l) => <option key={l.id} value={l.id}>{l.lotNumber}</option>)}</select>
            </Field>
            <Field label="Notes"><input name="notes" className="input" /></Field>
            <button className="btn-primary w-full">Save sample</button>
          </form>
          <form className="space-y-3" onSubmit={addTest}>
            <h3 className="font-semibold">Cupping / lab test</h3>
            <Field label="Sample">
              <select name="sampleId" className="input">{samples.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}</select>
            </Field>
            <Field label="Moisture %"><input name="moisturePct" type="number" step="0.1" className="input" required /></Field>
            <Field label="Cup score"><input name="cupScore" type="number" step="0.1" className="input" required /></Field>
            <Field label="Aroma"><input name="aroma" className="input" /></Field>
            <Field label="Acidity"><input name="acidity" className="input" /></Field>
            <Field label="Body"><input name="body" className="input" /></Field>
            <Field label="Flavor"><input name="flavor" className="input" /></Field>
            <Field label="Grade result"><input name="gradeResult" className="input" required /></Field>
            <Field label="Defects"><input name="defectCount" type="number" className="input" /></Field>
            <Field label="Passed">
              <select name="passed" className="input">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            <button className="btn-primary w-full">Save test</button>
          </form>
          <form className="space-y-3" onSubmit={addCert}>
            <h3 className="font-semibold">Quality certificate</h3>
            <Field label="Number"><input name="number" className="input" required /></Field>
            <Field label="Test">
              <select name="testId" className="input">{tests.map((t) => <option key={t.id} value={t.id}>{t.sample?.code} · {t.gradeResult}</option>)}</select>
            </Field>
            <Field label="Issuer"><input name="issuer" className="input" required /></Field>
            <Field label="Issued"><input name="issuedAt" type="date" className="input" required /></Field>
            <Field label="Expires"><input name="expiresAt" type="date" className="input" /></Field>
            <button className="btn-primary w-full">Issue certificate</button>
          </form>
          <form className="space-y-3" onSubmit={addReject}>
            <h3 className="font-semibold">Rejected batch</h3>
            <Field label="Test">
              <select name="testId" className="input">{tests.map((t) => <option key={t.id} value={t.id}>{t.sample?.code}</option>)}</select>
            </Field>
            <Field label="Reason"><input name="reason" className="input" required /></Field>
            <Field label="Action"><input name="action" className="input" required /></Field>
            <button className="btn-primary w-full">Record rejection</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
