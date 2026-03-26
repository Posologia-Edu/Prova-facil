import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExamOption { id: string; title: string; }
interface ClassOption { id: string; name: string; }

export default function LmsIntegration() {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [exportFormat, setExportFormat] = useState("moodle-csv");
  const [exporting, setExporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState("moodle-xml");
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  useEffect(() => { loadOptions(); }, []);

  const loadOptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [exRes, clRes] = await Promise.all([
      supabase.from("exams").select("id, title").eq("user_id", user.id).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").eq("user_id", user.id).is("deleted_at", null),
    ]);
    setExams((exRes.data || []) as ExamOption[]);
    setClasses((clRes.data || []) as ClassOption[]);
  };

  const handleExport = async () => {
    if (!selectedExam) { toast.error("Selecione uma prova"); return; }
    setExporting(true);

    try {
      const { data: pub } = await supabase.from("exam_publications").select("id").eq("exam_id", selectedExam).limit(1).maybeSingle();
      if (!pub) { toast.error("Prova não publicada"); setExporting(false); return; }

      const { data: sessions } = await supabase.from("exam_sessions").select("student_email, student_name, total_score, max_score, status").eq("publication_id", pub.id);

      let content = "";
      let filename = "";
      const rows = sessions || [];

      if (exportFormat === "moodle-csv") {
        content = "Email,Nome,Nota,Nota Máxima,Status\n" + rows.map(r => `${r.student_email},${r.student_name},${r.total_score || 0},${r.max_score || 0},${r.status}`).join("\n");
        filename = "notas_moodle.csv";
      } else if (exportFormat === "canvas-csv") {
        content = "Student,ID,SIS User ID,SIS Login ID,Section,Assignment\n" + rows.map(r => `${r.student_name},${r.student_email},,${r.student_email},,${r.total_score || 0}`).join("\n");
        filename = "notas_canvas.csv";
      } else if (exportFormat === "google-csv") {
        content = "Email Address,Grade\n" + rows.map(r => `${r.student_email},${r.total_score || 0}`).join("\n");
        filename = "notas_classroom.csv";
      }

      const blob = new Blob([content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("Exportação concluída!");
    } catch (e) { toast.error("Erro na exportação"); }
    setExporting(false);
  };

  const handleImportPreview = () => {
    if (!importText.trim()) { toast.error("Cole o conteúdo do arquivo"); return; }

    try {
      let questions: any[] = [];
      if (importFormat === "moodle-xml") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(importText, "text/xml");
        const qNodes = doc.querySelectorAll("question");
        qNodes.forEach(q => {
          const type = q.getAttribute("type");
          if (type === "multichoice" || type === "truefalse" || type === "essay") {
            const name = q.querySelector("name text")?.textContent || "";
            const text = q.querySelector("questiontext text")?.textContent || "";
            questions.push({ type, name, text: text.substring(0, 200) });
          }
        });
      } else if (importFormat === "qti") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(importText, "text/xml");
        const items = doc.querySelectorAll("item, assessmentItem");
        items.forEach(item => {
          const title = item.getAttribute("title") || item.getAttribute("ident") || "";
          questions.push({ type: "qti", name: title, text: title });
        });
      } else if (importFormat === "csv") {
        const lines = importText.trim().split("\n");
        lines.slice(1).forEach(line => {
          const cols = line.split(",");
          questions.push({ type: "csv", name: cols[0] || "", text: cols[1] || "" });
        });
      }

      setImportPreview(questions);
      if (questions.length === 0) toast.warning("Nenhuma questão encontrada no arquivo");
      else toast.success(`${questions.length} questões encontradas`);
    } catch { toast.error("Erro ao processar arquivo"); }
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }

    let imported = 0;
    for (const q of importPreview) {
      const { error } = await supabase.from("question_bank").insert({
        user_id: user.id,
        type: q.type === "multichoice" ? "multiple_choice" : q.type === "essay" ? "essay" : "multiple_choice",
        content_json: { statement: q.text || q.name, options: [], correctIndex: 0 },
        tags: ["importado-lms"],
      });
      if (!error) imported++;
    }
    toast.success(`${imported} questões importadas com sucesso!`);
    setImportPreview([]);
    setImportText("");
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Integração LMS</h1>
        <p className="text-muted-foreground">Exporte notas e importe questões de plataformas como Moodle, Canvas e Google Classroom</p>
      </div>

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export"><Download className="h-4 w-4 mr-2" /> Exportar</TabsTrigger>
          <TabsTrigger value="import"><Upload className="h-4 w-4 mr-2" /> Importar</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Exportar Notas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Prova</label>
                  <Select value={selectedExam} onValueChange={setSelectedExam}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Formato</label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moodle-csv">Moodle (CSV)</SelectItem>
                      <SelectItem value="canvas-csv">Canvas (CSV)</SelectItem>
                      <SelectItem value="google-csv">Google Classroom (CSV)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleExport} disabled={exporting} className="w-full">
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    Exportar
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge variant="outline">Moodle</Badge>
                <Badge variant="outline">Canvas</Badge>
                <Badge variant="outline">Google Classroom</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Importar Questões</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Formato</label>
                <Select value={importFormat} onValueChange={setImportFormat}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moodle-xml">Moodle XML</SelectItem>
                    <SelectItem value="qti">QTI (IMS)</SelectItem>
                    <SelectItem value="csv">CSV Genérico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Cole o conteúdo do arquivo aqui..." value={importText} onChange={e => setImportText(e.target.value)} rows={10} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleImportPreview}>Preview</Button>
                {importPreview.length > 0 && (
                  <Button onClick={handleImportConfirm} disabled={importing}>
                    {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Importar {importPreview.length} questões
                  </Button>
                )}
              </div>

              {importPreview.length > 0 && (
                <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-auto">
                  {importPreview.map((q, i) => (
                    <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                      <span className="font-medium">#{i + 1}</span> — {q.name || q.text}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
