import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
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

  // Fetch logged in profile safely
  let userProfile: Profile = {
    id: session.user.id,
    full_name: session.user.email?.split('@')[0] || 'User',
    email: session.user.email || '',
    role: 'member',
    status: 'active',
    joined_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      userProfile = profile as Profile;
    }
  } catch (err) {
    console.error('AppLayout profile fetch error:', err);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <Sidebar user={userProfile} />
      <Header user={userProfile} />
      <main className="flex-1 ml-64 p-6 overflow-y-auto bg-[#0A0A0A]">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
