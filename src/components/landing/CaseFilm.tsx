import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowDownRight, Check, ClipboardCheck, CornerDownRight, FileText, Minus, NotebookPen } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { CASE_FILM, type SceneCopy } from "@/lib/landing-case-film";
import { LANDING_CONTENT } from "@/lib/landing-content";
import { ClinicalAtlas } from "./ClinicalAtlas";
import { CHAPTER_STOPS, setUpCaseShots } from "./case-shots";
import "./case-film.css";

const motionQuery = "(prefers-reduced-motion: no-preference) and (min-height: 620px)";
function subscribeMode(update: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
const hasRoomForFilm = () => window.matchMedia(motionQuery).matches && typeof Element.prototype.animate === "function";

function SceneCaption({ scene, label, index, hidden = false }: { scene: SceneCopy; label: string; index: number; hidden?: boolean }) {
  return <div className={`film-caption film-copy-${index}`} aria-hidden={hidden}>
    <p className="film-eyeline"><i />{label}</p>
    <h2>{scene.title} <em>{scene.emphasis}</em></h2>
    <p className="film-description">{scene.body}</p>
  </div>;
}

export function CaseFilm() {
  const { language } = useLanguage();
  const c = LANDING_CONTENT[language];
  const film = CASE_FILM[language];
  const cinematic = useSyncExternalStore(subscribeMode, hasRoomForFilm, () => false);
  const [chapter, setChapter] = useState(0);
  const track = useRef<HTMLElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const opening = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const photo = <figure className="film-negative" aria-hidden={cinematic && chapter === 0}>
    <img src="/images/consulta-panorama-1760.webp" srcSet="/images/consulta-panorama-920.webp 920w, /images/consulta-panorama-1760.webp 1760w"
      sizes="100vw" width="1760" height="764" decoding="async" alt={c.hero.photoAlt} />
    <div className="film-print-edge" aria-hidden="true"><span>{film.title}</span></div>
  </figure>;
  const script = <div className="film-script film-paper" aria-hidden={cinematic && chapter !== 2}>
    <span className="film-document-label"><FileText size={15}/>{film.script}</span>
    <q>{film.patient}</q>
  </div>;
  const rubric = <div className="film-rubric film-paper" aria-hidden={cinematic && chapter !== 2}>
    <span className="film-document-label"><ClipboardCheck size={16}/>{c.modules.sim.tag}</span>
    <strong>{film.title}</strong>
    <ul>{film.criteria.map((criterion, i) => <li key={criterion}>
      {i < 2 ? <Check size={16} aria-label={c.demo.observed} /> : <Minus size={16} />}
      {criterion}
    </li>)}</ul>
  </div>;
  const letter = <div className="film-letter film-paper" aria-hidden={cinematic && chapter !== 3}>
    <span className="film-document-label"><NotebookPen size={16} />{c.cards.feedback} · {c.cards.example}</span>
    <blockquote>{c.cards.feedbackText}</blockquote>
    <div className="film-next"><CornerDownRight size={17} /><div><b>{film.next}</b><p>{film.advice}</p></div></div>
  </div>;

  useLayoutEffect(() => {
    if (!cinematic || !track.current || !camera.current) return;
    const root = track.current;
    const viewport = camera.current;
    const intro = opening.current;
    const media = window.matchMedia("(max-width: 760px)");
    let shots = setUpCaseShots(viewport, media.matches);
    let frame = 0;
    let last = -1;
    let lastChapter = -1;
    function refresh() {
      frame = 0;
      const travel = root.offsetHeight - viewport.offsetHeight;
      const position = -root.getBoundingClientRect().top / Math.max(1, travel);
      const pinned = String(position >= 0 && position <= 1);
      if (root.dataset.pinned !== pinned) root.dataset.pinned = pinned;
      const p = Math.max(0, Math.min(1, position));
      if (p === last) return;
      last = p;
      shots.seek(p);
      meter.current?.style.setProperty("transform", `scaleX(${p})`);
      const active = p < .16 ? 0 : p < .445 ? 1 : p < .755 ? 2 : 3;
      if (active !== lastChapter) {
        lastChapter = active;
        setChapter(active);
        if (intro) intro.inert = active !== 0;
      }
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(refresh); }
    function resizeShots() {
      shots.dispose();
      shots = setUpCaseShots(viewport, media.matches);
      last = -1;
      schedule();
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    resize.observe(viewport);
    window.addEventListener("scroll", schedule, { passive: true });
    media.addEventListener("change", resizeShots);
    refresh();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      media.removeEventListener("change", resizeShots);
      shots.dispose();
      if (intro) intro.inert = false;
    };
  }, [cinematic]);

  function seek(index: number) {
    if (!track.current || !camera.current) return;
    const bounds = track.current.getBoundingClientRect();
    const travel = bounds.height - camera.current.offsetHeight;
    window.scrollTo({ top: window.scrollY + bounds.top + CHAPTER_STOPS[index] * travel, behavior: "smooth" });
  }

  if (!cinematic) return <div id="caso-clinico" className="film-linear">
    <ClinicalAtlas />
    <section aria-label={film.title} className="pf-wrap">
      {film.scenes.map((scene, i) => <article key={i}>
        <SceneCaption scene={scene} index={i + 1} label={film.example + " / " + film.chapters[i + 1]} />
        <div className="film-linear-art">{i === 0 ? photo : i === 1 ? <>{script}{rubric}</> : letter}</div>
      </article>)}
    </section>
  </div>;

  return <section ref={track} id="caso-clinico" className="film-track" data-chapter={chapter} aria-label={film.title}>
    <div ref={camera} className="film-camera">
      <div ref={opening} className="film-opening"><ClinicalAtlas active={chapter === 0} /></div>
      <div className="film-world">
        <div className="film-light-table" aria-hidden="true" />
        {photo}
        <div className="film-scrim" aria-hidden="true" />
        <div className="film-documents">{script}{rubric}{letter}</div>
        <div className="film-captions pf-wrap">
          {film.scenes.map((scene, i) => <SceneCaption key={i} index={i + 1} hidden={chapter !== i + 1} scene={scene} label={film.example + " / " + film.chapters[i + 1]}/>)}
        </div>
      </div>
      <div className="film-transport">
        <div className="pf-wrap">
          <button className="film-scroll-cue" onClick={() => seek(chapter === 3 ? 0 : chapter + 1)}>
            <ArrowDown size={15} />{chapter === 0 ? film.open : chapter === 3 ? film.replay : film.chapters[chapter + 1]}
          </button>
          <div className="film-stops" role="group" aria-label={film.title}>
            {film.chapters.map((name, i) => <button key={i} onClick={() => seek(i)} aria-label={name}
              aria-current={chapter === i ? "step" : undefined}><i /> <span>{name}</span></button>)}
          </div>
          <a href="#depois-do-caso">{film.skip}<ArrowDownRight size={14} /></a>
        </div>
        <div ref={meter} className="film-meter" aria-hidden="true" />
      </div>
    </div>
  </section>;
}
