'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '@/lib/api';
import { Badge, Field, Modal, PageHeader, Table, useModal } from '@/components/ui';

export default function FinancePage() {
  const [summary, setSummary] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const modal = useModal();

  async function load() {
    const [s, t, e, i, a, o] = await Promise.all([
      api('/finance/summary'),
      api<any[]>('/transactions'),
      api<any[]>('/expenses'),
      api<any[]>('/invoices'),
      api<any[]>('/accounts'),
      api<any[]>('/sales-orders'),
    ]);
    setSummary(s);
    setTx(t);
    setExpenses(e);
    setInvoices(i);
    setAccounts(a);
    setOrders(o);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function addExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/expenses', { method: 'POST', body: JSON.stringify({ ...d, amount: Number(d.amount) }) });
    modal.close();
    await load();
  }

  async function addTx(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/transactions', {
      method: 'POST',
      body: JSON.stringify({ ...d, amount: Number(d.amount), fxRate: d.fxRate ? Number(d.fxRate) : undefined }),
    });
    modal.close();
    await load();
  }

  async function addInvoice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api('/invoices', {
      method: 'POST',
      body: JSON.stringify({
        ...d,
        amount: Number(d.amount),
        salesOrderId: d.salesOrderId || undefined,
        dueAt: d.dueAt || undefined,
      }),
    });
    modal.close();
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Financial & accounting"
        subtitle="Purchases, export revenue, expenses, AR/AP, cash, FX, tax, and P&L"
        action={<button className="btn-primary" onClick={modal.openModal}>Record entry</button>}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        {[
          ['Revenue', money(summary?.revenue, 'USD')],
          ['Purchases', money(summary?.purchases, 'mixed')],
          ['Expenses', money(summary?.expenses, 'mixed')],
          ['Profit', money(summary?.profit, 'mixed')],
          ['AR', money(summary?.accountsReceivable, 'USD')],
          ['AP', money(summary?.accountsPayable, 'USD')],
          ['Export tax est.', money(summary?.exportTaxEstimate, 'USD')],
          ['VAT est.', money(summary?.vatEstimate, 'mixed')],
        ].map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-xs uppercase text-roast-600">{l}</p>
            <p className="mt-1 font-display text-xl">{v}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-3 font-display text-xl">Transactions</h2>
      <Table
        headers={['Date', 'Account', 'Type', 'Amount', 'FX', 'Memo']}
        rows={tx.map((t) => [
          new Date(t.occurredAt).toLocaleDateString(),
          t.account?.name,
          t.type,
          money(t.amount, t.currency),
          t.fxRate ? String(t.fxRate) : '—',
          t.memo || t.reference || '—',
        ])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Invoices (AR / AP)</h2>
      <Table
        headers={['Number', 'Kind', 'Amount', 'Due', 'Status']}
        rows={invoices.map((i) => [i.number, i.kind, money(i.amount, i.currency), i.dueAt ? new Date(i.dueAt).toLocaleDateString() : '—', <Badge key={i.id} status={i.status} />])}
      />
      <h2 className="mb-3 mt-8 font-display text-xl">Expenses</h2>
      <Table
        headers={['Date', 'Category', 'Vendor', 'Amount']}
        rows={expenses.map((e) => [new Date(e.occurredAt).toLocaleDateString(), e.category, e.vendor || '—', money(e.amount, e.currency)])}
      />
      <Modal title="Finance entry" open={modal.open} onClose={modal.close}>
        <div className="grid gap-8 md:grid-cols-3">
          <form className="space-y-3" onSubmit={addTx}>
            <h3 className="font-semibold">Ledger transaction</h3>
            <Field label="Account">
              <select name="accountId" className="input">{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select>
            </Field>
            <Field label="Type">
              <select name="type" className="input">
                <option>SALE</option>
                <option>PURCHASE</option>
                <option>PAYMENT</option>
                <option>RECEIPT</option>
                <option>EXPENSE</option>
                <option>FX_GAIN</option>
                <option>FX_LOSS</option>
              </select>
            </Field>
            <Field label="Amount"><input name="amount" type="number" className="input" required /></Field>
            <Field label="Currency"><input name="currency" className="input" defaultValue="USD" /></Field>
            <Field label="FX rate"><input name="fxRate" type="number" step="0.0001" className="input" /></Field>
            <Field label="Date"><input name="occurredAt" type="date" className="input" required /></Field>
            <Field label="Memo"><input name="memo" className="input" /></Field>
            <button className="btn-primary w-full">Post</button>
          </form>
          <form className="space-y-3" onSubmit={addExpense}>
            <h3 className="font-semibold">Expense</h3>
            <Field label="Category"><input name="category" className="input" required /></Field>
            <Field label="Vendor"><input name="vendor" className="input" /></Field>
            <Field label="Amount"><input name="amount" type="number" className="input" required /></Field>
            <Field label="Currency"><input name="currency" className="input" defaultValue="ETB" /></Field>
            <Field label="Date"><input name="occurredAt" type="date" className="input" required /></Field>
            <button className="btn-primary w-full">Save expense</button>
          </form>
          <form className="space-y-3" onSubmit={addInvoice}>
            <h3 className="font-semibold">Invoice</h3>
            <Field label="Number"><input name="number" className="input" required /></Field>
            <Field label="Kind">
              <select name="kind" className="input">
                <option>SALES</option>
                <option>PURCHASE</option>
              </select>
            </Field>
            <Field label="Sales order">
              <select name="salesOrderId" className="input">
                <option value="">None</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.number}</option>)}
              </select>
            </Field>
            <Field label="Amount"><input name="amount" type="number" className="input" required /></Field>
            <Field label="Currency"><input name="currency" className="input" defaultValue="USD" /></Field>
            <Field label="Issued"><input name="issuedAt" type="date" className="input" required /></Field>
            <Field label="Due"><input name="dueAt" type="date" className="input" /></Field>
            <button className="btn-primary w-full">Save invoice</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
