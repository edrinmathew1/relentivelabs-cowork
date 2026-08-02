'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  CheckSquare2,
  Calendar,
  Target,
  Users,
  Settings,
  LogOut,
  Layers,
  User,
} from 'lucide-react';

interface SidebarProps {
  user: Profile | null;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Tasks Board', href: '/tasks', icon: CheckSquare2 },
  { label: 'Calendar OS', href: '/calendar', icon: Calendar },
  { label: 'Daily Checklist', href: '/checklist', icon: CheckSquare },
  { label: 'Goals & OKRs', href: '/goals', icon: Target },
  { label: 'Team Workspace', href: '/team', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-[#0A0A0A] border-r border-[#1F1F1F] flex flex-col justify-between h-screen fixed top-0 left-0 z-30 select-none">
      {/* Top Header */}
      <div>
        <div className="h-16 px-6 border-b border-[#1F1F1F] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E10600] flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-[#E10600]/30">
            R
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider text-white flex items-center gap-1">
              RELENTIVE <span className="text-[#E10600]">LABS</span>
            </span>
            <p className="text-[10px] text-[#A3A3A3] font-mono uppercase tracking-widest">
              CoWork OS v1.0
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#737373]">
            Agency Workspace
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#141414] text-white border-l-2 border-[#E10600] shadow-sm'
                    : 'text-[#A3A3A3] hover:text-white hover:bg-[#141414]/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#E10600]' : 'text-[#737373]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#1F1F1F] bg-[#0A0A0A]">
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#141414] border border-[#262626]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#E10600] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'US'
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || 'Team Member'}</p>
              <p className="text-[10px] text-[#A3A3A3] truncate capitalize">{user?.role || 'Member'}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="text-[#737373] hover:text-[#FF3B3B] p-1 rounded hover:bg-[#262626] transition shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
