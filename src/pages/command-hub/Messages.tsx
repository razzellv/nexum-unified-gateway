import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Send, RefreshCw, Hash, AlertTriangle, Wrench, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const CHANNELS = [
  { id: 'all',        name: 'All Activity',      icon: Hash,         filter: null },
  { id: 'emergency',  name: 'Emergency Response', icon: AlertTriangle, filter: 'emergency' },
  { id: 'maintenance',name: 'Maintenance Team',   icon: Wrench,       filter: 'maintenance' },
  { id: 'leadership', name: 'Leadership Feed',    icon: Users,        filter: 'leadership' },
  { id: 'energy',     name: 'Energy & Utilities', icon: Zap,          filter: 'energy' },
];

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function logToMessage(log: any) {
  return {
    id: log.logId || log.id,
    author: log.operatorId || log.submittedBy || 'System',
    content: log.notes || log.description || log.action || 'Facility log entry',
    time: log.timestamp || log.createdAt || new Date().toISOString(),
    channel: log.logType || log.category || 'maintenance',
    location: log.location || log.facilityId || '',
    system: log.systemType || log.equipmentType || '',
  };
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeChannel, setActiveChannel] = useState('all');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // Poll every 30s
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${baseUrl}/logs/latest?facilityId=facility-001&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const logs = data.logs || data.items || [];
        setMessages(logs.map(logToMessage).reverse());
      }
    } catch (err) {
      console.error('Messages fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    setSending(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      await fetch(`${baseUrl}/facility-log-ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          notes: messageInput,
          logType: activeChannel === 'all' ? 'general' : activeChannel,
          facilityId: user?.facilityId,
          submittedBy: user?.name || user?.email,
          action: messageInput,
        }),
      });
      setMessageInput('');
      await fetchMessages();
    } catch (err) {
      toast({ title: 'Send failed', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = activeChannel === 'all'
    ? messages
    : messages.filter(m => m.channel?.toLowerCase().includes(activeChannel) || m.system?.toLowerCase().includes(activeChannel));

  const channel = CHANNELS.find(c => c.id === activeChannel);

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Sidebar */}
        <div className="w-52 shrink-0 flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Channels</p>
          {CHANNELS.map(ch => {
            const Icon = ch.icon;
            const unread = ch.id !== 'all'
              ? messages.filter(m => m.channel?.toLowerCase().includes(ch.id) && !m.read).length
              : 0;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  activeChannel === ch.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{ch.name}</span>
                {unread > 0 && <Badge className="text-xs bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center">{unread}</Badge>}
              </button>
            );
          })}
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              {channel && <channel.icon className="w-4 h-4 text-primary" />}
              <span className="font-medium text-sm">#{channel?.name}</span>
              <Badge variant="outline" className="text-xs">{filteredMessages.length} messages</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchMessages} disabled={loading}>
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">No messages in this channel</div>
            ) : (
              filteredMessages.map((msg, i) => (
                <div key={msg.id || i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {msg.author === 'System' ? '⚡' : initials(msg.author)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{msg.author}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(msg.time)}</span>
                      {msg.location && <span className="text-xs text-muted-foreground">· {msg.location}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Message #${channel?.name}...`}
              className="flex-1"
            />
            <Button size="sm" onClick={handleSend} disabled={sending || !messageInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
