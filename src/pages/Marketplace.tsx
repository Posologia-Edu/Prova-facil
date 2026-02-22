import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Star,
  Download,
  MessageSquare,
  BookOpen,
  User,
  Clock,
  Loader2,
  Send,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MarketplaceExam {
  id: string;
  exam_id: string;
  user_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  tags: string[];
  question_count: number;
  avg_rating: number;
  rating_count: number;
  download_count: number;
  created_at: string;
  author_name?: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

export default function Marketplace() {
  const [exams, setExams] = useState<MarketplaceExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedExam, setSelectedExam] = useState<MarketplaceExam | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCurrentUserId(session.user.id);
    });
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_exams")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching marketplace:", error);
      setLoading(false);
      return;
    }

    // Fetch author names
    const userIds = [...new Set((data || []).map((e: any) => e.user_id))];
    let profilesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      (profiles || []).forEach((p: any) => {
        profilesMap[p.user_id] = p.full_name || "Anônimo";
      });
    }

    setExams(
      (data || []).map((e: any) => ({
        ...e,
        tags: e.tags || [],
        author_name: profilesMap[e.user_id] || "Anônimo",
      }))
    );
    setLoading(false);
  };

  const openExamDetail = async (exam: MarketplaceExam) => {
    setSelectedExam(exam);
    setUserRating(0);

    // Fetch comments
    const { data: commentsData } = await supabase
      .from("marketplace_comments")
      .select("*")
      .eq("marketplace_exam_id", exam.id)
      .order("created_at", { ascending: false });

    const commentUserIds = [...new Set((commentsData || []).map((c: any) => c.user_id))];
    let cProfilesMap: Record<string, string> = {};
    if (commentUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", commentUserIds);
      (profiles || []).forEach((p: any) => {
        cProfilesMap[p.user_id] = p.full_name || "Anônimo";
      });
    }

    setComments(
      (commentsData || []).map((c: any) => ({
        ...c,
        author_name: cProfilesMap[c.user_id] || "Anônimo",
      }))
    );

    // Fetch user's existing rating
    if (currentUserId) {
      const { data: ratingData } = await supabase
        .from("marketplace_ratings")
        .select("rating")
        .eq("marketplace_exam_id", exam.id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (ratingData) setUserRating(ratingData.rating);
    }
  };

  const handleRate = async (rating: number) => {
    if (!currentUserId || !selectedExam) return;
    setUserRating(rating);

    const { error } = await supabase
      .from("marketplace_ratings")
      .upsert(
        { marketplace_exam_id: selectedExam.id, user_id: currentUserId, rating },
        { onConflict: "marketplace_exam_id,user_id" }
      );

    if (error) {
      toast({ title: "Erro ao avaliar", description: error.message, variant: "destructive" });
      return;
    }

    // Recalculate average
    const { data: allRatings } = await supabase
      .from("marketplace_ratings")
      .select("rating")
      .eq("marketplace_exam_id", selectedExam.id);

    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / allRatings.length;
      await supabase
        .from("marketplace_exams")
        .update({ avg_rating: Math.round(avg * 10) / 10, rating_count: allRatings.length })
        .eq("id", selectedExam.id);

      setSelectedExam({ ...selectedExam, avg_rating: Math.round(avg * 10) / 10, rating_count: allRatings.length });
    }

    toast({ title: "Avaliação registrada!" });
    fetchExams();
  };

  const handleComment = async () => {
    if (!currentUserId || !selectedExam || !newComment.trim()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("marketplace_comments")
      .insert({ marketplace_exam_id: selectedExam.id, user_id: currentUserId, content: newComment.trim() });

    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao comentar", description: error.message, variant: "destructive" });
      return;
    }

    setNewComment("");
    openExamDetail(selectedExam); // refresh comments
    toast({ title: "Comentário adicionado!" });
  };

  const handleImportExam = async (exam: MarketplaceExam) => {
    if (!currentUserId) return;
    setImporting(true);

    try {
      // Fetch original exam data
      const { data: originalExam } = await supabase
        .from("exams")
        .select("*")
        .eq("id", exam.exam_id)
        .maybeSingle();

      if (!originalExam) {
        toast({ title: "Erro", description: "Prova original não encontrada.", variant: "destructive" });
        setImporting(false);
        return;
      }

      // Create a copy of the exam for the current user
      const { data: newExam, error: examError } = await supabase
        .from("exams")
        .insert({
          user_id: currentUserId,
          title: `${originalExam.title} (Marketplace)`,
          description: originalExam.description,
          header_config_json: originalExam.header_config_json,
          layout_config_json: originalExam.layout_config_json,
          status: "draft",
        })
        .select()
        .single();

      if (examError || !newExam) {
        toast({ title: "Erro ao importar", description: examError?.message, variant: "destructive" });
        setImporting(false);
        return;
      }

      // Copy exam questions
      const { data: originalQuestions } = await supabase
        .from("exam_questions")
        .select("*")
        .eq("exam_id", exam.exam_id)
        .order("position");

      if (originalQuestions && originalQuestions.length > 0) {
        // Copy each question to the user's question bank, then link
        for (const eq of originalQuestions) {
          const { data: originalQ } = await supabase
            .from("question_bank")
            .select("*")
            .eq("id", eq.question_id)
            .maybeSingle();

          if (originalQ) {
            const { data: newQ } = await supabase
              .from("question_bank")
              .insert({
                user_id: currentUserId,
                type: originalQ.type,
                difficulty: originalQ.difficulty,
                content_json: originalQ.content_json,
                tags: originalQ.tags,
                bloom_level: originalQ.bloom_level,
              })
              .select()
              .single();

            if (newQ) {
              await supabase.from("exam_questions").insert({
                exam_id: newExam.id,
                question_id: newQ.id,
                position: eq.position,
                points: eq.points,
                section_name: eq.section_name,
              });
            }
          }
        }
      }

      // Increment download count
      await supabase
        .from("marketplace_exams")
        .update({ download_count: (exam.download_count || 0) + 1 })
        .eq("id", exam.id);

      toast({ title: "Prova importada!", description: "A prova foi copiada para 'Minhas Provas'." });
      fetchExams();
    } catch (err) {
      toast({ title: "Erro ao importar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const subjects = [...new Set(exams.map((e) => e.subject).filter(Boolean))];

  const filteredExams = exams
    .filter((e) => {
      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSubject = subjectFilter === "all" || e.subject === subjectFilter;
      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.avg_rating - a.avg_rating;
        case "downloads":
          return b.download_count - a.download_count;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground mt-1">
          Explore provas compartilhadas pela comunidade, avalie e importe para sua área.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, descrição ou tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas disciplinas</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s!}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="rating">Melhor avaliação</SelectItem>
            <SelectItem value="downloads">Mais baixadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Nenhuma prova encontrada</p>
          <p className="text-sm">Seja o primeiro a compartilhar uma prova no Marketplace!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <Card
              key={exam.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openExamDetail(exam)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {exam.title}
                  </CardTitle>
                </div>
                {exam.subject && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    {exam.subject}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pb-3">
                {exam.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exam.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {exam.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {exam.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{exam.tags.length - 3}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {exam.author_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {exam.question_count} questões
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{exam.avg_rating > 0 ? exam.avg_rating.toFixed(1) : "—"}</span>
                  <span className="text-muted-foreground">({exam.rating_count})</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" />
                    {exam.download_count}
                  </span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedExam} onOpenChange={(open) => !open && setSelectedExam(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedExam?.title}</DialogTitle>
            <DialogDescription>{selectedExam?.description}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-5">
              {/* Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-4 w-4" />
                  {selectedExam?.author_name}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  {selectedExam?.question_count} questões
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Download className="h-4 w-4" />
                  {selectedExam?.download_count} downloads
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {selectedExam && new Date(selectedExam.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>

              {selectedExam?.tags && selectedExam.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedExam.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Rating */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Sua avaliação</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRate(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= (hoverRating || userRating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {selectedExam?.avg_rating
                      ? `Média: ${selectedExam.avg_rating.toFixed(1)} (${selectedExam.rating_count} avaliações)`
                      : "Sem avaliações ainda"}
                  </span>
                </div>
              </div>

              {/* Import */}
              {selectedExam && selectedExam.user_id !== currentUserId && (
                <Button
                  onClick={() => handleImportExam(selectedExam)}
                  disabled={importing}
                  className="w-full"
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Importar para Minhas Provas
                </Button>
              )}

              <Separator />

              {/* Comments */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentários ({comments.length})
                </h3>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Deixe um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <Button
                    size="icon"
                    onClick={handleComment}
                    disabled={submitting || !newComment.trim()}
                    className="shrink-0 self-end"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum comentário ainda. Seja o primeiro!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{comment.author_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
