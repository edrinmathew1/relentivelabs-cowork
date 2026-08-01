import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Profile } from '@/types';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch logged in profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  const userProfile: Profile = profile || {
    id: session.user.id,
    full_name: session.user.email?.split('@')[0] || 'User',
    email: session.user.email || '',
    role: 'member',
    status: 'active',
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <Sidebar user={userProfile} />
      <Header user={userProfile} />
      <main className="flex-1 ml-64 p-6 overflow-y-auto bg-[#0A0A0A]">
        {children}
      </main>
    </div>
  );
}
