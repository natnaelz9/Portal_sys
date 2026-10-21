'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '@/lib/api';
import { Badge, Field, Modal, PageHeader, Table, useModal } from '@/components/ui';

export default function EmployeesPage() {
  const [tab, setTab] = useState<'staff' | 'attendance' | 'leave' | 'work' | 'payroll'>('staff');
  const [employees, setEmployees] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [evals, setEvals] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const modal = useModal();

  async function load() {
    const [e, d, l, a, lv, sh, asg, ev, pay] = await Promise.all([
      api<any[]>('/employees'),
      api<any[]>('/departments'),
      api<any[]>('/activity-logs'),
      api<any[]>('/attendance'),
      api<any[]>('/leaves'),
      api<any[]>('/shifts'),
      api<any[]>('/assignments'),
      api<any[]>('/evaluations'),
      api<any[]>('/payroll'),
    ]);
    setEmployees(e);
    setDepts(d);
    setLogs(l);
    setAttendance(a);
    setLeaves(lv);
    setShifts(sh);
    setAssignments(asg);
    setEvals(ev);
    setPayroll(pay);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function post(path: string, body: unknown) {
    await api(path, { method: 'POST', body: JSON.stringify(body) });
    modal.close();
    await load();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/employees', { ...d, salary: Number(d.salary) });
  }

  return (
    <div>
      <PageHeader
        title="Employee management"
        subtitle="Staff, departments, attendance, leave, shifts, assignments, payroll, and activity logs"
        action={<button className="btn-primary" onClick={modal.openModal}>Add HR record</button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(['staff', 'attendance', 'leave', 'work', 'payroll'] as const).map((t) => (
          <button key={t} className={tab === t ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'staff' ? (
        <>
          <Table
            headers={['No', 'Name', 'Position', 'Department', 'Email', 'Salary']}
            rows={employees.map((e) => [
              e.employeeNo,
              e.fullName,
              e.position,
              e.department?.name,
              e.email,
              money(e.salary, 'ETB'),
            ])}
          />
          <h2 className="mb-3 mt-8 font-display text-xl">User activity</h2>
          <Table
            headers={['When', 'User', 'Action', 'Entity']}
            rows={logs.map((l) => [
              new Date(l.createdAt).toLocaleString(),
              l.user?.fullName,
              l.action,
              `${l.entity} ${l.entityId || ''}`,
            ])}
          />
        </>
      ) : null}
      {tab === 'attendance' ? (
        <Table
          headers={['Date', 'Employee', 'Status', 'Check in']}
          rows={attendance.map((a) => [
            new Date(a.date).toLocaleDateString(),
            a.employee?.fullName,
            <Badge key={a.id} status={a.status} />,
            a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—',
          ])}
        />
      ) : null}
      {tab === 'leave' ? (
        <Table
          headers={['Employee', 'Type', 'From', 'To', 'Status', '']}
          rows={leaves.map((l) => [
            l.employee?.fullName,
            l.type,
            new Date(l.startDate).toLocaleDateString(),
            new Date(l.endDate).toLocaleDateString(),
            <Badge key={l.id} status={l.status} />,
            l.status === 'PENDING' ? (
              <button
                className="text-leaf"
                onClick={async () => {
                  await api(`/leaves/${l.id}/approve`, { method: 'POST' });
                  await load();
                }}
              >
                Approve
              </button>
            ) : '—',
          ])}
        />
      ) : null}
      {tab === 'work' ? (
        <>
          <h2 className="mb-3 font-display text-xl">Shifts</h2>
          <Table
            headers={['Date', 'Employee', 'Time', 'Location']}
            rows={shifts.map((s) => [new Date(s.date).toLocaleDateString(), s.employee?.fullName, `${s.startTime}–${s.endTime}`, s.location || '—'])}
          />
          <h2 className="mb-3 mt-8 font-display text-xl">Assignments</h2>
          <Table
            headers={['Employee', 'Title', 'Due', 'Status']}
            rows={assignments.map((a) => [a.employee?.fullName, a.title, a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—', a.status])}
          />
          <h2 className="mb-3 mt-8 font-display text-xl">Performance</h2>
          <Table
            headers={['Employee', 'Period', 'Score', 'Comments']}
            rows={evals.map((e) => [e.employee?.fullName, e.period, String(e.score), e.comments || '—'])}
          />
        </>
      ) : null}
      {tab === 'payroll' ? (
        <Table
          headers={['No', 'Name', 'Department', 'Gross', 'Tax 15%', 'Net']}
          rows={payroll.map((p) => [p.employeeNo, p.fullName, p.department, money(p.gross, 'ETB'), money(p.tax, 'ETB'), money(p.net, 'ETB')])}
        />
      ) : null}
      <Modal title="HR records" open={modal.open} onClose={modal.close}>
        <div className="grid gap-8 md:grid-cols-2">
          <form className="grid gap-3" onSubmit={onSubmit}>
            <h3 className="font-semibold">Employee</h3>
            <Field label="Employee no"><input name="employeeNo" className="input" required /></Field>
            <Field label="Full name"><input name="fullName" className="input" required /></Field>
            <Field label="Email"><input name="email" className="input" required /></Field>
            <Field label="Phone"><input name="phone" className="input" /></Field>
            <Field label="Position"><input name="position" className="input" required /></Field>
            <Field label="Salary"><input name="salary" type="number" className="input" required /></Field>
            <Field label="Hire date"><input name="hireDate" type="date" className="input" required /></Field>
            <Field label="Department">
              <select name="departmentId" className="input">{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            </Field>
            <button className="btn-primary">Save employee</button>
          </form>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget).entries());
              post('/attendance', d);
            }}
          >
            <h3 className="font-semibold">Attendance</h3>
            <Field label="Employee">
              <select name="employeeId" className="input">{employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}</select>
            </Field>
            <Field label="Date"><input name="date" type="date" className="input" required /></Field>
            <Field label="Status">
              <select name="status" className="input">
                <option>PRESENT</option>
                <option>ABSENT</option>
                <option>LEAVE</option>
              </select>
            </Field>
            <button className="btn-primary w-full">Save attendance</button>
          </form>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget).entries());
              post('/leaves', d);
            }}
          >
            <h3 className="font-semibold">Leave</h3>
            <Field label="Employee">
              <select name="employeeId" className="input">{employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}</select>
            </Field>
            <Field label="Type"><input name="type" className="input" required /></Field>
            <Field label="Start"><input name="startDate" type="date" className="input" required /></Field>
            <Field label="End"><input name="endDate" type="date" className="input" required /></Field>
            <Field label="Reason"><input name="reason" className="input" /></Field>
            <button className="btn-primary w-full">Request leave</button>
          </form>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget).entries());
              post('/shifts', d);
            }}
          >
            <h3 className="font-semibold">Shift</h3>
            <Field label="Employee">
              <select name="employeeId" className="input">{employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}</select>
            </Field>
            <Field label="Date"><input name="date" type="date" className="input" required /></Field>
            <Field label="Start"><input name="startTime" className="input" defaultValue="08:00" /></Field>
            <Field label="End"><input name="endTime" className="input" defaultValue="17:00" /></Field>
            <Field label="Location"><input name="location" className="input" /></Field>
            <button className="btn-primary w-full">Save shift</button>
          </form>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget).entries());
              post('/assignments', { ...d, dueDate: d.dueDate || undefined });
            }}
          >
            <h3 className="font-semibold">Assignment</h3>
            <Field label="Employee">
              <select name="employeeId" className="input">{employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}</select>
            </Field>
            <Field label="Title"><input name="title" className="input" required /></Field>
            <Field label="Details"><input name="details" className="input" /></Field>
            <Field label="Due"><input name="dueDate" type="date" className="input" /></Field>
            <button className="btn-primary w-full">Save assignment</button>
          </form>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const d = Object.fromEntries(new FormData(e.currentTarget).entries());
              post('/evaluations', { ...d, score: Number(d.score) });
            }}
          >
            <h3 className="font-semibold">Performance evaluation</h3>
            <Field label="Employee">
              <select name="employeeId" className="input">{employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}</select>
            </Field>
            <Field label="Period"><input name="period" className="input" required /></Field>
            <Field label="Score"><input name="score" type="number" step="0.1" className="input" required /></Field>
            <Field label="Comments"><input name="comments" className="input" /></Field>
            <button className="btn-primary w-full">Save evaluation</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
