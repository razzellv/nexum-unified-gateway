import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Send, Paperclip, Image, Users, Hash, Menu } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Messages = () => {
  const [showChannels, setShowChannels] = useState(false);
  const [messageInput, setMessageInput] = useState('');

  const channels = [
    { id: '1', name: 'leadership-feed', type: 'channel', unread: 3 },
    { id: '2', name: 'emergency-response', type: 'channel', unread: 0 },
    { id: '3', name: 'maintenance-team', type: 'channel', unread: 5 },
    { id: '4', name: 'vendor-comms', type: 'channel', unread: 1 }
  ];

  const messages = [
    { id: '1', author: 'Mike Johnson', content: 'Boiler #3 inspection complete. Burner adjustment scheduled for tomorrow.', time: '10:30 AM', avatar: 'M' },
    { id: '2', author: 'Sarah Chen', content: 'Vendor confirmed for electrical thermal scan on Thursday.', time: '10:15 AM', avatar: 'S' },
    { id: '3', author: 'David Park', content: 'Chiller backup is running smoothly. Main unit repair in progress.', time: '9:45 AM', avatar: 'D' },
    { id: '4', author: 'System', content: 'New signal received: Pump #2 vibration alert acknowledged.', time: '9:30 AM', avatar: '⚡' }
  ];

  const handleSend = () => {
    if (messageInput.trim()) {
      toast({ title: 'Message Sent', description: 'Your message has been sent.' });
      setMessageInput('');
    }
  };

  const handleAddChannel = () => toast({ title: 'Add Channel', description: 'Feature connected to backend' });

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4 md:gap-6">
        {/* Sidebar - Hidden on mobile by default */}
        <div className={cn("w-64 shrink-0 glass-panel p-4 absolute md:relative inset-y-0 left-0 z-20 md:z-auto transition-transform md:translate-x-0", showChannels ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Channels</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddChannel}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-1">
            {channels.map((channel, i) => (
              <button key={i} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left" onClick={() => setShowChannels(false)}>
                <div className="flex items-center gap-2"><Hash className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{typeof channel.name === "string" ? channel.name : channel.name?.S || "Channel"}</span></div>
                {channel.unread > 0 && <Badge className="bg-primary text-primary-foreground text-xs">{channel.unread}</Badge>}
              </button>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Direct Messages</h3>
            <div className="space-y-1">
              {['Mike Johnson', 'Sarah Chen', 'David Park'].map((name) => (
                <button key={name} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left" onClick={() => setShowChannels(false)}>
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">{name.charAt(0)}</div>
                  <span className="text-sm">{name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {showChannels && <div className="fixed inset-0 bg-black/50 z-10 md:hidden" onClick={() => setShowChannels(false)} />}

        {/* Main Chat Area */}
        <div className="flex-1 glass-panel flex flex-col min-w-0">
          <div className="p-3 md:p-4 border-b border-border/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setShowChannels(true)}><Menu className="w-5 h-5" /></Button>
              <Hash className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0"><h2 className="font-semibold truncate">leadership-feed</h2><p className="text-xs text-muted-foreground hidden sm:block">Global message feed for leadership</p></div>
            </div>
            <div className="flex items-center gap-1"><Button variant="ghost" size="icon"><Users className="w-5 h-5" /></Button><Button variant="ghost" size="icon"><Search className="w-5 h-5" /></Button></div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center text-xs md:text-sm font-medium text-primary shrink-0">{typeof msg.avatar === "string" ? msg.avatar : msg.avatar?.S || "?"}</div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2"><span className="font-medium text-sm">{msg.author}</span><span className="text-xs text-muted-foreground">{msg.time}</span></div>
                  <p className="text-sm text-muted-foreground mt-1">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 md:p-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="hidden sm:flex"><Paperclip className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" className="hidden sm:flex"><Image className="w-5 h-5" /></Button>
              <Input placeholder="Type a message..." className="flex-1 bg-muted/50" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
              <Button size="icon" onClick={handleSend}><Send className="w-5 h-5" /></Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
