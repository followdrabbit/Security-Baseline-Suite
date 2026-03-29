import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import ConfirmationModal from '@/components/ConfirmationModal';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const statusColors: Record<string, string> = {
    approved: 'text-emerald-400',
    rejected: 'text-red-400',
    pending: 'text-amber-400',
    reviewed: 'text-blue-400',
    source_processed: 'text-primary',
    control_status_change: 'text-blue-400',
    team_member_joined: 'text-violet-400',
  };

  const getStatusFromNotification = (n: { title: string; type: string }) => {
    if (n.type === 'source_processed') return 'source_processed';
    if (n.type === 'team_member_joined') return 'team_member_joined';
    if (n.type === 'control_status_change') return 'control_status_change';
    if (n.title.includes('approved')) return 'approved';
    if (n.title.includes('rejected')) return 'rejected';
    if (n.title.includes('reviewed')) return 'reviewed';
    return 'pending';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => markAllAsRead.mutate()}
              >
                <CheckCheck className="h-3 w-3" />
                Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={() => clearAll.mutate()}
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const status = getStatusFromNotification(n);
                return (
                  <div
                    key={n.id}
                    className={`group p-3 text-sm transition-colors cursor-pointer hover:bg-accent/50 ${
                      !n.is_read ? 'bg-accent/20' : ''
                    }`}
                    onClick={() => {
                      if (!n.is_read) markAsRead.mutate(n.id);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 ${statusColors[status] || 'text-muted-foreground'}`}>
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs capitalize">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification.mutate(n.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
