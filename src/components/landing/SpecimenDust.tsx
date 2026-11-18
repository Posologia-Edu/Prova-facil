import { useEffect, useRef, type RefObject } from "react";

interface Grain {
  x: number;
  y: number;
  color: string;
}

// Sample the actual highlights so the transition resolves to the outline of each sculpture.
function sampleSpecimen(image: HTMLImageElement): Grain[] {
  const sampler = document.createElement("canvas");
  const size = 90;
  sampler.width = sampler.height = size;
  const ctx = sampler.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size).data;
  const grains: Grain[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = y % 2; x < size; x += 2) {
      const offset = (y * size + x) * 4;
      const [r, g, b] = pixels.subarray(offset, offset + 3);
      if (Math.max(r, g, b) < 69) continue;
      grains.push({ x: (x + .5) / size, y: (y + .5) / size, color: `rgb(${r} ${g} ${b})` });
    }
  }
  return grains;
}

export function SpecimenDust({ source, imageRef }: { source: string; imageRef: RefObject<HTMLImageElement> }) {
  const surface = useRef<HTMLCanvasElement>(null);
  const previous = useRef<Grain[]>([]);
  useEffect(() => {
    const image = imageRef.current;
    const canvas = surface.current;
    if (!image || !canvas) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    let frame = 0;
    let fade: Animation | undefined;
    async function assemble() {
      try { await image.decode(); } catch { return; }
      if (cancelled) return;
      const next = sampleSpecimen(image);
      if (!next.length) return;
      const from = previous.current;
      previous.current = next;
      const size = Math.min(960, Math.ceil(canvas.clientWidth * Math.min(devicePixelRatio, 1.5)));
      if (size <= 0) return;
      canvas.width = canvas.height = size;
      const duration = 1450;
      const start = performance.now();
      fade = image.animate(
        [{ opacity: .18 }, { opacity: .12, offset: .32 }, { opacity: 1 }],
        { duration, easing: "cubic-bezier(.25,.1,.3,1)" }
      );
      const draw = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const mix = 1 - (1 - t) ** 3;
        const scatter = Math.sin(t * Math.PI) * (1 - t);
        ctx.clearRect(0, 0, size, size);
        ctx.globalAlpha = Math.min(1, (1 - t) * 3.5);
        for (let i = 0; i < next.length; i++) {
          const grain = next[i];
          const seed = i / next.length;
          const old = from[Math.floor(seed * from.length)];
          const x = old?.x ?? seed;
          const y = old?.y ?? .52 + .16 * Math.sin(seed * Math.PI * 3);
          const bend = Math.sin(i * 2.39996);
          const px = x + (grain.x - x) * mix + bend * scatter * .24;
          const py = y + (grain.y - y) * mix + Math.cos(i * 2.39996) * scatter * .22;
          ctx.fillStyle = grain.color;
          ctx.fillRect(px * size, py * size, size * .0033, size * .0028);
        }
        if (t < 1) frame = requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, size, size);
      };
      frame = requestAnimationFrame(draw);
    }
    function stop() {
      cancelled = true;
      cancelAnimationFrame(frame);
      fade?.cancel();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    preference.addEventListener("change", stop);
    void assemble();
    return () => {
      preference.removeEventListener("change", stop);
      stop();
    };
  }, [imageRef, source]);
  return <canvas className="atlas-dust" aria-hidden="true" ref={surface} />;
}
