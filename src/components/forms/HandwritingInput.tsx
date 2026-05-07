import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pen, Eraser, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface HandwritingInputProps {
  /** Label/contexto do campo, usado para ajudar a IA a desambiguar termos técnicos. */
  context?: string;
  /** Callback chamado com o texto transcrito (substitui o valor atual). */
  onTranscribe: (text: string) => void;
  /** Se true, anexa o texto transcrito ao texto existente em vez de substituir. */
  appendMode?: boolean;
  /** Texto atual do campo, usado quando appendMode = true. */
  currentValue?: string;
  disabled?: boolean;
  size?: "sm" | "default";
}

type Tool = "pen" | "eraser";

export default function HandwritingInput({
  context,
  onTranscribe,
  appendMode = true,
  currentValue = "",
  disabled,
  size = "sm",
}: HandwritingInputProps) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [loading, setLoading] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Setup canvas size on open
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // High DPI handling
    const ratio = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const w = parent ? parent.clientWidth : 600;
    const h = 320;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    setHasInk(false);
  }, [open]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    const last = lastPointRef.current ?? p;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    if (tool === "pen") {
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 18;
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.stroke();
    lastPointRef.current = p;
    setHasInk(true);
  };

  const endDraw = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.scale(ratio, ratio);
    setHasInk(false);
  };

  const handleTranscribe = async () => {
    if (!hasInk) {
      toast({ title: "Escreva algo primeiro", description: "Use a caneta para escrever no quadro." });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLoading(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const { data, error } = await supabase.functions.invoke("transcribe-handwriting", {
        body: { image: dataUrl, context },
      });
      if (error) throw error;
      const text = (data as any)?.text?.trim?.() || "";
      if (!text) {
        toast({
          title: "Nenhum texto reconhecido",
          description: "Tente escrever com letras mais legíveis e tente novamente.",
          variant: "destructive",
        });
        return;
      }
      const finalText = appendMode && currentValue
        ? `${currentValue.replace(/\s+$/, "")}\n${text}`
        : text;
      onTranscribe(finalText);
      toast({ title: "Texto transcrito", description: "A escrita foi convertida e inserida no campo." });
      setOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao transcrever",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Pen className="h-3.5 w-3.5" />
        Escrever à mão
      </Button>

      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Escrita à mão</DialogTitle>
            <DialogDescription>
              Escreva no quadro abaixo usando o dedo, caneta digital ou mouse. A IA irá transcrever
              automaticamente para texto digitado.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={tool === "pen" ? "default" : "outline"}
              onClick={() => setTool("pen")}
              className="gap-1.5"
            >
              <Pen className="h-3.5 w-3.5" /> Caneta
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tool === "eraser" ? "default" : "outline"}
              onClick={() => setTool("eraser")}
              className="gap-1.5"
            >
              <Eraser className="h-3.5 w-3.5" /> Borracha
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clearCanvas} className="gap-1.5 ml-auto">
              <Trash2 className="h-3.5 w-3.5" /> Limpar
            </Button>
          </div>

          <div className="rounded-md border bg-white overflow-hidden touch-none select-none">
            <canvas
              ref={canvasRef}
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerCancel={endDraw}
              onPointerLeave={endDraw}
              className="block w-full cursor-crosshair touch-none"
              style={{ touchAction: "none" }}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleTranscribe} disabled={loading || !hasInk}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Transcrevendo…
                </>
              ) : appendMode && currentValue ? (
                "Transcrever e adicionar"
              ) : (
                "Transcrever"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
