'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Target,
  Users,
  Settings,
  LogOut,
  ListTodo,
  Calendar as CalendarIcon,
} from 'lucide-react';

interface SidebarProps {
  user: Profile | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks Board', href: '/tasks', icon: ListTodo },
    { name: 'Calendar OS', href: '/calendar', icon: CalendarIcon },
    { name: 'Daily Checklist', href: '/checklist', icon: CheckSquare },
    { name: 'Goals & OKRs', href: '/goals', icon: Target },
    { name: 'Team Workspace', href: '/team', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-64 bg-[#050505] border-r border-[#1F1F1F] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-[#1F1F1F] bg-[#0A0A0A]/50">
        <div className="w-8 h-8 rounded-lg bg-[#E10600] flex items-center justify-center shadow-lg shadow-[#E10600]/30 text-white font-black tracking-tighter">
          R
        </div>
        <div>
          <div className="text-sm font-extrabold text-white tracking-tight leading-none flex items-center gap-1.5">
            RELENTIVE<span className="text-[#E10600]">LABS</span>
          </div>
          <span className="text-[10px] text-[#A3A3A3] font-medium uppercase tracking-widest">
            COWORK OS v1.0
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-[#525252] uppercase tracking-wider">
          Agency Workspace
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#E10600]/15 text-white border-l-2 border-[#E10600]'
                  : 'text-[#A3A3A3] hover:text-white hover:bg-[#141414]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#E10600]' : 'text-[#737373]'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-[#1F1F1F] bg-[#0A0A0A]/60">
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#141414] border border-[#262626]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#262626] border border-[#E10600]/50 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || 'Agency Member'}
              </p>
              <div className="flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${user?.role === 'admin' ? 'bg-[#E10600]' : 'bg-[#3FBF6C]'}`} />
                <span className="text-[10px] text-[#A3A3A3] capitalize">
                  {user?.role || 'member'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-[#737373] hover:text-[#E10600] hover:bg-[#1F1F1F] rounded-md transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
