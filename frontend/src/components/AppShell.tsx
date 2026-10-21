'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Boxes,
  ClipboardCheck,
  FileStack,
  Globe2,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  ShoppingBag,
  Truck,
  Users,
  Warehouse,
  BarChart3,
  Sprout,
} from 'lucide-react';
import { getUser, logout } from '@/lib/api';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/suppliers', label: 'Suppliers & Farmers', icon: Sprout },
  { href: '/purchases', label: 'Purchasing', icon: ShoppingBag },
  { href: '/inventory', label: 'Warehouse', icon: Warehouse },
  { href: '/quality', label: 'Quality Control', icon: ClipboardCheck },
  { href: '/buyers', label: 'International Buyers', icon: Globe2 },
  { href: '/export-orders', label: 'Export Orders', icon: Truck },
  { href: '/documents', label: 'Export Documents', icon: FileStack },
  { href: '/finance', label: 'Finance', icon: Landmark },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      window.location.href = '/login';
      return;
    }
    setUser(u);
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto bg-roast-900 text-cream lg:block">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-500 text-roast-900">
              <Boxes size={22} />
            </div>
            <div>
              <p className="font-display text-lg leading-tight">Temerachi</p>
              <p className="text-xs text-gold-400">Coffee Export Portal</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                  active ? 'bg-white/10 text-gold-400' : 'text-cream/80 hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-roast-950/50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-72 overflow-y-auto bg-roast-900 p-4 text-cream" onClick={(e) => e.stopPropagation()}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream/90 hover:bg-white/10"
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </aside>
        </div>
      ) : null}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-roast-700/10 bg-cream/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button className="btn-ghost lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <p className="text-sm text-roast-600">Ethiopian coffee from origin to export</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold">{user?.fullName}</p>
              <p className="text-xs uppercase tracking-wide text-roast-600">{user?.role}</p>
            </div>
            <button className="btn-ghost" onClick={logout}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
