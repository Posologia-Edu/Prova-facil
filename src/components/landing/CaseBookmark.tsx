import { useLayoutEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { CASE_FILM } from "@/lib/landing-case-film";
import { LANDING_CONTENT } from "@/lib/landing-content";

// After the pinned sequence, the case file becomes a bookmark for the rest of the page.
export function CaseBookmark() {
  const { language } = useLanguage();
  const copy = CASE_FILM[language];
  const initialLabel = LANDING_CONTENT[language].trust.eyebrow;
  const bar = useRef<HTMLElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(initialLabel);
  useLayoutEffect(() => {
    const main = bar.current?.closest("main");
    if (!main || !bar.current) return;
    const sections = Array.from(main.querySelectorAll<HTMLElement>("[data-reel-label]"));
    let positions: { top: number; label: string }[] = [];
    let start = 0;
    let end = 1;
    let frame = 0;
    function measure() {
      const header = main.parentElement?.querySelector("nav")?.getBoundingClientRect().height ?? 0;
      const offset = header + bar.current.offsetHeight + 8;
      positions = sections.map(el => ({
        top: el.getBoundingClientRect().top + window.scrollY - Math.max(offset, parseFloat(getComputedStyle(el).scrollMarginTop) || 0) - 2,
        label: el.dataset.reelLabel,
      }));
      start = positions[0]?.top ?? 0;
      end = Math.max(start + 1, main.getBoundingClientRect().bottom + window.scrollY - innerHeight);
      draw();
    }
    function draw() {
      frame = 0;
      const y = window.scrollY;
      let label = initialLabel;
      for (const item of positions) {
        if (item.top > y) break;
        label = item.label;
      }
      setCurrent(label);
      const ratio = Math.min(1, Math.max(0, (y - start) / (end - start)));
      progress.current?.style.setProperty("transform", `scaleX(${ratio})`);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
    const resize = new ResizeObserver(measure);
    resize.observe(main);
    sections.forEach(el => resize.observe(el));
    window.addEventListener("scroll", schedule, { passive: true });
    measure();
    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [language, initialLabel]);
  return <aside className="case-bookmark" ref={bar} id="depois-do-caso" aria-label={copy.title}>
    <div className="pf-wrap">
      <span className="case-bookmark-name"><img src="/images/consulta-panorama-920.webp" width="64" height="34" alt="" />{copy.title}</span>
      <span className="case-bookmark-current">{current}</span>
      <a href="#caso-clinico"><RotateCcw size={13}/>{copy.replay}</a>
    </div>
    <div className="bookmark-meter" ref={progress} aria-hidden="true" />
  </aside>;
}
