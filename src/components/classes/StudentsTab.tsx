import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Upload, Search, Trash2, Loader2, Download, KeyRound } from "lucide-react";
import { toast } from "sonner";

export interface SemesterStudent {
  id: string;
  student_name: string;
  student_email: string | null;
  student_registration: string | null;
}

interface Props {
  classId: string;
  semesterId: string;
  onChanged?: () => void;
}

export function StudentsTab({ classId, semesterId, onChanged }: Props) {
  const [students, setStudents] = useState<SemesterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reg, setReg] = useState("");
  const [batch, setBatch] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("class_students")
      .select("id, student_name, student_email, student_registration")
      .eq("semester_id", semesterId)
      .order("student_name");
    setStudents((data as SemesterStudent[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [semesterId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      s.student_name.toLowerCase().includes(q) ||
      (s.student_email || "").toLowerCase().includes(q) ||
      (s.student_registration || "").toLowerCase().includes(q)
    );
  }, [students, query]);

  async function addSingle() {
    if (!name.trim()) return toast.error("Informe o nome do aluno.");
    setBusy(true);
    const { error } = await supabase.from("class_students").insert({
      class_id: classId,
      semester_id: semesterId,
      student_name: name.trim(),
      student_email: email.trim() || null,
      student_registration: reg.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error("Erro ao adicionar.");
    setName(""); setEmail(""); setReg("");
    toast.success("Aluno adicionado.");
    load(); onChanged?.();
  }

  async function addBatch() {
    if (!batch.trim()) return toast.error("Cole os dados dos alunos.");
    setBusy(true);
    const inserts = batch.trim().split("\n").filter(l => l.trim()).map(line => {
      const parts = line.includes(";") ? line.split(";") : line.split("\t");
      return {
        class_id: classId,
        semester_id: semesterId,
        student_name: (parts[0] || "").trim(),
        student_email: (parts[1] || "").trim() || null,
        student_registration: (parts[2] || "").trim() || null,
      };
    }).filter(s => s.student_name);
    if (!inserts.length) { setBusy(false); return toast.error("Nenhum nome válido."); }
    const { error } = await supabase.from("class_students").insert(inserts);
    setBusy(false);
    if (error) return toast.error("Erro ao importar.");
    setBatch("");
    toast.success(`${inserts.length} aluno(s) importado(s).`);
    setAddOpen(false);
    load(); onChanged?.();
  }

  async function remove(id: string) {
    await supabase.from("class_students").delete().eq("id", id);
    toast.success("Aluno removido.");
    load(); onChanged?.();
  }

  async function sendPins(regenerate: boolean) {
    if (!students.length) return;
    if (regenerate && !confirm("Regenerar todos os PINs? Os PINs anteriores deixarão de funcionar.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("checkin-send-pins", { body: { semesterId, regenerate } });
    setBusy(false);
    if (error) return toast.error("Erro ao enviar PINs.");
    if (data?.canEmail === false) {
      toast.warning(`${data.generated} PIN(s) gerados. E-mail não configurado — baixe a lista.`);
      const csv = ["Nome,Email,PIN", ...data.results.filter((r: {pin?: string}) => r.pin).map((r: {name: string; email: string; pin: string}) => `"${r.name}","${r.email}","${r.pin}"`)].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "pins-alunos.csv"; a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.success(`${data.sent} PIN(s) enviados por e-mail. ${data.skipped ? `${data.skipped} sem e-mail.` : ""}`);
    }
    load();
  }



  function exportCsv() {
    const rows = [["Nome", "Email", "Matrícula"], ...students.map(s => [s.student_name, s.student_email || "", s.student_registration || ""])];
    const csv = rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `alunos-semestre.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function initials(n: string) {
    return n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aluno..." className="pl-8" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!students.length}>
            <Download className="h-4 w-4 mr-1" />Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => sendPins(false)} disabled={!students.length || busy}>
            <KeyRound className="h-4 w-4 mr-1" />Enviar PINs
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />Adicionar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : students.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
          <p className="font-semibold">Nenhum aluno neste semestre</p>
          <p className="text-sm text-muted-foreground">Adicione individualmente ou cole uma lista.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="w-32">Matrícula</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {initials(s.student_name)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{s.student_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.student_email || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{s.student_registration || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">Nenhum resultado para "{query}"</div>
          )}
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Adicionar alunos</DialogTitle></DialogHeader>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "batch")}>
            <TabsList className="w-full">
              <TabsTrigger value="single" className="flex-1"><UserPlus className="h-4 w-4 mr-1" />Individual</TabsTrigger>
              <TabsTrigger value="batch" className="flex-1"><Upload className="h-4 w-4 mr-1" />Em lote</TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="space-y-3 pt-3">
              <div className="space-y-1.5"><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>E-mail</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Matrícula</Label><Input value={reg} onChange={e => setReg(e.target.value)} /></div>
              </div>
              <Button onClick={addSingle} disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}Adicionar
              </Button>
            </TabsContent>
            <TabsContent value="batch" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">Um aluno por linha: <code>Nome; E-mail; Matrícula</code></p>
              <Textarea rows={8} value={batch} onChange={e => setBatch(e.target.value)} className="font-mono text-xs" placeholder="Maria Silva; maria@email.com; 2025001" />
              <Button onClick={addBatch} disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}Importar {batch.trim().split("\n").filter(l => l.trim()).length}
              </Button>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Badge variant="outline">{students.length} alunos no semestre</Badge>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
