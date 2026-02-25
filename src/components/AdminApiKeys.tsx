import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Key, Eye, EyeOff, Trash2, Loader2, ExternalLink } from "lucide-react";

interface ApiKeyEntry {
  id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
}

const PROVIDER_INFO: Record<string, { label: string; link: string }> = {
  groq: { label: "Groq", link: "https://console.groq.com/keys" },
  openai: { label: "OpenAI", link: "https://platform.openai.com/api-keys" },
  anthropic: { label: "Anthropic", link: "https://console.anthropic.com/settings/keys" },
  openrouter: { label: "OpenRouter", link: "https://openrouter.ai/keys" },
  google: { label: "Google AI", link: "https://aistudio.google.com/apikey" },
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return key.substring(0, 4) + "•".repeat(Math.min(key.length - 8, 8)) + key.substring(key.length - 4);
}

export default function AdminApiKeys() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ai_api_keys").select("*").order("provider");
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setKeys((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadKeys(); }, []);

  const handleSave = async (entry: ApiKeyEntry) => {
    setSavingProvider(entry.provider);
    const newKey = editValue.trim();
    const { error } = await supabase
      .from("ai_api_keys")
      .update({ api_key: newKey, is_active: newKey.length > 0 } as any)
      .eq("id", entry.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo", description: `Chave ${PROVIDER_INFO[entry.provider]?.label} atualizada.` });
      setEditingProvider(null);
      setEditValue("");
      loadKeys();
    }
    setSavingProvider(null);
  };

  const handleDelete = async (entry: ApiKeyEntry) => {
    setSavingProvider(entry.provider);
    const { error } = await supabase
      .from("ai_api_keys")
      .update({ api_key: "", is_active: false } as any)
      .eq("id", entry.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Removida", description: `Chave ${PROVIDER_INFO[entry.provider]?.label} removida.` });
      loadKeys();
    }
    setSavingProvider(null);
  };

  const toggleVisible = (provider: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5" />
          API Keys externas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure as API Keys das suas LLMs favoritas. Elas serão usadas com prioridade nas funcionalidades de IA.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Se nenhuma chave estiver configurada, o sistema usará o modelo padrão da plataforma. Se a chamada com sua chave falhar, o sistema fará fallback automático.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.map((entry) => {
          const info = PROVIDER_INFO[entry.provider] || { label: entry.provider, link: "#" };
          const hasKey = entry.api_key && entry.api_key.length > 0;
          const isEditing = editingProvider === entry.provider;
          const isVisible = visibleKeys.has(entry.provider);
          const isSaving = savingProvider === entry.provider;

          return (
            <Card key={entry.id} className={`border ${hasKey ? "border-primary/30" : "border-border"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{info.label}</span>
                  </div>
                  <a
                    href={info.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Adquira sua chave de API <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Cole aqui sua API Key"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSave(entry)}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingProvider(null); setEditValue(""); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      readOnly
                      value={hasKey ? (isVisible ? entry.api_key : maskKey(entry.api_key)) : ""}
                      placeholder="Cole aqui sua API Key"
                      className="flex-1 cursor-default"
                    />
                    {hasKey && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleVisible(entry.provider)}
                        title={isVisible ? "Ocultar" : "Mostrar"}
                      >
                        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProvider(entry.provider);
                        setEditValue(entry.api_key || "");
                      }}
                    >
                      Editar
                    </Button>
                    {hasKey && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(entry)}
                        disabled={isSaving}
                        title="Remover chave"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
