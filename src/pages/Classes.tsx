import { useState } from "react";
import {
  GraduationCap,
  Plus,
  Users,
  MoreHorizontal,
  BookOpen,
  Pencil,
  Copy,
  Trash2,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ClassItem {
  id: string;
  name: string;
  semester: string;
  description: string;
  studentCount: number;
  examCount: number;
}

const mockClasses: ClassItem[] = [
  { id: "1", name: "Farmacologia 101", semester: "1º Sem. 2026", description: "Introdução aos mecanismos de ação dos fármacos e aplicações terapêuticas.", studentCount: 45, examCount: 3 },
  { id: "2", name: "Bioquímica II", semester: "1º Sem. 2026", description: "Bioquímica avançada abrangendo metabolismo e biologia molecular.", studentCount: 38, examCount: 2 },
  { id: "3", name: "Anatomia Humana", semester: "1º Sem. 2026", description: "Estudo abrangente dos sistemas do corpo humano.", studentCount: 52, examCount: 4 },
  { id: "4", name: "Fisiopatologia", semester: "2º Sem. 2025", description: "Mecanismos de doenças e correlações clínicas.", studentCount: 40, examCount: 5 },
];

export default function ClassesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>(mockClasses);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state for new class
  const [newName, setNewName] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleCreateClass = () => {
    if (!newName.trim()) {
      toast.error("Informe o nome da turma.");
      return;
    }
    const newClass: ClassItem = {
      id: `cls-${Date.now()}`,
      name: newName.trim(),
      semester: newSemester.trim(),
      description: newDescription.trim(),
      studentCount: 0,
      examCount: 0,
    };
    setClasses((prev) => [...prev, newClass]);
    setNewName("");
    setNewSemester("");
    setNewDescription("");
    setCreateOpen(false);
    toast.success("Turma criada com sucesso!");
  };

  const handleDeleteClass = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setDeleteId(null);
    toast.success("Turma movida para a lixeira.");
  };

  const handleDuplicateClass = (cls: ClassItem) => {
    const duplicate: ClassItem = {
      ...cls,
      id: `dup-${Date.now()}`,
      name: `${cls.name} (cópia)`,
    };
    setClasses((prev) => [...prev, duplicate]);
    toast.success("Turma duplicada.");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Turmas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas turmas e listas de alunos.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) { setNewName(""); setNewSemester(""); setNewDescription(""); }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Turma</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome da Turma *</Label>
                <Input placeholder="Ex: Farmacologia 101" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Semestre</Label>
                <Input placeholder="Ex: 1º Sem. 2026" value={newSemester} onChange={(e) => setNewSemester(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea placeholder="Breve descrição..." rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateClass}>Criar Turma</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <Card key={cls.id} className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <UserCog className="h-4 w-4 mr-2" />
                      Gerenciar Alunos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicateClass(cls)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(cls.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="font-semibold mt-3">{cls.name}</h3>
              <Badge variant="outline" className="mt-1 text-[11px]">{cls.semester}</Badge>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{cls.description}</p>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {cls.studentCount} alunos
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  {cls.examCount} provas
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma será movida para a lixeira. Você poderá restaurá-la em até 30 dias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && handleDeleteClass(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
