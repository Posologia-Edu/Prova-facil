import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GenericSplitRoomDialogProps {
  roomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  tablePrefix: string; // e.g. "nursing", "soap", "reconciliation", "documentation", "nutrition", "dentistry", "medicine", "physiotherapy", "biomedicine", "simulation"
}

interface SubRoom {
  professorName: string;
  professorEmail: string;
  studentIds: string[];
}

export default function GenericSplitRoomDialog({ roomId, open, onOpenChange, onComplete, tablePrefix }: GenericSplitRoomDialogProps) {
  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [numNewRooms, setNumNewRooms] = useState(2);
  const [subRooms, setSubRooms] = useState<SubRoom[]>([
    { professorName: "", professorEmail: "", studentIds: [] },
    { professorName: "", professorEmail: "", studentIds: [] },
  ]);
  const [saving, setSaving] = useState(false);

  const roomsTable = `${tablePrefix}_rooms` as any;
  const participantsTable = `${tablePrefix}_participants` as any;
  const formsTable = `${tablePrefix}_forms` as any;
  const casesTable = `${tablePrefix}_clinical_cases` as any;

  const students = participants.filter((p) => p.participant_role === "student");

  useEffect(() => {
    if (!open || !roomId) return;
    const load = async () => {
      const [{ data: roomData }, { data: parts }, { data: formsData }] = await Promise.all([
        supabase.from(roomsTable).select("*").eq("id", roomId).single(),
        supabase.from(participantsTable).select("*").eq("room_id", roomId),
        supabase.from(formsTable).select("*").eq("room_id", roomId),
      ]);
      setRoom(roomData);
      setParticipants(parts || []);
      setForms(formsData || []);
    };
    load();
  }, [open, roomId]);

  useEffect(() => {
    setSubRooms((prev) =>
      Array.from({ length: numNewRooms }, (_, i) => prev[i] || { professorName: "", professorEmail: "", studentIds: [] })
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

  const canSave = subRooms.every((sr) => sr.professorName.trim() && sr.studentIds.length > 0) && remainingStudents.length === 0;

  const handleSplit = async () => {
    if (!room || !canSave) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Load clinical cases
      const { data: cases } = await supabase.from(casesTable).select("*").eq("room_id", roomId);

      for (const sr of subRooms) {
        // Build insert object dynamically
        const roomInsert: any = {
          user_id: session.user.id,
          title: `${room.title} — ${sr.professorName}`,
          description: room.description,
          status: "draft",
        };
        // Copy module_type if exists
        if (room.module_type) roomInsert.module_type = room.module_type;
        // Copy duration if exists
        if (room.duration_minutes !== undefined) roomInsert.duration_minutes = room.duration_minutes;

        const { data: newRoom, error: roomErr } = await supabase
          .from(roomsTable)
          .insert(roomInsert)
          .select()
          .single();
        if (roomErr || !newRoom) throw roomErr;

        // Copy forms
        for (const form of forms) {
          const formInsert: any = {
            room_id: newRoom.id,
            title: form.title,
            content_json: form.content_json,
          };
          if (form.form_type !== undefined) formInsert.form_type = form.form_type;
          await supabase.from(formsTable).insert(formInsert);
        }

        // Copy clinical cases
        if (cases?.length) {
          for (const c of cases) {
            await supabase.from(casesTable).insert({
              room_id: newRoom.id,
              title: c.title,
              content: c.content,
              position: c.position,
            });
          }
        }

        // Move selected students to new room
        for (const studentId of sr.studentIds) {
          await supabase
            .from(participantsTable)
            .update({ room_id: newRoom.id, status: "waiting", pair_index: -1, pair_position: "X" })
            .eq("id", studentId);
        }

        // Add professor participant
        await supabase.from(participantsTable).insert({
          room_id: newRoom.id,
          student_name: sr.professorName,
          student_email: sr.professorEmail || "",
          participant_role: "professor",
          pair_index: -1,
          pair_position: "X",
        });
      }

      // Delete original room data
      await supabase.from(formsTable).delete().eq("room_id", roomId);
      await supabase.from(participantsTable).delete().eq("room_id", roomId);
      if (cases?.length) {
        await supabase.from(casesTable).delete().eq("room_id", roomId);
      }
      await supabase.from(roomsTable).delete().eq("id", roomId);

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
            <Label>Quantidade de salas finais</Label>
            <Select value={String(numNewRooms)} onValueChange={(v) => setNumNewRooms(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            A sala original será removida após a divisão. Cada sala nova receberá um PIN próprio e cópias dos formulários.
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
              Selecione todos os alunos antes de concluir ({remainingStudents.length} restante(s))
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSplit} disabled={!canSave || saving}>
            {saving ? "Criando..." : `Criar ${numNewRooms} sala(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
