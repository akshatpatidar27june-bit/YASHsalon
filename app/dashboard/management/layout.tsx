'use client';

import { useEffect, useState } from 'react';
import { Mail, Users } from 'lucide-react';
import { supabase, supabasePublic } from '../../../lib/supabase';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  async function loadEmails() {
    const { data: profile } = await supabasePublic.rpc('get_my_profile');
    const me = Array.isArray(profile) ? profile[0] : profile;
    if (me?.role !== 'owner' || me?.active !== true) return;

    const { data } = await supabase.functions.invoke('list-salon-user-emails');
    const users = data?.users || [];
    const nextEmails: Record<string, string> = {};
    const nextNames: Record<string, string> = {};
    users.forEach((u: any) => {
      if (u.email) nextEmails[u.id] = u.email;
      if (u.name) nextNames[u.id] = u.name;
    });
    setEmails(nextEmails);
    setNames(nextNames);
  }

  useEffect(() => {
    loadEmails();
  }, []);

  return (
    <>
      {children}
      <section className="min-h-screen bg-[#F7F4EF] px-5 pb-10 md:px-8">
        <div className="mx-auto max-w-7xl rounded-md border border-[#DED6CC] bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-[#17130F] text-white">
              <Mail size={19} />
            </div>
            <div>
              <h2 className="font-bold">Staff & Manager Login Details</h2>
              <p className="text-xs text-[#756B62]">
                Every staff or manager created from this management section will appear here with their login Gmail/email.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(emails).map(([id, email]) => (
              <a
                key={id}
                href={`mailto:${email}`}
                className="rounded-md border border-[#DED6CC] bg-[#F7F4EF] p-4 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <Users size={17} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{names[id] || 'Team member'}</p>
                    <p className="mt-1 break-all text-xs text-[#756B62]">{email}</p>
                  </div>
                </div>
              </a>
            ))}
            {!Object.keys(emails).length && (
              <p className="text-sm text-[#756B62]">No staff or manager login emails found yet.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
