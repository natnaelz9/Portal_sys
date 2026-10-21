'use client';

import { ReactNode, useState } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-roast-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-roast-600">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    APPROVED: 'bg-emerald-100 text-emerald-800',
    CONFIRMED: 'bg-emerald-100 text-emerald-800',
    AVAILABLE: 'bg-emerald-100 text-emerald-800',
    PRESENT: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800',
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-sky-100 text-sky-800',
    PLANNED: 'bg-sky-100 text-sky-800',
    PARTIAL: 'bg-indigo-100 text-indigo-800',
    REJECTED: 'bg-rose-100 text-rose-800',
    DAMAGED: 'bg-rose-100 text-rose-800',
    OPEN: 'bg-amber-100 text-amber-800',
    ATTACHED: 'bg-leaf/15 text-leaf',
  };
  return <span className={`badge ${tone[status] || 'bg-cream text-roast-700'}`}>{status}</span>;
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-roast-950/50 p-4">
        <div className="card max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button className="text-roast-600" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-cream/80 text-xs uppercase tracking-wide text-roast-600">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-roast-600" colSpan={headers.length}>
                No records yet
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-t border-roast-700/10">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function useModal() {
  const [open, setOpen] = useState(false);
  return { open, openModal: () => setOpen(true), close: () => setOpen(false) };
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
