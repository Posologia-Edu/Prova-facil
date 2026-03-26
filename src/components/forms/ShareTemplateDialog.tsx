import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Trash2, UserPlus } from "lucide-react";

type ShareTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateTitle: string;
};

export default function ShareTemplateDialog({ open, onOpenChange, templateId, templateTitle }: ShareTemplateDialogProps) {
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const queryClient = useQueryClient();

  const { data: shares = [] } = useQuery({
    queryKey: ["template-shares", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_template_shares" as any)
        .select("id, shared_with, created_at")
        .eq("template_id", templateId);
      if (error) throw error;

      const userIds = (data || []).map((s: any) => s.shared_with);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      return (data || []).map((s: any) => ({
        ...s,
        name: profileMap.get(s.shared_with) || "Usuário",
      }));
    },
    enabled: open,
  });

  const handleShare = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;
    setSharing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ templateId, email: trimmedEmail }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || `Falha ao compartilhar (${response.status})`);
      }

      queryClient.invalidateQueries({ queryKey: ["template-shares", templateId] });
      toast({ title: "Template compartilhado!", description: `Compartilhado com ${trimmedEmail}` });
      setEmail("");
    } catch (err: any) {
      toast({
        title: "Erro ao compartilhar",
        description: err?.message || "Não foi possível compartilhar este template.",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    await supabase.from("form_template_shares" as any).delete().eq("id", shareId);
    queryClient.invalidateQueries({ queryKey: ["template-shares", templateId] });
    toast({ title: "Compartilhamento removido" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar Template
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Compartilhe <strong>"{templateTitle}"</strong> com outros professores por e-mail.
        </p>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="sr-only">E-mail do professor</Label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              type="email"
              onKeyDown={e => e.key === "Enter" && handleShare()}
            />
          </div>
          <Button onClick={handleShare} disabled={!email.trim() || sharing} size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            {sharing ? "..." : "Enviar"}
          </Button>
        </div>

        {shares.length > 0 && (
          <div className="space-y-2 mt-2">
            <Label className="text-xs text-muted-foreground">Compartilhado com:</Label>
            <ScrollArea className="max-h-40">
              {shares.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                  <div>
                    <span className="text-sm font-medium">{s.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleRevoke(s.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
