import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;

const getInitialMessage = (lang: string) => {
  return lang === "es" 
    ? "¡Hola! 👋 ¡Bienvenido a Cars & Claims! ¿Cómo puedo ayudarte hoy? ¿Estás buscando un carro, necesitas reparaciones, o tienes un reclamo que presentar?"
    : "Hi there! 👋 Welcome to Cars & Claims! How can I help you today? Are you looking for a car, need repairs, or have a claim to file?";
};

export const ChatBot = () => {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: getInitialMessage("en") }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Update initial message when language changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "assistant") {
      setMessages([{ role: "assistant", content: getInitialMessage(language) }]);
    }
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, language }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Check for navigation hints in the response
      checkForNavigation(assistantContent);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: "Sorry, I'm having trouble responding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkForNavigation = (content: string) => {
    const lowerContent = content.toLowerCase();
    // Add quick action buttons based on context
    if (lowerContent.includes("/inventory")) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "📍 **Quick link:** [View Inventory](/inventory)" 
      }]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamChat(input.trim());
  };

  const handleQuickLink = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  // Render message content with clickable links
  const renderMessageContent = (content: string, role: "user" | "assistant") => {
    if (role === "user") return content;
    
    // Parse markdown links [text](/path) and make them clickable
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      const linkText = match[1];
      const linkPath = match[2];
      
      // Create clickable link
      parts.push(
        <button
          key={match.index}
          onClick={() => handleQuickLink(linkPath)}
          className="text-primary font-semibold underline hover:text-primary/80 transition-colors"
        >
          {linkText}
        </button>
      );
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last link
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[400px] shadow-2xl border-2 border-primary/20">
          <CardHeader className="bg-primary text-primary-foreground py-3 px-4 rounded-t-lg">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {t("chat.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <div className="h-[350px] overflow-y-auto p-4 space-y-3 bg-muted/30">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border"
                    }`}
                  >
                    {renderMessageContent(msg.content, msg.role)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-background border border-border rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t border-border bg-muted/20 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleQuickLink("/inventory")} className="text-xs">
                🚗 {t("chat.inventory")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickLink("/claims")} className="text-xs">
                📋 {t("chat.claims")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickLink("/repairs")} className="text-xs">
                🔧 {t("chat.repairs")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickLink("/payments")} className="text-xs">
                💳 {t("chat.payments")}
              </Button>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chat.placeholder")}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
};
