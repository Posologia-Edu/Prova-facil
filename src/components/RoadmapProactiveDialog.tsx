import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";

export function RoadmapProactiveDialog() {
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);

  const { data: planned = [] } = useQuery({
    queryKey: ["system-updates-planned-proactive"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_updates" as any)
        .select("id, title, description, priority")
        .eq("type", "planned")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!isAdmin || planned.length === 0) return;
    const dismissed = localStorage.getItem("roadmap_proactive_dismissed");
    if (dismissed) {
      const ts = Number(dismissed);
      // Show again after 24h
      if (Date.now() - ts < 24 * 60 * 60 * 1000) return;
    }
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [isAdmin, planned.length]);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem("roadmap_proactive_dismissed", String(Date.now()));
  };

  const priorityBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    high: { label: "Alta", variant: "destructive" },
    medium: { label: "Média", variant: "secondary" },
    low: { label: "Baixa", variant: "outline" },
  };

  if (!isAdmin || planned.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Roadmap — {planned.length} funcionalidade{planned.length > 1 ? "s" : ""} planejada{planned.length > 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Estas são as próximas funcionalidades a serem implementadas. Escolha uma para começar!
        </p>
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-2 pr-2">
            {planned.slice(0, 8).map((u: any) => (
              <div key={u.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{u.title}</p>
                    <Badge variant={priorityBadge[u.priority]?.variant || "secondary"} className="text-[10px]">
                      {priorityBadge[u.priority]?.label || u.priority}
                    </Badge>
                  </div>
                  {u.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{u.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            <X className="h-3.5 w-3.5 mr-1" />
            Fechar por hoje
          </Button>
          <Button size="sm" asChild onClick={dismiss}>
            <Link to="/updates">
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              Ver Pipeline Completo
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
