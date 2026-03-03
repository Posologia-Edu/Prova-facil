import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, ArrowLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Contact() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, institution")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile) {
          setUserName(profile.full_name || "");
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error("Preencha o assunto e a mensagem.");
      return;
    }

    if (message.trim().length > 2000) {
      toast.error("A mensagem deve ter no máximo 2000 caracteres.");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact", {
        body: {
          name: userName.trim(),
          email: userEmail.trim(),
          message: message.trim(),
          category: "Contato",
          subject: subject.trim(),
        },
      });

      if (error) throw error;

      toast.success("Mensagem enviada com sucesso! Responderemos em breve.");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      console.error("Contact form error:", err);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-secondary" />
            <span className="text-xl font-bold text-foreground">ProvaFácil</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Fale Conosco
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            Envie sua mensagem e responderemos o mais breve possível.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Remetente</Label>
              <Input value={userName} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={userEmail} disabled className="bg-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              placeholder="Sobre o que deseja falar?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              placeholder="Descreva sua mensagem aqui..."
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" disabled={sending} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
