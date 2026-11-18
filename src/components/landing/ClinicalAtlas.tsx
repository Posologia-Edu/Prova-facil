import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCheck, FileStack, Focus, HeartPulse, Pause, Play, Scan, ZoomIn, ZoomOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANDING_CONTENT } from "@/lib/landing-content";
import { ATLAS_CONTENT } from "@/lib/landing-atlas";
import { SpecimenDust } from "./SpecimenDust";
import "./clinical-atlas.css";

const works = [
  { key: "anatomia", Icon: HeartPulse },
  { key: "prova", Icon: FileStack },
  { key: "feedback", Icon: CheckCheck },
];
const dwell = 6500;

export function ClinicalAtlas({ active = true }: { active?: boolean }) {
  const { language } = useLanguage();
  const copy = ATLAS_CONTENT[language];
  const hero = LANDING_CONTENT[language].hero;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(false);
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const handledPointer = useRef(false);
  const scene = copy.scenes[index];
  const source = "/images/atlas-" + works[index].key;
  const counter = String(index + 1).padStart(2, "0");

  function resetView() {
    setZoom(false);
    const style = stage.current?.style;
    for (const name of ["--ax", "--ay", "--azx", "--azy"]) style?.removeProperty(name);
  }

  function selectScene(next: number) {
    setPlaying(false);
    resetView();
    setIndex(next);
  }

  function toggleZoom() {
    setPlaying(false);
    setZoom(value => !value);
  }

  useEffect(() => {
    if (!active) { setPlaying(false); return; }
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index === works.length - 1) setPlaying(false);
      else setIndex(index + 1);
    }, dwell);
    const stopWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", stopWhenHidden);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPlaying(false);
    });
    if (section.current) observer.observe(section.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [playing, index, active]);

  function point(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "touch" && !zoom) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    const style = event.currentTarget.style;
    style.setProperty("--azx", x * 100 + "%");
    style.setProperty("--azy", y * 100 + "%");
    style.setProperty("--ax", (x - .5) * 13 + "px");
    style.setProperty("--ay", (y - .5) * 10 + "px");
  }

  return (
    <section className="atlas" ref={section} aria-label={hero.eyebrow}>
      <div className="pf-wrap atlas-layout">
        <div className="atlas-copy">
          <p className="atlas-eyebrow"><span />{hero.eyebrow}</p>
          <div className="atlas-story" key={works[index].key} aria-live={playing ? "off" : "polite"}>
            <h1><span><b>{scene.title}</b></span> <span><em>{scene.emphasis}</em></span></h1>
            <p>{scene.description}</p>
          </div>
          <div className="pf-actions atlas-actions">
            <Link className="pf-button" to="/auth?tab=signup">{hero.primary}<ArrowUpRight size={17} /></Link>
            <a className="pf-text-link" href="#ficha-exemplo">{hero.secondary}<ArrowDownRight size={16} /></a>
          </div>
        </div>
        <figure className="atlas-exhibit">
          <div className="atlas-orbit" aria-hidden="true"><i /><i /></div>
          <button className="atlas-stage" ref={stage} type="button" data-specimen={works[index].key} aria-pressed={zoom}
            aria-label={zoom ? copy.reset : copy.zoom} data-zoom={zoom}
            onPointerMove={point}
            onPointerLeave={() => {
              stage.current?.style.removeProperty("--ax");
              stage.current?.style.removeProperty("--ay");
            }}
            onPointerDown={e => { handledPointer.current = false; touch.current = { x: e.clientX, y: e.clientY }; }}
            onPointerCancel={() => { touch.current = null; }}
            onPointerUp={e => {
              const start = touch.current;
              touch.current = null;
              if (!start) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              if (Math.abs(dx) >= 44 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
                handledPointer.current = true;
                selectScene((index + (dx < 0 ? 1 : -1) + works.length) % works.length);
              } else if (e.pointerType === "touch" && Math.hypot(dx, dy) < 10) {
                handledPointer.current = true;
                toggleZoom();
              }
            }}
            onClick={e => {
              if (handledPointer.current && e.detail > 0) { handledPointer.current = false; return; }
              toggleZoom();
            }}>
            <span className="atlas-optic">
              <img ref={imageRef} src={source + "-960.webp"} srcSet={source + "-520.webp 520w, " + source + "-960.webp 960w"}
                sizes="(max-width: 680px) 85vw, (max-width: 1100px) 45vw, 560px"
                width="960" height="960" alt={scene.alt} fetchPriority={index === 0 ? "high" : "auto"} draggable={false} />
              <SpecimenDust source={source} imageRef={imageRef} />
            </span>
            <span className="atlas-zoom" aria-hidden="true">{zoom ? <ZoomOut size={14}/> : <ZoomIn size={14}/>} {zoom ? "1×" : "2×"}</span>
          </button>
          <figcaption className="atlas-figure-id"><Scan size={14}/>{copy.figure} {counter}</figcaption>
        </figure>
        <div className="atlas-console" role="group" aria-label={copy.gallery}>
          <div className="atlas-console-label"><Focus size={19}/><span>{copy.gallery}</span></div>
          <div className="atlas-selectors">{works.map(({key,Icon},i) => (
            <button key={key} className="atlas-selector" type="button" aria-pressed={i === index}
              data-playing={playing && i === index} onClick={() => selectScene(i)}>
              <Icon size={18} strokeWidth={1.5}/><span>{copy.scenes[i].label}</span><small>0{i + 1}</small>
            </button>
          ))}</div>
          <button className="atlas-play" type="button" aria-pressed={playing} aria-label={playing ? copy.pause : copy.play}
            title={playing ? copy.pause : copy.play}
            onClick={() => {
              resetView();
              if (!playing && index === works.length - 1) setIndex(0);
              setPlaying(!playing);
            }}>{playing ? <Pause size={15}/> : <Play size={15}/>}</button>
        </div>
      </div>
    </section>
  );
}
