import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Hash, Plus, X, Send, RefreshCw, Users, Settings,
  Search, ChevronDown, Trash2, UserPlus, Lock, Globe,
  Bell, AlertTriangle, Zap, Wrench, BarChart3, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.VITE_API_BASE_URL;

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'broadcast' | 'department' | 'direct' | 'custom';
  icon?: string;
  roleAccess?: string[];
  members?: string[];
  pinned?: boolean;
  system?: boolean;
}

interface Message {
  id: string;
  author: string;
  authorId?: string;
  role?: string;
  content: string;
  time: string;
  channel: string;
}

// ── DEFAULT CHANNELS ──────────────────────────────────────────────────────────
const DEFAULT_CHANNELS: Channel[] = [
  { id: 'all',       name: 'All Activity',       type: 'broadcast',  icon: 'Globe',    pinned: true,  system: true, description: 'All messages from all channels' },
  { id: 'emergency', name: 'Emergency Response',  type: 'department', icon: 'Alert',    pinned: true,  system: true, description: 'Emergency alerts and response coordination' },
  { id: 'maintenance',name: 'Maintenance Team',  type: 'department', icon: 'Wrench',   pinned: false, system: true, description: 'Work orders, equipment issues, PM coordination' },
  { id: 'leadership', name: 'Leadership Feed',   type: 'department', icon: 'BarChart', pinned: false, system: true, roleAccess: ['manager','supervisor','director','executive','admin'], description: 'Leadership communications and announcements' },
  { id: 'energy',    name: 'Energy & Utilities', type: 'department', icon: 'Zap',      pinned: false, system: true, description: 'Energy readings, utility alerts, MPCC data' },
];

const ROLE_OPTIONS = ['operator','custodian','technician','engineer','supervisor','manager','director','executive','admin'];

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

