import { useState } from "react";
import {
  Plus,
  GripVertical,
  Settings2,
  FileDown,
  Shuffle,
  Trash2,
  CheckCircle2,
  HelpCircle,
  AlignLeft,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface BankQuestion {
  id: string;
  type: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
}

interface ExamQuestion {
  id: string;
  questionId: string;
  title: string;
  type: string;
  points: number;
}

interface Section {
  id: string;
  name: string;
  questions: ExamQuestion[];
  collapsed: boolean;
}

const bankQuestions: BankQuestion[] = [
  { id: "1", type: "multiple_choice", title: "What is the primary mechanism of action of ACE inhibitors?", difficulty: "medium", tags: ["Pharmacology"] },
  { id: "2", type: "true_false", title: "Aspirin irreversibly inhibits COX-1 and COX-2.", difficulty: "easy", tags: ["NSAIDs"] },
  { id: "3", type: "open_ended", title: "Explain pharmacokinetic differences between warfarin and heparin.", difficulty: "hard", tags: ["Anticoagulants"] },
  { id: "4", type: "matching", title: "Match drug classes with their side effects.", difficulty: "medium", tags: ["Side Effects"] },
  { id: "5", type: "multiple_choice", title: "Which neurotransmitter is primarily affected by SSRIs?", difficulty: "easy", tags: ["CNS"] },
  { id: "6", type: "open_ended", title: "Discuss the P450 enzyme system in drug metabolism.", difficulty: "hard", tags: ["Metabolism"] },
];

const typeIcons: Record<string, React.ReactNode> = {
  multiple_choice: <CheckCircle2 className="h-3.5 w-3.5" />,
  true_false: <HelpCircle className="h-3.5 w-3.5" />,
  open_ended: <AlignLeft className="h-3.5 w-3.5" />,
  matching: <ArrowLeftRight className="h-3.5 w-3.5" />,
};

export default function ComposerPage() {
  const [examTitle, setExamTitle] = useState("Pharmacology 101 - Midterm Exam");
  const [sections, setSections] = useState<Section[]>([
    {
      id: "s1",
      name: "Part I: Multiple Choice",
      collapsed: false,
      questions: [
        { id: "eq1", questionId: "1", title: "What is the primary mechanism of action of ACE inhibitors?", type: "multiple_choice", points: 2 },
        { id: "eq2", questionId: "5", title: "Which neurotransmitter is primarily affected by SSRIs?", type: "multiple_choice", points: 2 },
      ],
    },
    {
      id: "s2",
      name: "Part II: Case Studies",
      collapsed: false,
      questions: [
        { id: "eq3", questionId: "3", title: "Explain pharmacokinetic differences between warfarin and heparin.", type: "open_ended", points: 5 },
      ],
    },
  ]);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [institutionName, setInstitutionName] = useState("University of Health Sciences");
  const [teacherName, setTeacherName] = useState("Dr. Maria Santos");
  const [examDate, setExamDate] = useState("2026-03-15");
  const [instructions, setInstructions] = useState("Answer all questions. Show your work for partial credit. Time allowed: 90 minutes.");

  const addQuestionToSection = (sectionId: string, question: BankQuestion) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: [
                ...s.questions,
                {
                  id: `eq-${Date.now()}`,
                  questionId: question.id,
                  title: question.title,
                  type: question.type,
                  points: 1,
                },
              ],
            }
          : s
      )
    );
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
          : s
      )
    );
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, name: `Part ${prev.length + 1}`, collapsed: false, questions: [] },
    ]);
  };

  const toggleSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  const totalPoints = sections.reduce(
    (sum, s) => sum + s.questions.reduce((qsum, q) => qsum + q.points, 0),
    0
  );
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left: Question Bank Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Question Bank</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Click to add to exam</p>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {bankQuestions.map((q) => (
            <Card
              key={q.id}
              className="p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
              onClick={() => {
                if (sections.length > 0) addQuestionToSection(sections[0].id, q);
              }}
            >
              <div className="flex items-start gap-2">
                <div className="text-muted-foreground mt-0.5">{typeIcons[q.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug line-clamp-2">{q.title}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge variant={q.difficulty} className="text-[10px] px-1.5 py-0">
                      {q.difficulty}
                    </Badge>
                    {q.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Right: Exam Canvas */}
      <div className="flex-1 flex flex-col bg-muted/50 overflow-auto">
        {/* Toolbar */}
        <div className="px-6 py-3 border-b bg-card flex items-center gap-3 shrink-0">
          <div className="flex-1">
            <Input
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="text-lg font-bold border-0 bg-transparent px-0 h-auto focus-visible:ring-0 shadow-none"
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalQuestions} questions · {totalPoints} points total
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Section
          </Button>
          <Button variant="outline" size="sm">
            <Shuffle className="h-3.5 w-3.5 mr-1.5" />
            Shuffle
          </Button>
          <Sheet open={headerOpen} onOpenChange={setHeaderOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                Header
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Exam Header Configuration</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Institution Name</Label>
                  <Input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Teacher Name</Label>
                  <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Exam Date</Label>
                  <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Instructions</Label>
                  <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Button size="sm">
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>

        {/* A4 Paper Preview */}
        <div className="flex-1 overflow-auto p-8 flex justify-center">
          <div className="w-[210mm] min-h-[297mm] exam-paper-bg shadow-xl rounded-sm border p-12 font-exam text-sm leading-relaxed">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-base font-bold uppercase tracking-wide">{institutionName}</h2>
              <Separator className="my-3 bg-foreground/20" />
              <h3 className="text-lg font-bold mt-2">{examTitle}</h3>
              <div className="flex justify-between text-xs mt-3 text-muted-foreground">
                <span>Professor: {teacherName}</span>
                <span>Date: {new Date(examDate).toLocaleDateString()}</span>
              </div>
              <div className="mt-3 border-b border-dashed pb-2">
                <p className="text-xs">Student Name: ________________________________________ ID: _______________</p>
              </div>
              {instructions && (
                <p className="text-xs italic mt-3 text-muted-foreground text-left">
                  <strong>Instructions:</strong> {instructions}
                </p>
              )}
            </div>

            {/* Sections */}
            {sections.map((section, si) => (
              <div key={section.id} className="mb-6">
                <div
                  className="flex items-center gap-2 cursor-pointer select-none mb-3"
                  onClick={() => toggleSection(section.id)}
                >
                  {section.collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <h4 className="font-bold text-sm uppercase tracking-wider">{section.name}</h4>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {section.questions.reduce((s, q) => s + q.points, 0)} pts
                  </span>
                </div>
                {!section.collapsed && (
                  <div className="space-y-4 pl-2">
                    {section.questions.map((q, qi) => (
                      <div key={q.id} className="flex items-start gap-2 group">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab transition-opacity" />
                        <span className="font-semibold text-xs min-w-[24px]">{qi + 1}.</span>
                        <div className="flex-1">
                          <p className="text-sm">{q.title}</p>
                          {q.type === "multiple_choice" && (
                            <div className="mt-2 space-y-1 pl-4 text-xs text-muted-foreground">
                              <p>a) ________________________</p>
                              <p>b) ________________________</p>
                              <p>c) ________________________</p>
                              <p>d) ________________________</p>
                            </div>
                          )}
                          {q.type === "true_false" && (
                            <p className="mt-2 pl-4 text-xs text-muted-foreground">( ) True &nbsp;&nbsp; ( ) False</p>
                          )}
                          {q.type === "open_ended" && (
                            <div className="mt-2 border-b border-dashed" style={{ height: "60px" }} />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">[{q.points} pts]</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => removeQuestion(section.id, q.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {section.questions.length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-4 text-center">
                        Click questions from the bank to add them here
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {sections.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-medium">No sections yet</p>
                <p className="text-xs mt-1">Add a section to start building your exam.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
