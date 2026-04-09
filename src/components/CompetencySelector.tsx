import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Brain, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function CompetencySelector({ selectedIds, onChange, className }: Props) {
  const [open, setOpen] = useState(false);

  const { data: competencies = [] } = useQuery({
    queryKey: ["competency-definitions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("competency_definitions")
        .select("id, name, area")
        .eq("user_id", user.id)
        .order("area, name");
      return (data || []) as { id: string; name: string; area: string }[];
    },
  });

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id));

  const selectedNames = competencies.filter((c) => selectedIds.includes(c.id));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Brain className="h-4 w-4 text-primary" />
        Competências
      </div>

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedNames.map((c) => (
            <Badge key={c.id} variant="secondary" className="text-xs gap-1">
              {c.name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => remove(c.id)}
              />
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs"
          >
            {selectedIds.length === 0
              ? "Vincular competências..."
              : `${selectedIds.length} selecionada(s)`}
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar competência..." />
            <CommandList>
              <CommandEmpty>Nenhuma competência encontrada.</CommandEmpty>
              {Object.entries(
                competencies.reduce(
                  (acc, c) => {
                    if (!acc[c.area]) acc[c.area] = [];
                    acc[c.area].push(c);
                    return acc;
                  },
                  {} as Record<string, typeof competencies>
                )
              ).map(([area, items]) => (
                <CommandGroup key={area} heading={area}>
                  {items.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => toggle(c.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedIds.includes(c.id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {competencies.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Cadastre competências em Análise de Competências para vinculá-las aqui.
        </p>
      )}
    </div>
  );
}
