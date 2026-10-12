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

const CANVAS_HEIGHT = 320;

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
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const activePenRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Size the canvas bitmap to its real on-screen size (re-run on any resize).
  // Uses state-backed ref because the dialog content mounts after `open` flips.
  useEffect(() => {
    if (!open || !canvasEl) return;
    const parent = canvasEl.parentElement;
    if (!parent) return;

    const setup = () => {
      const ratio = window.devicePixelRatio || 1;
      // clientWidth ignores CSS transforms (e.g. dialog zoom-in animation)
      const w = Math.max(1, Math.round(parent.clientWidth));
      const h = CANVAS_HEIGHT;
      if (canvasEl.width === Math.round(w * ratio) && canvasEl.height === Math.round(h * ratio)) return;

      // Preserve existing ink across resizes
      let snapshot: HTMLCanvasElement | null = null;
      if (canvasEl.width > 0 && canvasEl.height > 0) {
        snapshot = document.createElement("canvas");
        snapshot.width = canvasEl.width;
        snapshot.height = canvasEl.height;
        snapshot.getContext("2d")?.drawImage(canvasEl, 0, 0);
      }

      canvasEl.width = Math.round(w * ratio);
      canvasEl.height = Math.round(h * ratio);
      canvasEl.style.width = `${w}px`;
      canvasEl.style.height = `${h}px`;
      const ctx = canvasEl.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (snapshot) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(snapshot, 0, 0);
        ctx.restore();
      }
    };

    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [open, canvasEl]);

  useEffect(() => {
    if (open) setHasInk(false);
  }, [open]);

  // Convert pointer position to canvas CSS-pixel coordinates. Divides by the
  // real rendered size so it stays exact even while the dialog is animating/scaled.
  const getPos = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width ? canvas.clientWidth / rect.width : 1;
    const sy = rect.height ? canvas.clientHeight / rect.height : 1;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const strokeFor = (pressure: number, pointerType: string) => {
    if (tool === "eraser") return { color: "#ffffff", width: 18 };
    // Stylus: vary width with pressure; finger/mouse: constant
    const p = pointerType === "pen" && pressure > 0 ? pressure : 0.5;
    return { color: "#0f172a", width: 1.5 + p * 2.5 };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // While a stylus is in use, ignore palm/finger touches
    if (e.pointerType === "touch" && activePenRef.current) return;
    if (e.pointerType === "pen") activePenRef.current = true;
    e.preventDefault();
    canvasRef.current?.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    pointerIdRef.current = e.pointerId;
    const p = getPos(e);
    lastPointRef.current = p;
    // Draw a dot so taps (i, periods, accents) are registered
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      const { color, width } = strokeFor(e.pressure, e.pointerType);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, width / 2, 0, Math.PI * 2);
      ctx.fill();
      setHasInk(true);
    }
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || e.pointerId !== pointerIdRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    // Use every sampled point (coalesced events) so fast strokes follow the pen tip
    const native = e.nativeEvent;
    const coalesced = native.getCoalescedEvents?.() ?? [];
    const samples = coalesced.length ? coalesced : [native];
    for (const ev of samples) {
      const p = getPos(ev);
      const last = lastPointRef.current ?? p;
      const { color, width } = strokeFor(ev.pressure, e.pointerType);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastPointRef.current = p;
    }
    setHasInk(true);
  };

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    if (e.pointerType === "pen") activePenRef.current = false;
    drawingRef.current = false;
    pointerIdRef.current = null;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
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
              ref={(el) => { canvasRef.current = el; setCanvasEl(el); }}
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerCancel={endDraw}
              className="block cursor-crosshair touch-none"
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
