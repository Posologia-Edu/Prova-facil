import { useState, useEffect } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Lightbulb, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { helpGuides } from "@/lib/help-guides";

interface ModuleHelpGuideProps {
  moduleKey: string;
}

const STORAGE_PREFIX = "help_dismissed_";

const ModuleHelpGuide = ({ moduleKey }: ModuleHelpGuideProps) => {
  const guide = helpGuides[moduleKey];
  const [dismissed, setDismissed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [manualReopen, setManualReopen] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(`${STORAGE_PREFIX}${moduleKey}`) === "true";
    setDismissed(wasDismissed);
    if (!wasDismissed) {
      setIsOpen(true);
    }
  }, [moduleKey]);

  if (!guide) return null;

  const handleDismiss = () => {
    localStorage.setItem(`${STORAGE_PREFIX}${moduleKey}`, "true");
    setDismissed(true);
    setIsOpen(false);
    setManualReopen(false);
  };

  const handleReopen = () => {
    setManualReopen(true);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setManualReopen(false);
  };

  // If dismissed and not manually reopened, show only the help button
  if (dismissed && !manualReopen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReopen}
        className="text-muted-foreground hover:text-primary gap-1.5"
        title="Mostrar guia de ajuda"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Ajuda</span>
      </Button>
    );
  }

  return (
    <div className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-primary/10 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm text-primary">{guide.title}</span>
              </div>
              <div className="flex items-center gap-1">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              {guide.steps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    {step.tip && (
                      <div className="flex items-start gap-1.5 mt-1.5 p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                        <Lightbulb className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">{step.tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-xs text-muted-foreground gap-1"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Não mostrar novamente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  className="text-xs gap-1"
                >
                  Entendi
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default ModuleHelpGuide;
