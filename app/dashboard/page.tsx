'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, IndianRupee, LayoutDashboard, LogOut, Receipt, Settings, Users, Scissors, Menu, X, UserRound, TrendingUp, TrendingDown, CalendarDays, Clock3, AlertTriangle, UserCheck, UserX, Target, Sparkles, RefreshCw } from 'lucide-react';
import { supabase, supabasePublic } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

type Tx = {
  id: string;
  customer_name: string | null;
  amount_paid: number;
  payment_mode: string;
  served_at: string;
  customer_id: string;
  staff_id: string;
  service_id: string;
  customers: { name: string } | null;
  profiles: { name: string } | null;
  services: { name: string } | null;
};
type Outlet = { id: string; name: string; city: string };
type RangeKey = '7d' | '30d' | '90d' | 'year';

type CustomerInsight = {
  id: string;
  name: string;
  visits: number;
  spend: number;
  avgBill: number;
  lastVisit: string;
  daysSince: number;
  avgGap: number | null;
  status: 'High value' | 'Regular' | 'Needs attention' | 'New';
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState('');
  const [tx, setTx] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>('30d');

  async function load(id?: string, silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { router.replace('/signin'); return; }

    const { data: p, error: pe } = await supabasePublic.rpc('get_my_profile');
    const profile = Array.isArray(p) ? p[0] : p;
    if (pe || !profile) {
      setError(pe?.message || 'Owner dashboard could not be loaded.');
      setLoading(false); setRefreshing(false); return;
    }
    if (profile.role === 'staff') { router.replace('/staff'); return; }
    setUser(profile);

    const { data: o, error: oe } = await supabase.rpc('owner_list_outlets');
    if (oe) { setError(oe.message); setLoading(false); setRefreshing(false); return; }
    const activeOutlets = (o || []).filter((x: any) => x.active) as Outlet[];
    setOutlets(activeOutlets);
    const chosen = id || profile.outlet_id || activeOutlets[0]?.id;
    setOutletId(chosen || '');

    if (chosen) {
      const rows: Tx[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error: te } = await supabase
          .from('transactions')
          .select('id,customer_id,staff_id,service_id,customer_name,amount_paid,payment_mode,served_at,customers(name),profiles(name),services(name)')
          .eq('outlet_id', chosen)
          .order('served_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (te) { setError(te.message); break; }
        rows.push(...((data || []) as any));
        if (!data || data.length < pageSize) break;
      }
      setTx(rows);
    } else setTx([]);
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('hair_salon_outlet') : null;
    load(saved || undefined);
  }, []);

  const now = new Date();
  const rangeStart = useMemo(() => {
    const d = new Date();
    if (range === '7d') d.setDate(d.getDate() - 6);
    if (range === '30d') d.setDate(d.getDate() - 29);
    if (range === '90d') d.setDate(d.getDate() - 89);
    if (range === 'year') d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [range]);

  const inRange = useMemo(() => tx.filter(t => new Date(t.served_at) >= rangeStart), [tx, rangeStart]);
  const today = useMemo(() => tx.filter(t => sameDay(new Date(t.served_at), now)), [tx]);
  const month = useMemo(() => tx.filter(t => { const d = new Date(t.served_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }), [tx]);
  const previousMonth = useMemo(() => tx.filter(t => { const d = new Date(t.served_at); const p = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === p.getMonth() && d.getFullYear() === p.getFullYear(); }), [tx]);
  const sum = (items: Tx[]) => items.reduce((n, t) => n + Number(t.amount_paid || 0), 0);
  const revenue = sum(inRange);
  const previousPeriodRevenue = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const end = new Date(rangeStart); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
    const start = new Date(end); start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0, 0);
    return sum(tx.filter(t => { const d = new Date(t.served_at); return d >= start && d <= end; }));
  }, [tx, range, rangeStart]);
  const revenueChange = previousPeriodRevenue ? ((revenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : null;
  const averageBill = inRange.length ? revenue / inRange.length : 0;
  const uniqueCustomers = useMemo(() => new Set(inRange.map(t => t.customer_id).filter(Boolean)).size, [inRange]);
  const repeatCustomers = useMemo(() => {
    const counts = countBy(inRange, t => t.customer_id);
    return Object.values(counts).filter(n => n > 1).length;
  }, [inRange]);
  const repeatRate = uniqueCustomers ? (repeatCustomers / uniqueCustomers) * 100 : 0;
  const cash = sum(inRange.filter(t => t.payment_mode?.toLowerCase() === 'cash'));
  const upi = sum(inRange.filter(t => t.payment_mode?.toLowerCase() === 'upi'));

  const dailySales = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 30 : 12;
    const step = range === '90d' ? 3 : range === 'year' ? 30 : 1;
    const out: { label: string; value: number }[] = [];
    const start = new Date(rangeStart);
    for (let i = 0; i < days; i += step) {
      const a = new Date(start); a.setDate(a.getDate() + i); a.setHours(0, 0, 0, 0);
      const b = new Date(a); b.setDate(b.getDate() + step); b.setMilliseconds(-1);
      const value = tx.filter(t => { const d = new Date(t.served_at); return d >= a && d <= b; }).reduce((n, t) => n + Number(t.amount_paid), 0);
      out.push({ label: range === 'year' ? a.toLocaleDateString('en-IN', { month: 'short' }) : a.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value });
    }
    return out;
  }, [tx, range, rangeStart]);

  const serviceStats = useMemo(() => topStats(inRange, t => t.services?.name || 'Unknown service'), [inRange]);
  const staffStats = useMemo(() => topStats(inRange, t => t.profiles?.name || 'Unknown staff'), [inRange]);
  const peakHours = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0, revenue: 0 }));
    inRange.forEach(t => { const h = new Date(t.served_at).getHours(); buckets[h].count++; buckets[h].revenue += Number(t.amount_paid); });
    return buckets.filter(x => x.count).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [inRange]);

  const customerInsights = useMemo<CustomerInsight[]>(() => {
    const map: Record<string, { id: string; name: string; dates: number[]; spend: number }> = {};
    tx.forEach(t => {
      const id = t.customer_id || t.customers?.name || t.customer_name || 'unknown';
      const name = t.customer_name || t.customers?.name || 'Unknown customer';
      map[id] ??= { id, name, dates: [], spend: 0 };
      map[id].dates.push(new Date(t.served_at).getTime());
      map[id].spend += Number(t.amount_paid || 0);
    });
    return Object.values(map).map(c => {
      c.dates.sort((a, b) => a - b);
      const last = c.dates[c.dates.length - 1];
      const gaps: number[] = [];
      for (let i = 1; i < c.dates.length; i++) gaps.push((c.dates[i] - c.dates[i - 1]) / 86400000);
      const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
      const daysSince = Math.max(0, Math.floor((Date.now() - last) / 86400000));
      const visits = c.dates.length;
      let status: CustomerInsight['status'] = 'Regular';
      if (visits === 1) status = 'New';
      else if (c.spend >= percentile(Object.values(map).map(x => x.spend), 0.8)) status = 'High value';
      else if (avgGap && daysSince > Math.max(avgGap * 1.6, 35)) status = 'Needs attention';
      return { id: c.id, name: c.name, visits, spend: c.spend, avgBill: c.spend / visits, lastVisit: new Date(last).toISOString(), daysSince, avgGap, status };
    }).sort((a, b) => b.spend - a.spend);
  }, [tx]);

  const attentionCustomers = customerInsights.filter(c => c.status === 'Needs attention').sort((a, b) => b.daysSince - a.daysSince).slice(0, 8);
  const highValueCustomers = customerInsights.filter(c => c.status === 'High value').slice(0, 6);
  const newCustomers = customerInsights.filter(c => c.status === 'New').slice(0, 6);
  const activeCustomers = customerInsights.filter(c => c.status === 'Regular');
  const cancellations = 0; // Current schema records completed transactions; cancelled/no-show appointments are not stored yet.

  const monthlyTarget = useMemo(() => {
    const monthsWithData = new Set(tx.map(t => { const d = new Date(t.served_at); return `${d.getFullYear()}-${d.getMonth()}`; }));
    if (!monthsWithData.size) return 0;
    const historical = tx.filter(t => new Date(t.served_at) < new Date(now.getFullYear(), now.getMonth(), 1));
    const monthKeys = new Set(historical.map(t => { const d = new Date(t.served_at); return `${d.getFullYear()}-${d.getMonth()}`; }));
    return monthKeys.size ? Math.round(sum(historical) / monthKeys.size) : Math.round(sum(month));
  }, [tx, month]);
  const monthProgress = monthlyTarget ? Math.min(100, (sum(month) / monthlyTarget) * 100) : 0;

  const nav = [['Overview', LayoutDashboard, '/dashboard'], ['Transactions', Receipt, '/dashboard/transactions'], ['Staff & Managers', Users, '/dashboard/management'], ['Outlets', Building2, '/dashboard/management'], ['Customers', UserRound, '/dashboard/customers'], ['Settings', Settings, '/dashboard/settings'], ['Services', Scissors, '/dashboard/services']];

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#F7F4EF]">Loading salon analytics…</div>;
  if (error) return <div className="grid min-h-screen place-items-center bg-[#F7F4EF]"><div className="rounded-md bg-white p-8 text-center"><h1 className="text-xl font-bold">Owner dashboard</h1><p className="mt-2 text-sm text-red-600">{error}</p><button onClick={() => load(outletId)} className="mt-5 rounded-sm bg-[#F7F4EF] px-4 py-2 text-sm text-white">Try again</button></div></div>;
  const outlet = outlets.find(o => o.id === outletId);

  return <div className="min-h-screen bg-[#F7F4EF] text-[#17130F]">
    <aside className="fixed inset-y-0 left-0 hidden w-72 bg-[#17130F] p-5 text-white lg:block"><div className="mb-6 border-b border-white/10 pb-5"><img src="/yash-hair-salon-logo.svg" alt="Yash Hair Salon & Academy" className="h-14 w-48 object-contain object-left" /></div><nav className="mt-16 space-y-1">{nav.map(([x, I, path]: any) => <button key={x} onClick={() => router.push(path)} className="flex w-full items-center gap-3 rounded-sm px-4 py-3 text-sm text-[#4A443E] hover:bg-[#EDE7DF]"><I size={18} />{x}</button>)}</nav><button onClick={async () => { await supabase.auth.signOut(); router.replace('/signin'); }} className="absolute bottom-6 left-5 flex items-center gap-3 px-4 py-3 text-sm text-[#6B625A]"><LogOut size={18} />Sign out</button></aside>
    <div className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}><div onClick={() => setMobileOpen(false)} className={`absolute inset-0 bg-black/40 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`} /><aside className={`absolute inset-y-0 left-0 w-72 bg-[#F7F4EF] p-5 text-white shadow-2xl transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex justify-end"><button onClick={() => setMobileOpen(false)}><X /></button></div><nav className="mt-5 space-y-1">{nav.map(([x, I, path]: any) => <button key={x} onClick={() => { setMobileOpen(false); router.push(path); }} className="flex w-full items-center gap-3 rounded-sm px-4 py-3 text-sm text-[#4A443E] hover:bg-[#EDE7DF]"><I size={18} />{x}</button>)}</nav></aside></div>

    <main className="lg:pl-72"><header className="flex items-center justify-between border-b border-[#DED6CC] bg-white px-5 py-4"><button onClick={() => setMobileOpen(true)} className="rounded-sm border border-[#DED6CC] p-2 lg:hidden"><Menu size={20} /></button><div className="ml-auto flex items-center gap-3"><button title="Refresh analytics" onClick={() => load(outletId, true)} className="rounded-sm border border-[#DED6CC] bg-white p-2"><RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} /></button><div className="rounded-md border border-[#DED6CC] bg-white px-4 py-2 text-right"><b className="text-xs">{user?.name || 'Owner'}</b><div className="text-[10px] text-[#756B62] capitalize">{user?.role || 'owner'}</div></div></div></header>

      <section className="mx-auto max-w-[1550px] p-5 md:p-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-[#8B6B4A]">Business overview</p><h1 className="mt-2 text-4xl font-bold">Welcome, {user?.name || 'Owner'}.</h1><p className="mt-2 text-sm text-[#756B62]">Current business records • {outlet?.name || 'Outlet'} • {tx.length.toLocaleString('en-IN')} transactions loaded</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-md border border-[#DED6CC] bg-white p-1">{(['7d', '30d', '90d', 'year'] as RangeKey[]).map(r => <button key={r} onClick={() => setRange(r)} className={`rounded-sm px-3 py-2 text-xs font-bold ${range === r ? 'bg-[#F7F4EF] text-white' : 'text-[#756B62]'}`}>{r === 'year' ? 'This year' : r.replace('d', ' days')}</button>)}</div><select value={outletId} onChange={e => { localStorage.setItem('hair_salon_outlet', e.target.value); load(e.target.value); }} className="rounded-md border-2 border-[#8B6B4A] bg-white px-4 py-3 text-sm font-semibold shadow-sm">{outlets.map(o => <option key={o.id} value={o.id}>{o.name} — {o.city}</option>)}</select></div></div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Revenue" value={money(revenue)} sub={revenueChange === null ? 'No previous period data' : `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% vs previous period`} icon={<IndianRupee />} trend={revenueChange} /><Metric title="Appointments served" value={inRange.length.toLocaleString('en-IN')} sub={`${uniqueCustomers} unique customers`} icon={<CalendarDays />} /><Metric title="Average bill" value={money(averageBill)} sub="Revenue ÷ completed services" icon={<Receipt />} /><Metric title="Repeat rate" value={`${repeatRate.toFixed(1)}%`} sub={`${repeatCustomers} repeat customers in range`} icon={<UserCheck />} /></div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.55fr]"><section className="rounded-md border border-[#DED6CC] bg-white p-6"><div className="flex items-start justify-between"><div><h2 className="font-bold">Revenue trend</h2><p className="mt-1 text-xs text-[#756B62]">Actual completed transactions for the selected period</p></div><div className="text-right"><div className="text-xs text-[#756B62]">Cash + UPI</div><b>{money(cash + upi)}</b></div></div><LineChart data={dailySales} /></section><div className="space-y-6"><section className="rounded-md bg-[#F7F4EF] p-6 text-white"><p className="text-xs uppercase tracking-[.2em] text-[#756B62]">This month</p><div className="mt-2 text-4xl font-bold">{money(sum(month))}</div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EDE7DF]"><div className="h-full rounded-full bg-white" style={{ width: `${monthProgress}%` }} /></div><div className="mt-2 flex justify-between text-xs text-[#756B62]"><span>{monthlyTarget ? `${monthProgress.toFixed(0)}% of historical monthly average` : 'Building baseline'}</span><span>{money(monthlyTarget)}</span></div></section><section className="rounded-md border border-[#DED6CC] bg-white p-6"><h2 className="font-bold">Payment mix</h2><div className="mt-5 flex items-center gap-5"><Donut cash={cash} upi={upi} total={revenue} /><div className="space-y-3 text-sm"><div><span className="inline-block h-2 w-2 rounded-full bg-[#F7F4EF] mr-2" />Cash <b>{money(cash)}</b></div><div><span className="inline-block h-2 w-2 rounded-full bg-[#8B6B4A] mr-2" />UPI <b>{money(upi)}</b></div></div></div></section></div></div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2"><BarPanel title="Service revenue" subtitle="Which services generated the most revenue" data={serviceStats.slice(0, 8)} money /><BarPanel title="Staff performance" subtitle="Completed services and revenue by staff" data={staffStats.slice(0, 8)} money /></div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr_.75fr]"><section className="rounded-md border border-[#DED6CC] bg-white p-6"><div className="flex items-center gap-2"><AlertTriangle size={18} /><h2 className="font-bold">Customer activity</h2></div><p className="mt-1 text-xs text-[#756B62]">Customers requiring follow-up</p><div className="mt-5 space-y-3">{attentionCustomers.length ? attentionCustomers.map(c => <CustomerRow key={c.id} c={c} tone="attention" />) : <Empty text="No customers currently flagged by the activity rules." />}</div></section><section className="rounded-md border border-[#DED6CC] bg-white p-6"><div className="flex items-center gap-2"><Target size={18} /><h2 className="font-bold">Customer spending summary</h2></div><p className="mt-1 text-xs text-[#756B62]">Customers with the highest recorded spend</p><div className="mt-5 space-y-3">{highValueCustomers.length ? highValueCustomers.map(c => <CustomerRow key={c.id} c={c} tone="value" />) : <Empty text="Not enough customer history yet." />}</div></section><section className="rounded-md bg-[#F3ECE2] p-6"><div className="flex items-center gap-2"><Sparkles size={18} /><h2 className="font-bold">Daily summary</h2></div><div className="mt-5 space-y-4 text-sm"><Brief icon={<IndianRupee size={15} />} text={`${money(sum(today))} sales from ${today.length} completed services today.`} /><Brief icon={<Users size={15} />} text={`${uniqueCustomers} unique customers are in the selected period.`} /><Brief icon={<Clock3 size={15} />} text={peakHours.length ? `Busiest recorded hour: ${formatHour(peakHours[0].hour)} (${peakHours[0].count} services).` : 'No peak-hour data yet.'} /><Brief icon={<AlertTriangle size={15} />} text={`${attentionCustomers.length} customers currently need attention based on their own visit history.`} /></div></section></div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><section className="rounded-md border border-[#DED6CC] bg-white p-6"><div className="flex items-start justify-between"><div><h2 className="font-bold">Customer activity</h2><p className="mt-1 text-xs text-[#756B62]">Activity calculated from recorded transactions</p></div><button onClick={() => router.push('/dashboard/customers')} className="text-xs font-bold text-[#8B6B4A]">Open customers →</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr>{['Customer', 'Visits', 'Lifetime spend', 'Avg bill', 'Last visit', 'Signal'].map(h => <th key={h} className="pb-3 text-xs text-[#756B62]">{h}</th>)}</tr></thead><tbody>{customerInsights.slice(0, 12).map(c => <tr key={c.id} className="border-t border-[#DED6CC]"><td className="py-4 font-semibold">{c.name}</td><td>{c.visits}</td><td className="font-semibold">{money(c.spend)}</td><td>{money(c.avgBill)}</td><td>{formatRelative(c.daysSince)}</td><td><Badge status={c.status} /></td></tr>)}</tbody></table>{!customerInsights.length && <Empty text="Customer analytics will appear after transactions are recorded." />}</div></section><section className="rounded-md border border-[#DED6CC] bg-white p-6"><h2 className="font-bold">Service activity by hour</h2><p className="mt-1 text-xs text-[#756B62]">Highest recorded service volume in the selected period</p><div className="mt-5 space-y-4">{peakHours.length ? peakHours.map(h => <div key={h.hour}><div className="mb-1 flex justify-between text-xs"><b>{formatHour(h.hour)}</b><span>{h.count} services • {money(h.revenue)}</span></div><div className="h-2 rounded-full bg-[#EDE7DF]"><div className="h-full rounded-full bg-[#F7F4EF]" style={{ width: `${Math.max(8, (h.count / peakHours[0].count) * 100)}%` }} /></div></div>) : <Empty text="No appointment data for this period." />}</div><div className="mt-7 border-t border-[#DED6CC] pt-5"><h3 className="text-sm font-bold">Customer segments</h3><div className="mt-4 grid grid-cols-2 gap-3"><Mini title="High value" value={highValueCustomers.length} /><Mini title="Needs attention" value={attentionCustomers.length} /><Mini title="New" value={newCustomers.length} /><Mini title="Regular" value={activeCustomers.length} /></div></div></section></div>

        <div className="mt-6 rounded-md border border-dashed border-[#6F5742] bg-white/50 p-4 text-xs text-[#756B62]"><b>Data note:</b> this dashboard uses the salon's recorded transactions. Cancellation/no-show analytics will become available once the database stores appointment statuses; the current schema only records completed services/payments, so the dashboard does not invent those numbers.</div>
      </section>
    </main>
  </div>;
}

function Metric({ title, value, sub, icon, trend }: { title: string; value: string; sub: string; icon: React.ReactNode; trend?: number | null }) { return <div className="rounded-md border border-[#DED6CC] bg-white p-5 shadow-sm"><div className="flex justify-between text-sm text-[#756B62]">{title}<span>{icon}</span></div><div className="mt-6 text-3xl font-bold">{value}</div><div className={`mt-2 flex items-center gap-1 text-xs ${trend !== undefined && trend !== null ? (trend >= 0 ? 'text-[#6A735D]' : 'text-[#9A5D50]') : 'text-[#8B6B4A]'}`}>{trend !== undefined && trend !== null && (trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />)}{sub}</div></div>; }

function LineChart({ data }: { data: { label: string; value: number }[] }) { const max = Math.max(...data.map(x => x.value), 1); const w = 760, h = 240, pad = 28; const points = data.map((d, i) => `${pad + (i * (w - pad * 2)) / Math.max(data.length - 1, 1)},${h - pad - (d.value / max) * (h - pad * 2)}`).join(' '); return <div className="mt-5 overflow-hidden"><svg viewBox={`0 0 ${w} ${h}`} className="h-[260px] w-full" preserveAspectRatio="none"><line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="#B8AFA5" /><polyline fill="none" stroke="#8B6B4A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />{data.map((d, i) => { const x = pad + (i * (w - pad * 2)) / Math.max(data.length - 1, 1); const y = h - pad - (d.value / max) * (h - pad * 2); return <circle key={i} cx={x} cy={y} r="4" fill="#8B6B4A" />; })}</svg><div className="flex justify-between gap-2 text-[10px] text-[#756B62]">{data.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)).map((d, i) => <span key={i}>{d.label}</span>)}</div></div>; }

function BarPanel({ title, subtitle, data, money: moneyMode }: { title: string; subtitle: string; data: { name: string; value: number; count: number }[]; money?: boolean }) { const max = Math.max(...data.map(x => x.value), 1); return <section className="rounded-md border border-[#DED6CC] bg-white p-6"><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs text-[#756B62]">{subtitle}</p><div className="mt-6 space-y-4">{data.length ? data.map((x, i) => <div key={x.name}><div className="mb-1 flex justify-between gap-3 text-xs"><b className="truncate">{i + 1}. {x.name}</b><span>{moneyMode ? money(x.value) : x.value.toLocaleString('en-IN')} • {x.count} visits</span></div><div className="h-3 rounded-full bg-[#EDE7DF]"><div className="h-full rounded-full bg-[#F7F4EF]" style={{ width: `${Math.max(3, x.value / max * 100)}%` }} /></div></div>) : <Empty text="No data in this period." />}</div></section>; }

function CustomerRow({ c, tone }: { c: CustomerInsight; tone: 'attention' | 'value' }) { return <div className="flex items-center gap-3 rounded-md border border-[#DED6CC] p-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EDE7DF] text-xs font-bold">{c.name[0]?.toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><b className="truncate text-sm">{c.name}</b><span className="text-xs font-bold">{money(c.spend)}</span></div><div className="mt-1 text-[11px] text-[#756B62]">{c.visits} visits • avg {money(c.avgBill)} • {tone === 'attention' ? `${c.daysSince} days since visit` : 'lifetime recorded spend'}</div></div></div>; }
function Badge({ status }: { status: CustomerInsight['status'] }) { const cls = status === 'Needs attention' ? 'bg-[#F0E2DA] text-[#8A4D43]' : status === 'High value' ? 'bg-[#EDE7DF] text-[#7B6047]' : status === 'New' ? 'bg-[#E5E9E0] text-[#6A735D]' : 'bg-[#EDE7DF] text-[#665F57]'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>{status}</span>; }
function Brief({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex gap-3"><span className="mt-0.5">{icon}</span><span>{text}</span></div>; }
function Mini({ title, value }: { title: string; value: number }) { return <div className="rounded-md bg-white p-3"><div className="text-xl font-bold">{value}</div><div className="mt-1 text-[10px] text-[#756B62]">{title}</div></div>; }
function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-xs text-[#756B62]">{text}</p>; }
function Donut({ cash, upi, total }: { cash: number; upi: number; total: number }) { const cashPct = total ? cash / total * 100 : 50; return <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#17130F 0 ${cashPct}%, #8B6B4A ${cashPct}% 100%)` }}><div className="grid h-14 w-14 place-items-center rounded-full bg-white text-center"><b className="text-xs">{total ? '100%' : '—'}</b><span className="text-[8px] text-[#756B62]">mix</span></div></div>; }
function topStats(items: Tx[], key: (t: Tx) => string) { const m: Record<string, { name: string; value: number; count: number }> = {}; items.forEach(t => { const name = key(t); m[name] ??= { name, value: 0, count: 0 }; m[name].value += Number(t.amount_paid || 0); m[name].count++; }); return Object.values(m).sort((a, b) => b.value - a.value); }
function countBy<T>(items: T[], key: (x: T) => string) { const m: Record<string, number> = {}; items.forEach(x => { const k = key(x); if (!k) return; m[k] = (m[k] || 0) + 1; }); return m; }
function percentile(values: number[], p: number) { if (!values.length) return 0; const a = [...values].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))]; }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function formatHour(h: number) { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); }
function formatRelative(days: number) { if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'; return `${days} days ago`; }
function money(n: number) { return '₹' + Math.round(n || 0).toLocaleString('en-IN'); }
