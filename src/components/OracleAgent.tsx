import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Você é o Oráculo do ProvaFácil — um assistente especialista que conhece profundamente todas as funcionalidades da plataforma. Seu papel é:

1. Entender a necessidade do usuário
2. Indicar a melhor ferramenta/módulo para resolver o problema
3. Ensinar passo a passo como usar essa ferramenta

MÓDULOS DA PLATAFORMA:

📝 BANCO DE QUESTÕES (/questoes)
- Crie questões de múltipla escolha, verdadeiro/falso, dissertativas e correspondência
- Use a IA para gerar questões automaticamente a partir de um tema
- Organize com tags e nível de dificuldade (Bloom)
- Acesse via menu lateral > "Questões"

📋 COMPOSITOR DE PROVAS (/compositor)
- Monte provas arrastando questões do banco
- Configure cabeçalho institucional personalizado
- Exporte em PDF profissional
- Publique online com código de acesso para alunos

🎓 TURMAS (/turmas)
- Cadastre turmas com nome, semestre e descrição
- Adicione alunos (nome + e-mail)
- Vincule provas online OU pacientes virtuais (exclusivo)
- Cada vínculo gera um PIN de acesso para alunos

🏥 PACIENTES VIRTUAIS (/pacientes-virtuais)
- 10 pacientes pré-configurados (5 Dor + 5 Inflamação)
- 3 encontros progressivos: anamnese → acompanhamento → ajustes + MAI
- O MAI agora suporta MÚLTIPLOS MEDICAMENTOS por paciente
- Correção automática por IA com rubrica de 0-10
- Modo individual ou em grupo (notas sincronizadas)

📊 ANALYTICS DE PACIENTES VIRTUAIS (/vp-analytics)
- Dashboard com histograma de notas da turma
- Radar de desempenho nos 5 critérios da rubrica
- Ranking de erros de segurança
- Correção em lote de toda a turma

🔬 OSCE (/osce)
- Crie estações clínicas com cenários, instruções e checklists
- Checklists dinâmicos: Binário, Likert, Pontuação com pesos
- Vincule avaliadores por e-mail a estações específicas
- Gere estações automaticamente com IA
- Circuitos com rodízio automático e timer

🔄 SIMULAÇÃO REALÍSTICA (/simulacoes)
- Salas com pares (farmacêutico/paciente)
- Rodadas com ciclos e distribuição automática de papéis
- Formulários customizáveis para avaliação

📝 SOAP (/soap)
- Documentação clínica estruturada
- Vincula com sala de simulação para continuidade
- Pares com avaliação cruzada

🔄 RECONCILIAÇÃO MEDICAMENTOSA (/reconciliacao)
- Casos clínicos para reconciliação
- Vincula com SOAP para fluxo completo
- Correção com IA

📄 DOCUMENTAÇÃO CLÍNICA (/documentacao-salas)
- Formulários personalizados
- Vincula com reconciliação para fluxo integrado
- Fluxo completo: Simulação → SOAP → Reconciliação → Documentação

🏪 MARKETPLACE (/marketplace)
- Compartilhe provas com a comunidade
- Baixe provas de outros professores
- Avalie e comente

🤖 TUTOR DE IA (no Editor de Provas)
- Auxilia na correção de questões dissertativas
- Chat contextual sobre a correção
- Correção em lote "Corrigir tudo com IA"
- Estatísticas por questão

📅 CALENDÁRIO (/calendario)
- Visualize datas de provas e atividades
- Organize o semestre

⚙️ CONFIGURAÇÕES (/configuracoes)
- Perfil, tema, idioma (PT/EN/ES)

💳 PLANOS (/planos)
- Gratuito: 5 questões e 1 prova/mês
- Premium (R$29,90/mês): acesso ilimitado com 7 dias grátis

🔗 PORTAL DO ALUNO (/student/auth)
- Acesso via PIN + e-mail
- Modo individual ou em grupo
- Detecção automática do tipo de atividade

