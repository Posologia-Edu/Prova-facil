import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANDING_CONTENT } from "@/lib/landing-content";

const stills = ["atlas-prova-520", "consulta-panorama-920", "atlas-feedback-520"];

export function FeatureReel({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const c = LANDING_CONTENT[language];
  const names = [c.modules.eyebrow, c.areas.eyebrow, c.ai.eyebrow];
  const reel = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useLayoutEffect(() => {
    const root = reel.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("section[data-reel-label]"));
    const frames = Array.from(root.querySelectorAll<HTMLElement>(".feature-reel-frame"));
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let visible = false;
    function paint() {
      raf = 0;
      const cut = window.innerHeight * .52;
      const distance = Math.max(140, window.innerHeight * .29);
      let current = 0;
      for (let i = 1; i < frames.length; i++) {
        const top = sections[i].getBoundingClientRect().top;
        const amount = preference.matches ? Number(top <= cut) : Math.max(0, Math.min(1, (cut - top) / distance + .5));
        frames[i].style.clipPath = `inset(${(1 - amount) * 100}% 0 0 0)`;
        if (amount >= .5) current = i;
      }
      setActive(current);
    }
    function schedule() { if (visible && !raf) raf = requestAnimationFrame(paint); }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
    observer.observe(root);
    const size = new ResizeObserver(schedule);
    size.observe(root);
    sections.forEach(el => size.observe(el));
    window.addEventListener("scroll", schedule, { passive: true });
    preference.addEventListener("change", schedule);
    paint();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      size.disconnect();
      window.removeEventListener("scroll", schedule);
      preference.removeEventListener("change", schedule);
    };
  }, []);
  return <div className="feature-reel" ref={reel}>
    <div className="pf-wrap feature-reel-layout">
      <figure className="feature-reel-stage">
        <div className="feature-reel-window" aria-hidden="true">
          {stills.map((image, i) => <div key={image} className={`feature-reel-frame reel-frame-${i}`}>
            <img src={`/images/${image}.webp`} alt="" width={i === 1 ? 920 : 520} height={i === 1 ? 400 : 520} loading="lazy"/>
          </div>)}
        </div>
        <figcaption><span>{names[active]}</span><small>0{active + 1} / 03</small></figcaption>
      </figure>
      <div className="feature-reel-copy">{children}</div>
    </div>
  </div>;
}
