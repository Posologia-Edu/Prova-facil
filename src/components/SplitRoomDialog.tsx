import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SplitRoomDialogProps {
  roomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface SubRoom {
  professorName: string;
  professorEmail: string;
  studentIds: string[];
}

export default function SplitRoomDialog({ roomId, open, onOpenChange, onComplete }: SplitRoomDialogProps) {
  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [numNewRooms, setNumNewRooms] = useState(1);
  const [subRooms, setSubRooms] = useState<SubRoom[]>([{ professorName: "", professorEmail: "", studentIds: [] }]);
  const [saving, setSaving] = useState(false);

  const students = participants.filter((p) => p.participant_role === "student");

  useEffect(() => {
    if (!open || !roomId) return;
    const load = async () => {
      const [{ data: roomData }, { data: parts }, { data: formsData }] = await Promise.all([
        supabase.from("simulation_rooms").select("*").eq("id", roomId).single(),
        supabase.from("simulation_participants").select("*").eq("room_id", roomId),
        supabase.from("simulation_forms").select("*").eq("room_id", roomId),
      ]);
      setRoom(roomData);
      setParticipants(parts || []);
      setForms(formsData || []);
    };
    load();
  }, [open, roomId]);

  useEffect(() => {
    setSubRooms(
      Array.from({ length: numNewRooms }, (_, i) => subRooms[i] || { professorName: "", professorEmail: "", studentIds: [] })
    );
  }, [numNewRooms]);

  const assignedStudentIds = subRooms.flatMap((sr) => sr.studentIds);
  const remainingStudents = students.filter((s) => !assignedStudentIds.includes(s.id));

  const toggleStudent = (subRoomIdx: number, studentId: string) => {
    setSubRooms((prev) => {
      const updated = [...prev];
      const sr = { ...updated[subRoomIdx] };
      sr.studentIds = sr.studentIds.includes(studentId)
        ? sr.studentIds.filter((id) => id !== studentId)
        : [...sr.studentIds, studentId];
      updated[subRoomIdx] = sr;
      return updated;
    });
  };

  const updateSubRoom = (idx: number, field: keyof SubRoom, value: string) => {
    setSubRooms((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const canSave = subRooms.every((sr) => sr.professorName.trim() && sr.studentIds.length > 0);

  const handleSplit = async () => {
    if (!room || !canSave) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      for (const sr of subRooms) {
        // Create new room
        const { data: newRoom, error: roomErr } = await supabase
          .from("simulation_rooms")
          .insert({
            user_id: session.user.id,
            title: `${room.title} — ${sr.professorName}`,
            description: room.description,
            duration_minutes: room.duration_minutes,
            status: "draft",
          })
          .select()
          .single();
        if (roomErr || !newRoom) throw roomErr;

        // Copy forms to new room
        for (const form of forms) {
          await supabase.from("simulation_forms").insert({
            room_id: newRoom.id,
            form_type: form.form_type,
            title: form.title,
            content_json: form.content_json,
          });
        }

        // Move selected students to new room
        for (const studentId of sr.studentIds) {
          await supabase
            .from("simulation_participants")
            .update({ room_id: newRoom.id })
            .eq("id", studentId);
        }

        // Add professor participant to new room
        await supabase.from("simulation_participants").insert({
          room_id: newRoom.id,
          student_name: sr.professorName,
          student_email: sr.professorEmail || "",
          participant_role: "professor",
          pair_index: -1,
          pair_position: "X",
        });
      }

      toast({ title: "Salas criadas com sucesso!" });
      onComplete();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha ao dividir sala.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dividir Sala — {room?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Quantidade de novas salas</Label>
            <Select value={String(numNewRooms)} onValueChange={(v) => setNumNewRooms(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            A sala original mantém seu PIN e os alunos não selecionados. Cada nova sala receberá um PIN próprio e cópias dos formulários.
          </div>

          {subRooms.map((sr, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Nova Sala {idx + 1}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome do Professor</Label>
                  <Input
                    value={sr.professorName}
                    onChange={(e) => updateSubRoom(idx, "professorName", e.target.value)}
                    placeholder="Prof. Silva"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email do Professor</Label>
                  <Input
                    value={sr.professorEmail}
                    onChange={(e) => updateSubRoom(idx, "professorEmail", e.target.value)}
                    placeholder="professor@email.com"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Alunos ({sr.studentIds.length} selecionados)</Label>
                <div className="grid grid-cols-2 gap-1 mt-1 max-h-40 overflow-y-auto">
                  {students.map((s) => {
                    const assignedElsewhere = assignedStudentIds.includes(s.id) && !sr.studentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 p-1.5 rounded text-sm cursor-pointer hover:bg-muted ${assignedElsewhere ? "opacity-40 pointer-events-none" : ""}`}
                      >
                        <Checkbox
                          checked={sr.studentIds.includes(s.id)}
                          onCheckedChange={() => toggleStudent(idx, s.id)}
                          disabled={assignedElsewhere}
                        />
                        {s.student_name}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {remainingStudents.length > 0 && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              {remainingStudents.length} aluno(s) permanecerão na sala original
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSplit} disabled={!canSave || saving}>
            {saving ? "Criando..." : `Criar ${numNewRooms} nova(s) sala(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}