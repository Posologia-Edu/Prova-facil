import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ParticipantEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  onSave: (name: string, email: string) => void;
}

export default function ParticipantEditDialog({ open, onOpenChange, name, email, onSave }: ParticipantEditDialogProps) {
  const [editName, setEditName] = useState(name);
  const [editEmail, setEditEmail] = useState(email);

  const handleSave = () => {
    if (!editName.trim()) return;
    onSave(editName.trim(), editEmail.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Aluno</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={!editName.trim()} className="w-full">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
