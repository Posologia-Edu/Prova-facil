import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { simpleMarkdownToHtml } from "@/lib/simple-markdown";


interface Message {
  role: "user" | "assistant";
  content: string;
}

export function SalesAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      setMessages([{
        role: "assistant",
        content: "Olá! 👋 Sou o assistente do ProvaFácil. Posso te ajudar a entender como nossa plataforma pode transformar sua forma de avaliar alunos. Qual é a sua área de atuação?",
      }]);
    }
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, hasGreeted]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("sales-agent", {
        body: { messages: allMessages },
      });

      if (error) throw error;

      const reply = data?.reply || "Desculpe, houve um problema. Tente novamente.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      console.error("Sales agent error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, houve um erro. Tente novamente ou acesse nosso [formulário de contato](/contato-publico).",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-secondary text-secondary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          title="Fale conosco"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] rounded-xl border bg-card shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-secondary text-secondary-foreground shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm">ProvaFácil</h3>
                <p className="text-xs opacity-80">Tire suas dúvidas</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-secondary-foreground hover:bg-secondary-foreground/20" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {messages.map((msg, i) => (
              <div key={i} className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(msg.content) }} />
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-2 flex gap-2 shrink-0">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre o ProvaFácil..."
              className="min-h-[36px] max-h-20 resize-none text-sm"
              rows={1}
            />
            <Button size="icon" onClick={sendMessage} disabled={isLoading || !input.trim()} className="shrink-0 h-9 w-9 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
