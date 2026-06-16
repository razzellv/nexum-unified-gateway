import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TierGate } from '@/components/TierGate';
import {
  MessageSquare, Camera, Shield, Send, Loader2,
  Bot, User, Upload, AlertTriangle,
  Phone, CheckCircle, Sparkles, Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isCritical?: boolean;
}

const CRISIS_RESOURCES = [
  { name: 'OSHA Safety Hotline', phone: '1-800-321-6742', description: 'Report workplace safety violations' },
  { name: 'National Crisis Line', phone: '988', description: '24/7 mental health crisis support' },
  { name: 'EEOC (Discrimination)', phone: '1-800-669-4000', description: 'Equal Employment Opportunity Commission' },
];

const callVVFI = async (mode: string, payload: object, token: string) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/vvfi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mode, ...payload }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};

// ─── Text Instructor ──────────────────────────────────────────────────────────
const TextInstructor = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    const token = localStorage.getItem('nexum_access_token') || '';
    const userMsg: Message = { role: 'user', content: question.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);
    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const data = await callVVFI('text-instructor', { question: userMsg.content, conversationHistory: history }, token);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date().toISOString() }]);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to get response', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-primary" />
            Text Instructor
            <Badge variant="outline" className="text-xs">AI-Powered</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">Ask technical questions about HVAC, boilers, chillers, pumps, and facility systems. Get SOP-style guidance from an expert AI.</p>
        </CardHeader>
      </Card>

      <ScrollArea className="h-[400px] border rounded-lg p-4 bg-background/50" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
            <Bot className="w-12 h-12 opacity-20" />
            <div>
              <p className="font-medium">Ask your first question</p>
              <p className="text-xs mt-1">Try: "How do I check boiler combustion efficiency?" or "What are the signs of chiller refrigerant leak?"</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  <p className="text-xs opacity-50 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask about equipment operation, troubleshooting, compliance, safety procedures..."
          className="resize-none"
          rows={3}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(); }}
        />
        <Button onClick={handleSubmit} disabled={loading || !question.trim()} className="self-end">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Cmd+Enter to send</p>
    </div>
  );
};

