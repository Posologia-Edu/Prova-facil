import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, ArrowLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  "Problema técnico",
  "Sugestão de melhoria",
  "Dúvida",
  "Parceria",
  "Outro",
];

const subjects = [
  "Banco de Questões",
  "Compositor de Provas",
  "Correção Automática",
  "Login / Conta",
  "Assinatura / Pagamento",
  "Outro",
];

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim() || !category) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Informe um email válido.");
      return;
    }

    if (message.trim().length > 2000) {
      toast.error("A mensagem deve ter no máximo 2000 caracteres.");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact", {
        body: {
          name: name.trim(),
          email: email.trim(),
          institution: institution.trim(),
          message: message.trim(),
          category,
          subject,
        },
      });

      if (error) throw error;

      toast.success("Mensagem enviada com sucesso! Responderemos em breve.");
      setName("");
      setEmail("");
      setInstitution("");
      setMessage("");
      setCategory("");
      setSubject("");
    } catch (err: any) {
      console.error("Contact form error:", err);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
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

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Contato
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            Use este canal para comunicar problemas, sugestões, dentre outros.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Nome, Instituição, Email */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Instituição/Projeto</Label>
              <Input
                id="institution"
                placeholder="Ex: UFMG"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
              />
            </div>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              placeholder="Descreva sua mensagem aqui..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
          </div>

          {/* Row 2: Categoria, Assunto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma opção" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma opção" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit */}
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
