import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Share2, UserPlus } from "lucide-react";

type ShareRoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomTitle: string;
  moduleType: string;
};

export default function ShareRoomDialog({ open, onOpenChange, roomId, roomTitle, moduleType }: ShareRoomDialogProps) {
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;
    setSharing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ roomId, email: trimmedEmail, moduleType }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || `Falha ao enviar (${response.status})`);
      }

      toast({ title: "Sala enviada!", description: `Cópia enviada para ${trimmedEmail}` });
      setEmail("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err?.message || "Não foi possível enviar a sala.",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Enviar Sala para Professor
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Enviar uma cópia de <strong>"{roomTitle}"</strong> (com formulários e alunos) para outro professor cadastrado.
        </p>
        <p className="text-xs text-muted-foreground">
          O professor receberá a sala em modo rascunho e poderá editar livremente.
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
      </DialogContent>
    </Dialog>
  );
}
