'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NotificationItem, Profile } from '@/types';
import { Bell, Check, Sparkles, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface HeaderProps {
  user: Profile | null;
}

export function Header({ user }: HeaderProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data as NotificationItem[]);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationItem, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    if (!user?.id) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="h-16 bg-[#0A0A0A] border-b border-[#1F1F1F] px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-opacity-80 ml-64">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#141414] border border-[#262626] text-xs text-[#A3A3A3]">
          <Sparkles className="w-3.5 h-3.5 text-[#E10600]" />
          <span className="font-semibold text-white">Relentive Agency Ops</span>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 text-[#A3A3A3] hover:text-white hover:bg-[#141414] rounded-lg border border-[#262626] transition"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E10600] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-80 bg-[#141414] border border-[#262626] rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 border-b border-[#262626] flex items-center justify-between bg-[#0A0A0A]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#E10600]" />
                <span className="text-xs font-bold text-white">Notifications</span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-[#FF3B3B] hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#1F1F1F]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#737373]">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 text-xs transition ${
                      !n.read ? 'bg-[#E10600]/5 border-l-2 border-[#E10600]' : 'opacity-70'
                    }`}
                  >
                    <p className="text-white font-medium">{(n.payload?.title as string) || 'System Notification'}</p>
                    <p className="text-[#A3A3A3] text-[11px] mt-0.5">{(n.payload?.message as string) || ''}</p>
                    <span className="text-[9px] text-[#737373] mt-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
