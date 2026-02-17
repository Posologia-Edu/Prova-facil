import { useState } from "react";
import {
  Library,
  Plus,
  Search,
  Filter,
  GripVertical,
  MoreHorizontal,
  CheckCircle2,
  HelpCircle,
  AlignLeft,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "open_ended" | "matching";
  title: string;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  bloom_level: string;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  multiple_choice: <CheckCircle2 className="h-4 w-4" />,
  true_false: <HelpCircle className="h-4 w-4" />,
  open_ended: <AlignLeft className="h-4 w-4" />,
  matching: <ArrowLeftRight className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True/False",
  open_ended: "Open Ended",
  matching: "Matching",
};

// Mock data for demo
const mockQuestions: Question[] = [
  { id: "1", type: "multiple_choice", title: "What is the primary mechanism of action of ACE inhibitors?", tags: ["Pharmacology", "Cardiovascular"], difficulty: "medium", bloom_level: "Understanding", created_at: "2026-02-15" },
  { id: "2", type: "true_false", title: "Aspirin irreversibly inhibits COX-1 and COX-2 enzymes.", tags: ["Pharmacology", "NSAIDs"], difficulty: "easy", bloom_level: "Remembering", created_at: "2026-02-14" },
  { id: "3", type: "open_ended", title: "Explain the pharmacokinetic differences between warfarin and heparin.", tags: ["Pharmacology", "Anticoagulants"], difficulty: "hard", bloom_level: "Analyzing", created_at: "2026-02-13" },
  { id: "4", type: "matching", title: "Match the following drug classes with their side effects.", tags: ["Pharmacology", "Side Effects"], difficulty: "medium", bloom_level: "Applying", created_at: "2026-02-12" },
  { id: "5", type: "multiple_choice", title: "Which neurotransmitter is primarily affected by SSRIs?", tags: ["Pharmacology", "CNS"], difficulty: "easy", bloom_level: "Remembering", created_at: "2026-02-11" },
  { id: "6", type: "open_ended", title: "Discuss the role of the P450 enzyme system in drug metabolism.", tags: ["Pharmacology", "Metabolism"], difficulty: "hard", bloom_level: "Evaluating", created_at: "2026-02-10" },
];

export default function QuestionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = mockQuestions.filter((q) => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase()) || q.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || q.type === typeFilter;
    const matchDiff = difficultyFilter === "all" || q.difficulty === difficultyFilter;
    return matchSearch && matchType && matchDiff;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mockQuestions.length} questions in your repository
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Question</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select defaultValue="multiple_choice">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="open_ended">Open Ended</SelectItem>
                    <SelectItem value="matching">Matching Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea placeholder="Enter your question..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bloom's Level</Label>
                  <Select defaultValue="understanding">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remembering">Remembering</SelectItem>
                      <SelectItem value="understanding">Understanding</SelectItem>
                      <SelectItem value="applying">Applying</SelectItem>
                      <SelectItem value="analyzing">Analyzing</SelectItem>
                      <SelectItem value="evaluating">Evaluating</SelectItem>
                      <SelectItem value="creating">Creating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input placeholder="e.g. Pharmacology, Cardiovascular" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => setCreateOpen(false)}>Create Question</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
            <SelectItem value="true_false">True/False</SelectItem>
            <SelectItem value="open_ended">Open Ended</SelectItem>
            <SelectItem value="matching">Matching</SelectItem>
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Question List */}
      <div className="space-y-3">
        {filtered.map((q) => (
          <Card
            key={q.id}
            className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                <GripVertical className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
              </div>
              <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center shrink-0 text-muted-foreground">
                {typeIcons[q.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-snug">{q.title}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={q.difficulty as "easy" | "medium" | "hard"} className="text-[11px]">
                    {q.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{typeLabels[q.type]}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{q.bloom_level}</span>
                  {q.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[11px]">{tag}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Library className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No questions found</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new question.</p>
          </div>
        )}
      </div>
    </div>
  );
}