const ChannelIcon = ({ icon, className }: { icon?: string; className?: string }) => {
  const cls = cn('w-3.5 h-3.5', className);
  if (icon === 'Alert') return <AlertTriangle className={cls} />;
  if (icon === 'Wrench') return <Wrench className={cls} />;
  if (icon === 'BarChart') return <BarChart3 className={cls} />;
  if (icon === 'Zap') return <Zap className={cls} />;
  if (icon === 'Globe') return <Globe className={cls} />;
  if (icon === 'Lock') return <Lock className={cls} />;
  if (icon === 'Users') return <Users className={cls} />;
  return <Hash className={cls} />;
};

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeChannel, setActiveChannel] = useState('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>(() => {
    const saved = localStorage.getItem('nexum_channels');
    return saved ? [...DEFAULT_CHANNELS, ...JSON.parse(saved).filter((c: Channel) => !c.system)] : DEFAULT_CHANNELS;
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', type: 'custom' as const, roleAccess: [] as string[], memberSearch: '' });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const facilityId = user?.facilityId || 'facility-001';

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [activeChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('nexum_access_token');
      const channelParam = activeChannel === 'all' ? '' : `&channel=${activeChannel}`;
      const res = await fetch(`${API}/messages?facilityId=${facilityId}${channelParam}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || data.items || [];
        setMessages(msgs.map((m: any) => ({
          id: m.messageId || m.id || Date.now().toString(),
          author: m.senderName || m.operatorId || 'Unknown',
          authorId: m.senderId,
          role: m.role || '',
          content: m.content || m.notes || '',
          time: m.timestamp || m.createdAt || new Date().toISOString(),
          channel: m.channel || 'general',
        })).reverse());
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
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      author: user?.name || user?.email || 'You',
      authorId: user?.id || user?.sub,
      role: user?.role || '',
      content: messageInput,
      time: new Date().toISOString(),
      channel: activeChannel === 'all' ? 'general' : activeChannel,
    };
    setMessages(prev => [...prev, optimistic]);
    setMessageInput('');
    try {
      const token = localStorage.getItem('nexum_access_token');
      await fetch(`${API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: optimistic.content,
          channel: optimistic.channel,
          facilityId,
          senderName: optimistic.author,
          senderId: optimistic.authorId,
          role: optimistic.role,
        }),
      });
      setTimeout(() => fetchMessages(), 1000);
    } catch {
      toast({ title: 'Send failed', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const createChannel = () => {
    if (!newChannel.name.trim()) { toast({ title: 'Channel name required', variant: 'destructive' }); return; }
    const ch: Channel = {
      id: newChannel.name.toLowerCase().replace(/\s+/g, '-'),
      name: newChannel.name,
      description: newChannel.description,
      type: newChannel.type,
      roleAccess: newChannel.roleAccess.length > 0 ? newChannel.roleAccess : undefined,
      pinned: false,
      system: false,
    };
    const custom = [...channels.filter(c => !c.system), ch];
    localStorage.setItem('nexum_channels', JSON.stringify(custom));
    setChannels([...DEFAULT_CHANNELS, ...custom]);
    setActiveChannel(ch.id);
    setNewChannel({ name: '', description: '', type: 'custom', roleAccess: [], memberSearch: '' });
    setShowCreateChannel(false);
    toast({ title: `#${ch.name} created` });
  };

  const deleteChannel = (id: string) => {
    const custom = channels.filter(c => !c.system && c.id !== id);
    localStorage.setItem('nexum_channels', JSON.stringify(custom));
    setChannels([...DEFAULT_CHANNELS, ...custom]);
    if (activeChannel === id) setActiveChannel('all');
    toast({ title: 'Channel removed' });
  };

  const filteredMessages = activeChannel === 'all'
    ? messages
    : messages.filter(m => m.channel === activeChannel);

  const searchedMessages = searchTerm
    ? filteredMessages.filter(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()) || m.author.toLowerCase().includes(searchTerm.toLowerCase()))
    : filteredMessages;

  const currentChannel = channels.find(c => c.id === activeChannel);
  const userRole = user?.role || '';
  const isLeadership = ['manager','supervisor','director','executive','admin'].includes(userRole);

  const visibleChannels = channels.filter(c => {
    if (!c.roleAccess || c.roleAccess.length === 0) return true;
    return c.roleAccess.includes(userRole);
  });

  const pinnedChannels = visibleChannels.filter(c => c.pinned);
  const regularChannels = visibleChannels.filter(c => !c.pinned);

  const roleColors: Record<string, string> = {
    admin: 'text-red-400', executive: 'text-yellow-400', director: 'text-purple-400',
    manager: 'text-blue-400', supervisor: 'text-cyan-400', engineer: 'text-green-400',
    technician: 'text-orange-400', operator: 'text-primary', custodian: 'text-muted-foreground',
  };

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="relative z-10 flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm">

        {/* Sidebar */}
        <div className={cn('flex flex-col border-r border-border/30 bg-card/50 transition-all', sidebarOpen ? 'w-64' : 'w-0 overflow-hidden')}>
          {/* Sidebar header */}
          <div className="p-3 border-b border-border/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Messages</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary" onClick={() => setShowCreateChannel(true)}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Pinned channels */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Pinned</p>
              {pinnedChannels.map(ch => (
                <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                  className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-all group',
                    activeChannel === ch.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground')}>
                  <ChannelIcon icon={ch.icon} className={activeChannel === ch.id ? 'text-primary' : ''} />
                  <span className="flex-1 truncate">{ch.name}</span>
                  {ch.id === 'emergency' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </button>
              ))}
            </div>

            {/* Regular channels */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Channels</p>
              {regularChannels.map(ch => (
                <div key={ch.id} className="group flex items-center">
                  <button onClick={() => setActiveChannel(ch.id)}
                    className={cn('flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-all',
                      activeChannel === ch.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground')}>
                    <ChannelIcon icon={ch.icon} className={activeChannel === ch.id ? 'text-primary' : ''} />
                    <span className="flex-1 truncate">{ch.name}</span>
                    {ch.roleAccess && <Lock className="w-3 h-3 opacity-50" />}
                  </button>
                  {!ch.system && (
                    <button onClick={() => deleteChannel(ch.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Create channel button */}
            <button onClick={() => setShowCreateChannel(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
              <Plus className="w-3.5 h-3.5" /><span>Create channel</span>
            </button>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 bg-card/30">
            <button onClick={() => setSidebarOpen(o => !o)} className="text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn('w-4 h-4 transition-transform', sidebarOpen ? '-rotate-90' : 'rotate-0')} />
            </button>
            {currentChannel && <ChannelIcon icon={currentChannel.icon} className="text-primary" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{currentChannel ? `#${currentChannel.name}` : '#general'}</p>
              {currentChannel?.description && <p className="text-xs text-muted-foreground truncate">{currentChannel.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search messages..."
                  className="pl-7 h-7 text-xs w-36 border-border/40 bg-muted/20" />
              </div>
              <Button variant="ghost" size="sm" onClick={fetchMessages} disabled={loading} className="h-7 w-7 p-0">
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </Button>
              {currentChannel && !currentChannel.system && (
                <Button variant="ghost" size="sm" onClick={() => setShowChannelSettings(true)} className="h-7 w-7 p-0">
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="text-center text-muted-foreground text-sm py-8">Loading messages...</div>
            ) : searchedMessages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No messages yet — start the conversation</p>
              </div>
            ) : (
              searchedMessages.map((msg, i) => {
                const isOwn = msg.authorId === (user?.id || user?.sub) || msg.author === (user?.name || user?.email);
                const showHeader = i === 0 || searchedMessages[i-1]?.author !== msg.author || (new Date(msg.time).getTime() - new Date(searchedMessages[i-1]?.time).getTime()) > 300000;
                return (
                  <div key={msg.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                    {showHeader && (
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5', isOwn ? 'bg-primary/30 text-primary' : 'bg-muted/40 text-muted-foreground')}>
                        {initials(msg.author)}
                      </div>
                    )}
                    {!showHeader && <div className="w-8 shrink-0" />}
                    <div className={cn('flex-1 min-w-0 max-w-[80%]', isOwn && 'items-end flex flex-col')}>
                      {showHeader && (
                        <div className={cn('flex items-baseline gap-2 mb-1', isOwn && 'flex-row-reverse')}>
                          <span className="text-sm font-medium">{isOwn ? 'You' : msg.author}</span>
                          {msg.role && <span className={cn('text-[10px] capitalize', roleColors[msg.role] || 'text-muted-foreground')}>{msg.role}</span>}
                          <span className="text-xs text-muted-foreground">{timeAgo(msg.time)}</span>
                          {activeChannel === 'all' && msg.channel !== 'general' && (
                            <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground capitalize">{msg.channel}</Badge>
                          )}
                        </div>
                      )}
                      <div className={cn('px-3 py-2 rounded-xl text-sm leading-relaxed', isOwn ? 'bg-primary/20 text-foreground rounded-tr-sm' : 'bg-muted/30 text-foreground rounded-tl-sm')}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/20 bg-card/30">
            <div className="flex items-center gap-2 p-2 rounded-xl border border-border/40 bg-muted/10">
              <Input value={messageInput} onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={`Message #${currentChannel?.name || 'general'}...`}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm" />
              <Button size="sm" onClick={handleSend} disabled={sending || !messageInput.trim()}
                className="h-8 w-8 p-0 bg-primary text-primary-foreground rounded-lg shrink-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCreateChannel(false)}>
          <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Create Channel</h3>
              <button onClick={() => setShowCreateChannel(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Channel Name *</Label>
                <Input value={newChannel.name} onChange={e => setNewChannel(p => ({...p, name: e.target.value}))}
                  placeholder="e.g. boiler-room-team" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input value={newChannel.description} onChange={e => setNewChannel(p => ({...p, description: e.target.value}))}
                  placeholder="What is this channel for?" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Access — leave empty for everyone</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_OPTIONS.map(role => (
                    <button key={role} onClick={() => setNewChannel(p => ({
                      ...p,
                      roleAccess: p.roleAccess.includes(role) ? p.roleAccess.filter(r => r !== role) : [...p.roleAccess, role]
                    }))}
                      className={cn('px-2.5 py-1 rounded-full text-xs border capitalize transition-all',
                        newChannel.roleAccess.includes(role) ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground hover:border-border')}>
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateChannel(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={createChannel}>
                <Plus className="w-4 h-4 mr-2" />Create Channel
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Messages;
