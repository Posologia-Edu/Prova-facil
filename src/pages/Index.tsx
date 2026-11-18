import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity, Apple, ArrowRight, ArrowUpRight, Check, ClipboardCheck,
  ClipboardList, FileText, Gavel, GraduationCap, HeartPulse, LayoutGrid, MessagesSquare,
  Microscope, Pill, Plus, Sparkles, Stethoscope, Users,
} from "lucide-react";
import { LandingFooter } from "@/components/LandingFooter";
import { SalesAgent } from "@/components/SalesAgent";
import { CaseFilm } from "@/components/landing/CaseFilm";
import { FeatureReel } from "@/components/landing/FeatureReel";
import { CaseBookmark } from "@/components/landing/CaseBookmark";
import { LandingNav, Reveal, Typewriter, useLandingTheme } from "@/components/landing/landing-shared";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANDING_CONTENT, type LandingContent } from "@/lib/landing-content";
import { supabase } from "@/integrations/supabase/client";
import "./landing.css";

const moduleIcons = [ClipboardList, MessagesSquare, Stethoscope, FileText, Gavel, LayoutGrid];
const areaIcons = [Pill, HeartPulse, Stethoscope, Plus, Apple, Activity, Microscope];

function AssessmentDemo({ c }: { c: LandingContent }) {
  const [observations, setObservations] = useState([true, false, false]);
  const count = observations.filter(Boolean).length;
  return (
    <div className="pf-demo-stage" id="ficha-exemplo">
      <figure className="pf-consultation">
        <img src="/images/simulacao-clinica-560.webp"
          srcSet="/images/simulacao-clinica-560.webp 560w, /images/simulacao-clinica-1040.webp 1040w"
          sizes="(max-width: 700px) 92vw, 45vw" width="1040" height="1300" loading="lazy" alt={c.hero.photoAlt} />
        <figcaption><i />{c.hero.caption}</figcaption>
      </figure>
      <fieldset className="pf-sheet">
        <legend className="sr-only">{c.modules.sim.tag}</legend>
        <div className="pf-sheet-top"><ClipboardCheck size={19} />{c.modules.sim.tag}</div>
        <p className="pf-demo-instruction">{c.demo.instruction}</p>
        {c.modules.sim.rows.map((row, i) => (
          <label key={row} className="pf-check-row">
            <input type="checkbox" checked={observations[i]}
              onChange={() => setObservations(items => items.map((item, j) => j === i ? !item : item))} />
            <span className="pf-check" aria-hidden="true">{observations[i] && <Check size={14} />}</span>
            {row}
          </label>
        ))}
        <div className="pf-score" aria-live="polite">
          <span>{c.demo.observed}</span><strong>{count} / {observations.length}</strong>
        </div>
        <div className="pf-track" aria-hidden="true"><i style={{ width: `${100 * count / observations.length}%` }} /></div>
      </fieldset>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const c = LANDING_CONTENT[language];
  useLandingTheme();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/dashboard");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div lang={language} className="landing-root pf-home">
      <a className="pf-skip" href="#principal">{c.demo.skip}</a>
      <LandingNav home />
      <main id="principal">
        <CaseFilm />
        <CaseBookmark />
        <div className="pf-stat-band" data-reel-label={c.trust.eyebrow}>
          <dl className="pf-wrap pf-stats">{c.trust.stats.map(s => (
            <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>
          ))}</dl>
        </div>

        <section id="como-funciona" data-reel-label={c.how.eyebrow} className="pf-section pf-wrap pf-workflow">
          <Reveal>
            <p className="pf-kicker"><span className="pf-rule" />{c.how.eyebrow}</p>
            <h2>{c.how.heading}</h2>
            <ol className="pf-steps">{c.how.steps.map((s,i) => (
              <li key={s.title}><span>0{i+1}</span><div><h3>{s.title}</h3><p>{s.desc}</p></div></li>
            ))}</ol>
          </Reveal>
          <Reveal><AssessmentDemo c={c} /></Reveal>
        </section>

        <FeatureReel>
          <section id="plataforma" data-reel-label={c.modules.eyebrow} className="pf-platform">
            <div className="pf-wrap pf-section pf-split">
              <Reveal>
                <p className="pf-kicker"><span className="pf-rule" />{c.modules.eyebrow}</p>
                <h2>{c.modules.heading}</h2><p className="pf-lede">{c.modules.sub}</p>
                <Link className="pf-text-link" to="/funcionalidades">{c.demo.allFeatures}<ArrowUpRight size={17} /></Link>
              </Reveal>
              <Accordion type="single" collapsible defaultValue="module-0">
                {c.modules.items.map((m,i) => {
                  const Icon = moduleIcons[i];
                  return <AccordionItem key={m.title} value={`module-${i}`} className="pf-module">
                    <AccordionTrigger><span className="pf-module-name"><Icon size={21} />{m.title}</span></AccordionTrigger>
                    <AccordionContent><p>{m.desc}</p><div className="pf-tags">{m.premium && <b>Premium</b>}{m.tags.map(t => <span key={t}>{t}</span>)}</div></AccordionContent>
                  </AccordionItem>;
                })}
              </Accordion>
            </div>
          </section>

          <section id="areas" data-reel-label={c.areas.eyebrow} className="pf-section pf-wrap">
            <Reveal><p className="pf-kicker"><span className="pf-rule" />{c.areas.eyebrow}</p><h2>{c.areas.heading}</h2><p className="pf-lede">{c.areas.sub}</p></Reveal>
            <ul className="pf-areas">{c.areas.items.map((area,i) => {
              const Icon = areaIcons[i];
              return <li key={area}><Icon size={20} />{area}</li>;
            })}</ul>
          </section>

          <section className="pf-ai" data-reel-label={c.ai.eyebrow}>
            <div className="pf-wrap pf-section pf-split">
              <Reveal><p className="pf-kicker"><Sparkles size={17} />{c.ai.eyebrow}</p><h2>{c.ai.heading}</h2>
                <p className="pf-lede">{c.ai.sub}</p>
                <figure className="pf-feedback">
                  <figcaption>{c.cards.feedback} · {c.cards.example}</figcaption><blockquote>“<Typewriter text={c.cards.feedbackText} cps={44} />”</blockquote><small><Check size={16} />{c.cards.aiBadge}</small></figure>
              </Reveal>
              <ul className="pf-ai-list">{c.ai.items.map(it => <li key={it.title}><h3>{it.title}</h3><p>{it.desc}</p></li>)}</ul>
            </div>
          </section>
        </FeatureReel>

        <section className="pf-wrap pf-section pf-split" data-reel-label={c.roles.eyebrow}>
          <Reveal><p className="pf-kicker"><span className="pf-rule" />{c.roles.eyebrow}</p><h2>{c.roles.heading}</h2></Reveal>
          <Tabs defaultValue="teacher" className="pf-roles">
            <TabsList aria-label={c.roles.eyebrow}>
              <TabsTrigger value="teacher"><GraduationCap size={17} />{c.roles.teacher.label}</TabsTrigger>
              <TabsTrigger value="student"><Users size={17} />{c.roles.student.label}</TabsTrigger>
            </TabsList>
            {(["teacher", "student"] as const).map(role => <TabsContent key={role} value={role}>
              <ul>{c.roles[role].points.map(p => <li key={p}><Check size={16} />{p}</li>)}</ul>
            </TabsContent>)}
          </Tabs>
        </section>

        <section className="pf-resources pf-wrap" data-reel-label={c.demo.resources}>
          <h2>{c.demo.resources}</h2>
          <div>{c.trust.items.map(it => <div key={it.title}><h3>{it.title}</h3><p>{it.desc}</p></div>)}</div>
        </section>
        <section className="pf-cta" data-reel-label={c.cta.primary}>
          <div className="pf-wrap"><img className="pf-cta-art" src="/images/atlas-prova-520.webp" width="520" height="520" alt="" loading="lazy" /><h2>{c.cta.heading}</h2><p>{c.cta.sub}</p>
            <div className="pf-actions"><Link className="pf-button" to="/auth?tab=signup">{c.cta.primary}<ArrowRight size={18} /></Link><Link className="pf-text-link" to="/planos">{c.cta.secondary}<ArrowUpRight size={17} /></Link></div>
          </div>
        </section>
      </main>
      <LandingFooter description={c.footer} />
      <SalesAgent />
    </div>
  );
}
