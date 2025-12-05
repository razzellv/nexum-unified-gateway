import { useState } from "react";
import { Bot, X, Send, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const AIWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hello! I'm your Facility Intelligence Assistant. How can I help you today?" }
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", content: message }]);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "ai", 
        content: "I'm analyzing your request. This feature will be connected to your facility systems soon. For now, you can navigate to specific modules using the dashboard." 
      }]);
    }, 1000);
    
    setMessage("");
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-16 h-16 rounded-full",
          "bg-gradient-to-br from-primary to-secondary",
          "flex items-center justify-center",
          "shadow-lg hover:shadow-[0_0_40px_hsl(168_92%_55%/0.5)]",
          "transition-all duration-300 hover:scale-110",
          "animate-glow-pulse",
          isOpen && "hidden"
        )}
      >
        <Bot className="w-7 h-7 text-primary-foreground" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-pulse" />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-96 max-w-[calc(100vw-3rem)]",
          "rounded-2xl overflow-hidden",
          "bg-card/95 backdrop-blur-2xl",
          "border-2 border-primary/30",
          "shadow-[0_0_60px_hsl(168_92%_55%/0.3)]",
          "animate-scale-in"
        )}>
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-primary/20 to-secondary/20 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Facility Intelligence</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" />
                    AI Assistant Online
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-xl text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/50 bg-muted/30">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about systems, logs, recommendations..."
                className="flex-1 bg-card/50 border-border/50 focus:border-primary"
              />
              <Button
                onClick={handleSend}
                size="icon"
                className="bg-primary hover:bg-primary-glow text-primary-foreground"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
