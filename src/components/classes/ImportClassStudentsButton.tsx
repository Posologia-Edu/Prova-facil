import { useState } from "react";
import { Loader2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { linkActivityToClass, type ClassActivityType } from "@/lib/class-activities";
import { cn } from "@/lib/utils";

interface ClassOption {
  id: string;
  name: string;
  semester: string | null;
}

interface ImportClassStudentsButtonProps {
  /** tipo da atividade, para ligar a sala à turma ao importar */
  type: ClassActivityType;
  roomId: string;
  /** tabela de participantes da sala (simulation_participants, soap_participants, nursing_participants…) */
  participantsTable: string;
  /** e-mails que já estão na sala; esses alunos não são duplicados */
  existingEmails: (string | null | undefined)[];
  onDone: () => void;
}

// Traz os alunos de uma turma para a sala com um clique e liga a sala à turma (aba Atividades).
// Usa os alunos do semestre ativo da turma; sem semestre ativo, usa todos.
export function ImportClassStudentsButton({ type, roomId, participantsTable, existingEmails, onDone }: ImportClassStudentsButtonProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [classId, setClassId] = useState<string | null>(null);

  const openDialog = async () => {
    setOpen(true);
    setClassId(null);
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { data } = await supabase
        .from("classes")
        .select("id, name, semester")
        .eq("user_id", user.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      setClasses((data as ClassOption[]) || []);
    }
    setLoading(false);
  };

  const importStudents = async () => {
    if (!classId) return;
    setImporting(true);
    try {
      const { data: semester } = await supabase
        .from("class_semesters")
        .select("id")
        .eq("class_id", classId)
        .eq("is_active", true)
        .maybeSingle();

      let query = supabase.from("class_students").select("student_name, student_email").eq("class_id", classId).order("student_name");
      if (semester?.id) query = query.eq("semester_id", semester.id);
      const { data: students, error } = await query;
      if (error) throw error;

      const known = new Set(existingEmails.filter(Boolean).map((e) => String(e).trim().toLowerCase()));
      const fresh = (students || []).filter((s) => {
        const email = s.student_email?.trim().toLowerCase();
        return !email || !known.has(email);
      });
      if (fresh.length === 0) {
        toast.info("Todos os alunos desta turma já estão na sala.");
        setOpen(false);
        return;
      }

      const rows = fresh.map((s) => ({
        room_id: roomId,
        student_name: s.student_name,
        student_email: s.student_email ?? "",
        pair_index: -1,
        pair_position: "X",
        participant_role: "student",
      }));
      const { error: insertError } = await (supabase as any).from(participantsTable).insert(rows);
      if (insertError) throw insertError;

      // O vínculo é criado junto; se já existia, o erro de duplicidade é ignorado.
      await linkActivityToClass(classId, type, roomId);
      toast.success(`${fresh.length} ${fresh.length === 1 ? "aluno importado" : "alunos importados"} da turma.`);
      setOpen(false);
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao importar alunos da turma.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <UsersRound className="mr-1 h-4 w-4" />Importar da turma
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Importar alunos da turma</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Os alunos entram na sala e a sala fica vinculada à turma. Quem já está na sala não é repetido.</p>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : classes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Você ainda não tem turmas.</p>
          ) : (
            <div className="space-y-2">
              {classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClassId(c.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50",
                    classId === c.id && "border-primary bg-brand-soft",
                  )}
                >
                  <span className="font-medium">{c.name}</span>
                  {c.semester && <span className="text-xs text-muted-foreground">{c.semester}</span>}
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={importStudents} disabled={!classId || importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Importar alunos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
