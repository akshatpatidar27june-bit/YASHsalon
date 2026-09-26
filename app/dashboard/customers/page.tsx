'use client';
import {useEffect,useMemo,useState} from 'react';
import {Building2,Download,Edit3,LayoutDashboard,Menu,Plus,Receipt,Scissors,Search,Settings,Trash2,UserRound,Users,X} from 'lucide-react';
import * as XLSX from 'xlsx';
import {supabase,supabasePublic} from '../../../lib/supabase';
import {useRouter} from 'next/navigation';

type Customer={customer_id:string;customer_name:string;customer_phone:string;customer_address:string;created_at:string};
type Outlet={id:string;name:string;city:string};

export default function Customers(){
 const router=useRouter();
 const [user,setUser]=useState<any>(null),[outlets,setOutlets]=useState<Outlet[]>([]),[outletId,setOutletId]=useState(''),[customers,setCustomers]=useState<Customer[]>([]),[name,setName]=useState(''),[phone,setPhone]=useState(''),[address,setAddress]=useState(''),[search,setSearch]=useState(''),[menuOpen,setMenuOpen]=useState(false),[formOpen,setFormOpen]=useState(false),[editing,setEditing]=useState<Customer|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[deleting,setDeleting]=useState(''),[error,setError]=useState('');
 async function load(id?:string){
  setError('');
  const {data:{user:u}}=await supabase.auth.getUser();
  if(!u){router.replace('/signin');return;}
  const {data:p,error:pe}=await supabasePublic.rpc('get_my_profile');
  const profile=Array.isArray(p)?p[0]:p;
  if(pe||!profile){setError(pe?.message||'Profile could not be loaded.');setLoading(false);return;}
  if(!['owner','manager'].includes(profile.role)){router.replace(profile.role==='staff'?'/staff':'/dashboard');return;}
  setUser(profile);
  const {data:o,error:oe}=await supabase.rpc('owner_list_outlets');
  if(oe){setError(oe.message);setLoading(false);return;}
  const active=(o||[]).filter((x:any)=>x.active);setOutlets(active);
  const chosen=profile.role==='manager'?(profile.outlet_id||''):(id||localStorage.getItem('hair_salon_outlet')||profile.outlet_id||active[0]?.id||'');
  setOutletId(chosen);
  if(chosen){const {data:c,error:ce}=await supabase.rpc('owner_manager_list_customers',{p_outlet_id:chosen});if(ce)setError(ce.message);setCustomers(c||[]);}
  setLoading(false);
 }
 useEffect(()=>{load()},[]);
 const filtered=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return customers;return customers.filter(c=>c.customer_name.toLowerCase().includes(q)||c.customer_phone.toLowerCase().includes(q))},[customers,search]);
 function openAdd(){setEditing(null);setName('');setPhone('');setAddress('');setError('');setFormOpen(true)}
 function openEdit(c:Customer){setEditing(c);setName(c.customer_name);setPhone(c.customer_phone);setAddress(c.customer_address);setError('');setFormOpen(true)}
 async function save(){
  setError('');
  if(!name.trim()||!phone.trim()||!address.trim()){setError('Please fill name, mobile number and address.');return;}
  setSaving(true);
  const {error:e}=editing
   ? await supabase.rpc('owner_manager_update_customer',{p_customer_id:editing.customer_id,p_name:name.trim(),p_phone:phone.trim(),p_address:address.trim()})
   : await supabase.rpc('owner_manager_add_customer',{p_name:name.trim(),p_phone:phone.trim(),p_address:address.trim(),p_outlet_id:outletId});
  setSaving(false);
  if(e){setError(e.message);return;}
  setName('');setPhone('');setAddress('');setFormOpen(false);setEditing(null);await load(outletId);
 }
 async function remove(c:Customer){
  if(!confirm(`Delete ${c.customer_name}? Their transaction records will remain, but this customer profile will be removed.`))return;
  setError('');setDeleting(c.customer_id);
  const {error:e}=await supabase.rpc('owner_manager_delete_customer',{p_customer_id:c.customer_id});
  setDeleting('');
  if(e){setError(e.message);return;}
  await load(outletId);
 }
 function exportExcel(){const rows=filtered.map((c,i)=>({'S.No.':i+1,'Customer Name':c.customer_name,'Mobile Number':c.customer_phone,'Address':c.customer_address,'Added On':new Date(c.created_at).toLocaleString('en-IN')}));const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:8},{wch:28},{wch:18},{wch:45},{wch:24}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Customers');XLSX.writeFile(wb,'hair-salon-customers.xlsx')}
 const nav=[['Overview',LayoutDashboard,'/dashboard'],['Transactions',Receipt,'/dashboard/transactions'],['Staff & Managers',Users,'/dashboard/management'],['Outlets',Building2,'/dashboard/management'],['Customers',UserRound,'/dashboard/customers'],['Services',Scissors,'/dashboard/services'],['Settings',Settings,'/dashboard/settings']] as const;
 if(loading)return <div className="grid min-h-screen place-items-center bg-[#F7F4EF]">Loading customer details…</div>;
 return <div className="min-h-screen bg-[#F7F4EF] text-[#17130F]">
  <aside className="fixed inset-y-0 left-0 hidden w-72 bg-[#17130F] p-5 text-white lg:block"><Brand/><NavItems router={router} nav={nav}/></aside>
  {menuOpen&&<div className="fixed inset-0 z-50 lg:hidden"><div onClick={()=>setMenuOpen(false)} className="absolute inset-0 bg-black/40"/><aside className="absolute inset-y-0 left-0 w-72 bg-[#17130F] p-5 text-white shadow-2xl"><div className="flex items-center justify-between"><Brand/><button onClick={()=>setMenuOpen(false)} className="rounded-sm p-2"><X size={20}/></button></div><NavItems router={router} nav={nav} close={()=>setMenuOpen(false)}/></aside></div>}
  <main className="lg:pl-72"><header className="flex items-center justify-between border-b border-[#DED6CC] bg-white/90 px-5 py-4"><button onClick={()=>setMenuOpen(true)} className="rounded-sm border border-[#DED6CC] p-2 lg:hidden"><Menu size={20}/></button><div className="rounded-md border border-[#DED6CC] bg-white px-4 py-2 text-right"><b className="text-xs">{user?.name}</b><div className="text-[10px] capitalize text-[#756B62]">{user?.role}</div></div></header>
   <section className="mx-auto max-w-[1500px] p-5 md:p-8"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-[#8B6B4A]">Customer records</p><h1 className="mt-2 text-4xl font-bold">Customer Records</h1><p className="mt-2 text-sm text-[#756B62]">Customer profiles are maintained by authorized salon management.</p></div><div className="flex w-full flex-wrap gap-2 sm:w-auto"><select disabled={user?.role==='manager'} value={outletId} onChange={e=>{localStorage.setItem('hair_salon_outlet',e.target.value);load(e.target.value)}} className="min-w-0 flex-1 rounded-md border border-[#DED6CC] bg-white px-4 py-3 text-sm font-semibold sm:flex-none">{outlets.map(o=><option key={o.id} value={o.id}>{o.name} — {o.city}</option>)}</select><button onClick={openAdd} className="flex items-center gap-2 rounded-md bg-[#17130F] px-4 py-3 text-sm font-semibold text-white"><Plus size={17}/>Add customer</button><button onClick={exportExcel} className="flex items-center gap-2 rounded-md border border-[#DED6CC] bg-white px-4 py-3 text-sm font-semibold"><Download size={17}/>Export Excel</button></div></div>
    {error&&<div className="mb-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="rounded-md border border-[#DED6CC] bg-white p-5 md:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold">All customers</h2><p className="mt-1 text-xs text-[#756B62]">{filtered.length} of {customers.length} customers</p></div><div className="relative w-full md:max-w-sm"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#756B62]" size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-[#DED6CC] py-3 pl-11 pr-4 outline-none focus:border-[#8B6B4A]" placeholder="Search name or mobile number"/></div></div>
     <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[#EDE7DF]"><th className="pb-3 text-xs text-[#756B62]">Name</th><th className="pb-3 text-xs text-[#756B62]">Mobile number</th><th className="pb-3 text-xs text-[#756B62]">Address</th><th className="pb-3 text-xs text-[#756B62]">Added</th><th className="pb-3 text-right text-xs text-[#756B62]">Actions</th></tr></thead><tbody>{filtered.map(c=><tr key={c.customer_id} className="border-b border-[#EDE7DF] last:border-0"><td className="py-4 font-semibold">{c.customer_name}</td><td>{c.customer_phone}</td><td className="max-w-[340px] truncate">{c.customer_address}</td><td className="text-xs text-[#756B62]">{new Date(c.created_at).toLocaleDateString('en-IN')}</td><td><div className="flex justify-end gap-2"><button onClick={()=>openEdit(c)} className="flex items-center gap-1 rounded-sm border border-[#DED6CC] px-3 py-2 text-xs font-semibold hover:border-[#8B6B4A]"><Edit3 size={14}/>Edit</button><button disabled={deleting===c.customer_id} onClick={()=>remove(c)} className="flex items-center gap-1 rounded-sm border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={14}/>{deleting===c.customer_id?'Deleting…':'Delete'}</button></div></td></tr>)}</tbody></table>{!filtered.length&&<div className="py-14 text-center text-sm text-[#756B62]"><Users className="mx-auto mb-3" size={25}/>{search?'No customer matches your search.':'No customers added yet.'}</div>}</div>
    </div></section>
  </main>
  {formOpen&&<div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-md bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">{editing?'Edit customer':'Add customer'}</h2><p className="mt-1 text-xs text-[#756B62]">Customer profiles are managed manually by owner/manager.</p></div><button onClick={()=>setFormOpen(false)} className="rounded-sm border p-2"><X size={18}/></button></div><div className="mt-6 space-y-4"><input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-md border border-[#DED6CC] px-4 py-3" placeholder="Customer name"/><input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,15))} className="w-full rounded-md border border-[#DED6CC] px-4 py-3" placeholder="Mobile number" inputMode="numeric"/><textarea value={address} onChange={e=>setAddress(e.target.value)} className="min-h-24 w-full rounded-md border border-[#DED6CC] px-4 py-3" placeholder="Address"/><button disabled={saving} onClick={save} className="w-full rounded-md bg-[#17130F] py-4 font-semibold text-white">{saving?(editing?'Updating…':'Saving…'):(editing?'Update customer':'Save customer')}</button></div></div></div>}
 </div>
}
function Brand(){return <div className="flex items-center gap-3 px-2"><img src="/yash-hair-salon-logo.svg" alt="Yash Hair Salon & Academy" className="h-10 w-32 object-contain object-left"/></div>}
function NavItems({router,nav,close}:{router:any;nav:readonly (readonly [string,any,string])[];close?:()=>void}){return <nav className="mt-10 space-y-1">{nav.map(([x,I,path])=><button key={x} onClick={()=>{close?.();router.push(path)}} className="flex w-full items-center gap-3 rounded-sm px-4 py-3 text-left text-sm text-white/70 hover:bg-white/10"><I size={18}/>{x}</button>)}</nav>}
