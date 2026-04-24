import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ImageIcon, RefreshCw, Upload, CheckCircle2, AlertTriangle, Loader2, Trash2, Sparkles } from "lucide-react";

interface CaseImage {
  id: string;
  case_id: string;
  slug: string;
  anchor: string;
  title: string;
  caption: string;
  prompt: string;
  status: string;
  image_url: string | null;
  storage_path: string | null;
  error_message: string | null;
  attempts: number;
}

interface Props {
  caseId: string;
}

export function CaseImagesPanel({ caseId }: Props) {
  const [images, setImages] = useState<CaseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const newFileRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [creatingFromUpload, setCreatingFromUpload] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("mock_trial_case_images")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at");
    setImages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`case-images-${caseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mock_trial_case_images", filter: `case_id=eq.${caseId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const regenerate = async (imageId: string) => {
    setBusy((s) => ({ ...s, [imageId]: true }));
    try {
      const { error } = await supabase.functions.invoke("generate-mock-trial-image", {
        body: { imageId },
      });
      if (error) throw error;
      toast.success("Imagem gerada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar imagem");
    } finally {
      setBusy((s) => ({ ...s, [imageId]: false }));
      load();
    }
  };

  const removeImage = async (imageId: string) => {
    if (!confirm("Remover esta imagem do processo?")) return;
    await (supabase as any).from("mock_trial_case_images").delete().eq("id", imageId);
    load();
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${caseId}/manual-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("mock-trial-images")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) {
      toast.error("Erro ao enviar imagem");
      return;
    }
    const { data: urlData } = supabase.storage.from("mock-trial-images").getPublicUrl(path);
    await (supabase as any)
      .from("mock_trial_case_images")
      .update({ status: "ready", image_url: urlData.publicUrl, storage_path: path, error_message: null })
      .eq("id", uploadTargetId);
    setUploadTargetId(null);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Imagem enviada");
    load();
  };

  const addCustomImage = async () => {
    const slug = (newSlug.trim() || `img-${Math.random().toString(36).slice(2, 7)}`)
      .toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const { data, error } = await (supabase as any)
      .from("mock_trial_case_images")
      .insert({
        case_id: caseId,
        slug,
        anchor: `[[IMAGE:${slug}]]`,
        title: newTitle.trim() || "Imagem do processo",
        caption: "",
        prompt: newPrompt.trim() || newTitle.trim() || slug,
        status: "pending",
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewSlug(""); setNewTitle(""); setNewPrompt("");
    if (data) regenerate(data.id);
  };

  const handleCreateFromUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreatingFromUpload(true);
    try {
      const slug = (newSlug.trim() || `img-${Math.random().toString(36).slice(2, 7)}`)
        .toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${caseId}/manual-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("mock-trial-images")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("mock-trial-images").getPublicUrl(path);
      const { data: row, error } = await (supabase as any)
        .from("mock_trial_case_images")
        .insert({
          case_id: caseId,
          slug,
          anchor: `[[IMAGE:${slug}]]`,
          title: newTitle.trim() || "Imagem do processo",
          caption: "",
          prompt: newPrompt.trim() || newTitle.trim() || slug,
          status: "ready",
          image_url: urlData.publicUrl,
          storage_path: path,
        })
        .select()
        .single();
      if (error) throw error;

      // Inserir âncora no conteúdo do processo se ainda não existir
      const { data: caseRow } = await (supabase as any)
        .from("mock_trial_cases")
        .select("case_content")
        .eq("id", caseId)
        .single();
      const content: string = caseRow?.case_content || "";
      if (content && !content.includes(`[[IMAGE:${slug}]]`)) {
        const updated = content + `\n\n[[IMAGE:${slug}]]\n\n`;
        await (supabase as any).from("mock_trial_cases").update({ case_content: updated }).eq("id", caseId);
      }

      setNewSlug(""); setNewTitle(""); setNewPrompt("");
      toast.success("Imagem enviada e vinculada ao processo");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    } finally {
      setCreatingFromUpload(false);
      if (newFileRef.current) newFileRef.current.value = "";
    }
  };


  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "ready") return <Badge className="bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Pronta</Badge>;
    if (status === "processing") return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Gerando</Badge>;
    if (status === "failed") return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Falhou</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <div className="space-y-3 mt-3 border-t pt-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Imagens médicas do processo</p>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Cada imagem é vinculada ao processo pelo seu <code className="text-[10px]">slug</code> via âncora <code className="text-[10px]">[[IMAGE:slug]]</code>.
        Quando o aluno ou o juiz abrir o processo, a imagem aparecerá no lugar da âncora correspondente. Aqui no editor você vê apenas o gerenciamento — a renderização final acontece no portal.
      </p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : images.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma imagem vinculada a este processo.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {images.map((img) => (
            <div key={img.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{img.title || img.slug}</p>
                  <code className="text-[10px] text-muted-foreground">{img.anchor}</code>
                </div>
                <StatusBadge status={img.status} />
              </div>

              {img.image_url ? (
                <img src={img.image_url} alt={img.title} className="w-full h-40 object-contain rounded border bg-background" />
              ) : (
                <div className="w-full h-40 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground bg-background">
                  {img.status === "processing" ? "Gerando imagem..." : "Sem imagem"}
                </div>
              )}

              {img.error_message && (
                <p className="text-[11px] text-destructive">{img.error_message}</p>
              )}

              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => regenerate(img.id)} disabled={busy[img.id] || img.status === "processing"}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${busy[img.id] ? "animate-spin" : ""}`} />
                  Gerar com IA
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setUploadTargetId(img.id); fileRef.current?.click(); }}>
                  <Upload className="h-3 w-3 mr-1" />Enviar arquivo
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeImage(img.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border rounded-lg p-3 bg-muted/10 space-y-2">
        <p className="text-xs font-medium">Adicionar nova imagem ao processo</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="slug (ex: rx-torax)" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
          <Input placeholder="Título (ex: Radiografia de Tórax)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Input placeholder="Descrição visual em inglês para a IA (opcional se for upload)" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={addCustomImage} disabled={!newTitle.trim() && !newSlug.trim()}>
            <Sparkles className="h-3 w-3 mr-1" />
            Criar e gerar com IA
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => newFileRef.current?.click()}
            disabled={creatingFromUpload}
          >
            <Upload className="h-3 w-3 mr-1" />
            {creatingFromUpload ? "Enviando..." : "Criar e enviar arquivo"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Ao enviar um arquivo, a âncora <code className="text-[10px]">[[IMAGE:slug]]</code> será adicionada automaticamente ao final do processo, caso ainda não exista no texto.
        </p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleManualUpload} />
      <input ref={newFileRef} type="file" accept="image/*" className="hidden" onChange={handleCreateFromUpload} />
    </div>
  );
}

