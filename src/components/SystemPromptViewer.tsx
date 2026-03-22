import { useState } from "react";
import { Bot, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdmin } from "@/hooks/use-admin";
import { SYSTEM_PROMPTS, type SystemPromptEntry } from "@/lib/system-prompts";

interface SystemPromptViewerProps {
  toolKey: string;
}

export default function SystemPromptViewer({ toolKey }: SystemPromptViewerProps) {
  const { isAdmin, loading } = useAdmin();
  const [open, setOpen] = useState(false);

  if (loading || !isAdmin) return null;

  const prompts = SYSTEM_PROMPTS[toolKey];
  if (!prompts || prompts.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-xs border-dashed border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
      >
        <Bot className="h-3.5 w-3.5" />
        System Prompts
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-amber-600" />
              System Prompts — {toolKey}
            </DialogTitle>
          </DialogHeader>

          {prompts.length === 1 ? (
            <PromptCard entry={prompts[0]} />
          ) : (
            <Tabs defaultValue={prompts[0].id}>
              <TabsList className="w-full flex-wrap h-auto gap-1">
                {prompts.map((p) => (
                  <TabsTrigger key={p.id} value={p.id} className="text-xs">
                    {p.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {prompts.map((p) => (
                <TabsContent key={p.id} value={p.id}>
                  <PromptCard entry={p} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PromptCard({ entry }: { entry: SystemPromptEntry }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-muted-foreground">{entry.description}</p>
        <Badge variant="outline" className="mt-2 text-xs font-mono">
          Edge Function: {entry.edgeFunction}
        </Badge>
      </div>
      <ScrollArea className="h-[50vh] rounded-md border bg-muted/30 p-4">
        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">
          {entry.prompt}
        </pre>
      </ScrollArea>
    </div>
  );
}
