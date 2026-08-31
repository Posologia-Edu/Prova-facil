import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, User } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AITutorChatProps {
  answerId: string;
  studentAnswer: string;
  questionStatement: string;
  aiScore: number | null;
  aiFeedback: string | null;
  teacherScore: number | null;
  maxPoints: number;
  onSuggestScore?: (score: number, feedback: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor-chat`;

export default function AITutorChat({
  answerId,
  studentAnswer,
  questionStatement,
  aiScore,
  aiFeedback,
  teacherScore,
  maxPoints,
  onSuggestScore,
}: AITutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialGrade, setHasInitialGrade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamChat = async (userMessages: Message[], action: string = "discuss") => {
    setIsLoading(true);
    let assistantContent = "";

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ answerId, messages: userMessages, action }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      console.error("AI Tutor error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ ${e.message || "Erro ao conectar com o tutor."}` },
      ]);
    } finally {
      setIsLoading(false);
    }

    // Try to extract suggested score from the response
    if (onSuggestScore && assistantContent) {
      const scoreMatch = assistantContent.match(/nota\s*(?:sugerida)?[:\s]*(\d+(?:[.,]\d+)?)\s*(?:\/\s*\d+|ponto)/i);
      if (scoreMatch) {
        const score = parseFloat(scoreMatch[1].replace(",", "."));
        if (score >= 0 && score <= maxPoints) {
          // Don't auto-apply, just make it available
        }
      }
    }
  };

  const handleInitialGrade = async () => {
    setHasInitialGrade(true);
    await streamChat([], "grade");
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await streamChat(newMessages, "discuss");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const applyAISuggestion = () => {
    // Try to extract score from last assistant message
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant || !onSuggestScore) return;

    const scoreMatch = lastAssistant.content.match(/nota\s*(?:sugerida)?[:\s]*(\d+(?:[.,]\d+)?)/i);
    if (scoreMatch) {
      const score = parseFloat(scoreMatch[1].replace(",", "."));
      if (score >= 0 && score <= maxPoints) {
        onSuggestScore(score, lastAssistant.content.substring(0, 500));
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Tutor de IA</p>
            <p className="text-xs text-muted-foreground">Assistente de correção</p>
          </div>
        </div>
        {messages.length > 0 && onSuggestScore && (
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={applyAISuggestion}>
            <Sparkles className="h-3 w-3 mr-1" />
            Aplicar nota sugerida
          </Button>
        )}
      </div>

      {/* Context summary */}
      <div className="py-3 space-y-2">
        <div className="flex gap-2 flex-wrap">
          {aiScore !== null && (
            <Badge variant="outline" className="text-xs">
              <Bot className="h-3 w-3 mr-1" /> IA: {aiScore}/{maxPoints}
            </Badge>
          )}
          {teacherScore !== null && (
            <Badge variant="secondary" className="text-xs">
              Professor: {teacherScore}/{maxPoints}
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
        <div className="space-y-3 pr-2">
          {messages.length === 0 && !hasInitialGrade && (
            <div className="text-center py-6 space-y-3">
              <Bot className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Use o tutor de IA para avaliar esta resposta ou discutir os critérios de correção.
              </p>
              <Button onClick={handleInitialGrade} disabled={isLoading} size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Avaliar com IA
              </Button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {(hasInitialGrade || messages.length > 0) && (
        <div className="flex gap-2 pt-3 border-t mt-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Discuta a correção com o tutor..."
            className="min-h-[40px] max-h-[80px] resize-none text-sm"
            rows={1}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