// ─── Photo Analyzer ───────────────────────────────────────────────────────────
const PhotoAnalyzer = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload a JPG or PNG', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setSelectedImage(base64);
      setAnalysis(null);
      setAnalyzing(true);
      try {
        const resp = await fetch('/.netlify/functions/analyze-equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: [base64], equipmentType: 'facility-equipment', context: '' }),
        });
        if (!resp.ok) throw new Error('Analysis request failed');
        const data = await resp.json();
        setAnalysis(data.analysis || data.response);
        toast({ title: 'Analysis complete' });
      } catch (err) {
        toast({ title: 'Analysis failed', variant: 'destructive' });
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="w-4 h-4 text-primary" />
            Photo Analyzer
            <Badge variant="outline" className="text-xs">Vision AI</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">Upload photos of equipment, nameplates, control panels, or safety issues. Get step-by-step operating instructions, compliance notes, and maintenance guidance.</p>
        </CardHeader>
      </Card>

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${selectedImage ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/20'}`}
      >
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        {selectedImage ? (
          <div className="space-y-3">
            <img src={selectedImage} alt="Selected" className="max-h-48 mx-auto rounded-lg object-contain" />
            {analyzing && <div className="flex items-center justify-center gap-2 text-primary"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Analyzing equipment...</span></div>}
            {!analyzing && <p className="text-xs text-muted-foreground">Click to upload a different image</p>}
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium text-sm">Click to upload equipment photo</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 10MB</p>
          </div>
        )}
      </div>

      {analysis && (
        <Card className="bg-card/30 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-sans">{analysis}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Ethics Advisor ───────────────────────────────────────────────────────────
const EthicsAdvisor = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    const token = localStorage.getItem('nexum_access_token') || '';
    const userMsg: Message = { role: 'user', content: question.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);
    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const data = await callVVFI('ethics-advisor', { question: userMsg.content, conversationHistory: history }, token);
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        isCritical: data.isCritical,
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (data.isCritical) setShowResources(true);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to get response', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-primary" />
            Ethics Advisor
            <Badge variant="outline" className="text-xs">Confidential</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">Evaluate facility decisions for safety, compliance, and ethical responsibility. Get clear recommendations with risks of action vs inaction.</p>
        </CardHeader>
      </Card>

      {showResources && (
        <Alert className="border-orange-500/30 bg-orange-500/10">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <AlertDescription>
            <p className="font-semibold text-orange-500 mb-2">Important Resources</p>
            <div className="space-y-1">
              {CRISIS_RESOURCES.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span className="font-medium">{r.name}:</span>
                  <span className="text-primary">{r.phone}</span>
                  <span className="text-muted-foreground">— {r.description}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <ScrollArea className="h-[380px] border rounded-lg p-4 bg-background/50" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
            <Shield className="w-12 h-12 opacity-20" />
            <div>
              <p className="font-medium">Ethics & compliance guidance</p>
              <p className="text-xs mt-1">Try: "My supervisor asked me to skip a safety inspection" or "I witnessed a coworker falsifying logs"</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.isCritical ? 'bg-orange-500/20' : 'bg-primary/20'}`}>
                    <Shield className={`w-4 h-4 ${msg.isCritical ? 'text-orange-500' : 'text-primary'}`} />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : msg.isCritical ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-card border border-border'}`}>
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  <p className="text-xs opacity-50 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Describe an ethical situation, safety concern, or compliance question..."
          className="resize-none"
          rows={3}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(); }}
        />
        <Button onClick={handleSubmit} disabled={loading || !question.trim()} className="self-end">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

// ─── Project Advisor ─────────────────────────────────────────────────────────
const ProjectAdvisor = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    const token = localStorage.getItem('nexum_access_token') || '';
    const userMsg: Message = { role: 'user', content: question.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);
    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const data = await callVVFI('project-advisor', { question: userMsg.content, conversationHistory: history }, token);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date().toISOString() }]);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to get response', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4 text-primary" />
            Project Advisor
            <Badge variant="outline" className="text-xs">Enterprise</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Capital project planning, EVM, contractor management, scope control, schedule risk, and budget forecasting for facility operations. Get structured, actionable project guidance.
          </p>
        </CardHeader>
      </Card>

      <ScrollArea className="h-[380px] border rounded-lg p-4 bg-background/50" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
            <Target className="w-12 h-12 opacity-20" />
            <div>
              <p className="font-medium">Capital project guidance</p>
              <p className="text-xs mt-1">Try: "How do I set up an EVM baseline for a chiller replacement?" or "My contractor is 3 weeks behind — what are my options?"</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  <p className="text-xs opacity-50 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask about capital projects, EVM, contractor management, scope control, budget, schedule risk..."
          className="resize-none"
          rows={3}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(); }}
        />
        <Button onClick={handleSubmit} disabled={loading || !question.trim()} className="self-end">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Cmd+Enter to send</p>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FacilityInstructorPage() {
  const { user } = useAuth();

  return (
    <TierGate
      featureName="VVFI Facility Instructor"
      requiredTier="PREMIUM"
      description="AI-powered technical mentoring, photo analysis, ethics guidance, and project advisory is available on the Prestige plan."
    >
      <MainLayout>
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Facility Instructor</h1>
              <p className="text-muted-foreground mt-1">Virtual Virtuous Facility Instructor — AI-powered technical mentor for facility professionals</p>
            </div>
            <Badge className="ml-auto bg-primary/20 text-primary border-primary/30">VVFI</Badge>
          </div>

          <Tabs defaultValue="instructor" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="instructor" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /><span className="hidden sm:inline">Text</span> Instructor
              </TabsTrigger>
              <TabsTrigger value="analyzer" className="flex items-center gap-2">
                <Camera className="w-4 h-4" /><span className="hidden sm:inline">Photo</span> Analyzer
              </TabsTrigger>
              <TabsTrigger value="ethics" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />Ethics Advisor
              </TabsTrigger>
              <TabsTrigger value="project" className="flex items-center gap-2">
                <Target className="w-4 h-4" />Project Advisor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="instructor"><TextInstructor /></TabsContent>
            <TabsContent value="analyzer"><PhotoAnalyzer /></TabsContent>
            <TabsContent value="ethics"><EthicsAdvisor /></TabsContent>
            <TabsContent value="project"><ProjectAdvisor /></TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </TierGate>
  );
}