REGRAS:
- Seja amigável, objetivo e didático
- Use emojis para tornar as respostas mais visuais
- Quando indicar um módulo, explique O QUE fazer e ONDE clicar
- Se não souber algo, diga honestamente
- Responda sempre em português
- Formate com markdown para melhor legibilidade`;

export function OracleAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("oracle-agent", {
        body: { messages: allMessages },
      });

      if (error) throw error;

      const reply = data?.reply || "Desculpe, não consegui processar sua pergunta.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      console.error("Oracle error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, houve um erro ao processar sua pergunta. Tente novamente.",
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

  // Smart positioning: detect if the button overlaps interactive elements
  const [buttonPosition, setButtonPosition] = useState<{ bottom: number; right: number }>({ bottom: 24, right: 24 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const checkOverlap = useCallback(() => {
    if (isOpen) return;
    
    const positions = [
      { bottom: 24, right: 24 },
      { bottom: 80, right: 24 },
      { bottom: 24, right: 80 },
      { bottom: 136, right: 24 },
    ];

    const btnSize = 56; // h-14 = 56px

    for (const pos of positions) {
      const btnCenterX = window.innerWidth - pos.right - btnSize / 2;
      const btnCenterY = window.innerHeight - pos.bottom - btnSize / 2;
      const btnRect = {
        left: btnCenterX - btnSize / 2,
        right: btnCenterX + btnSize / 2,
        top: btnCenterY - btnSize / 2,
        bottom: btnCenterY + btnSize / 2,
      };

      // Get all interactive elements at the button corners and center
      const testPoints = [
        [btnRect.left + 4, btnRect.top + 4],
        [btnRect.right - 4, btnRect.top + 4],
        [btnRect.left + 4, btnRect.bottom - 4],
        [btnRect.right - 4, btnRect.bottom - 4],
        [btnCenterX, btnCenterY],
      ];

      let hasOverlap = false;
      for (const [x, y] of testPoints) {
        const els = document.elementsFromPoint(x, y);
        for (const el of els) {
          if (buttonRef.current && (el === buttonRef.current || buttonRef.current.contains(el))) continue;
          const tag = el.tagName.toLowerCase();
          const isInteractive = tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea'
            || (el as HTMLElement).getAttribute('role') === 'button'
            || (el as HTMLElement).getAttribute('role') === 'menuitem'
            || el.closest('[data-sidebar]') !== null;
          if (isInteractive) {
            hasOverlap = true;
            break;
          }
        }
        if (hasOverlap) break;
      }

      if (!hasOverlap) {
        setButtonPosition(pos);
        return;
      }
    }
    // Fallback to higher position
    setButtonPosition({ bottom: 136, right: 24 });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    checkOverlap();
    const interval = setInterval(checkOverlap, 1000);
    window.addEventListener('resize', checkOverlap);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkOverlap);
    };
  }, [isOpen, checkOverlap]);

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(true)}
          style={{ bottom: buttonPosition.bottom, right: buttonPosition.right }}
          className="fixed z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center"
          title="Assistente ProvaFácil"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] rounded-xl border bg-card shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm">Oráculo ProvaFácil</h3>
                <p className="text-xs opacity-80">Seu guia na plataforma</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <Sparkles className="h-10 w-10 text-primary mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium text-foreground mb-1">Olá! Sou o Oráculo 👋</p>
                <p className="text-xs text-muted-foreground">
                  Posso te ajudar a encontrar e usar qualquer funcionalidade do ProvaFácil. O que você precisa fazer?
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
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
              placeholder="Pergunte sobre qualquer funcionalidade..."
              className="min-h-[36px] max-h-20 resize-none text-sm"
              rows={1}
            />
            <Button size="icon" onClick={sendMessage} disabled={isLoading || !input.trim()} className="shrink-0 h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
