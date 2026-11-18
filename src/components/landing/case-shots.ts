// Each keyframe is a position in the native scroll range. Paused animations can be
// sought in either direction without queues, timers or a second animation clock.
export const CHAPTER_STOPS = [0, .3, .62, .93] as const;

type Cue = [offset: number, transform: string, opacity: number];
const still = "translate3d(0,0,0) scale(1)";

export function setUpCaseShots(camera: HTMLElement, narrow: boolean) {
  const shots: Animation[] = [];
  function track(selector: string, cues: Cue[]) {
    const node = camera.querySelector<HTMLElement>(selector);
    if (!node) return;
    const animation = node.animate(cues.map(([offset, transform, opacity]) => ({
      offset, transform, opacity, easing: "ease-in-out",
    })), { duration: 1000, fill: "both" });
    animation.pause();
    animation.currentTime = 0;
    shots.push(animation);
  }
  track(".film-opening", [
    [0, still, 1], [.035, still, 1], [.215, "translate3d(-5%,-6%,0) scale(.9)", 0],
    [1, "scale(.9)", 0],
  ]);
  const photoBack = narrow ? "translate3d(3%,-20%,0) scale(.58) rotate(-8deg)" : "translate3d(20%,-10%,0) scale(.42) rotate(-8deg)";
  const photoFinal = narrow ? "translate3d(-5%,-20%,0) scale(.48) rotate(-13deg)" : "translate3d(16%,-13%,0) scale(.34) rotate(-12deg)";
  track(".film-negative", [
    [0, "translate3d(19%,6%,0) scale(.25) rotate(7deg)", 0],
    [.065, "translate3d(19%,6%,0) scale(.25) rotate(7deg)", 0],
    [.24, still, 1], [.37, still, 1], [.56, photoBack, 1], [.68, photoBack, 1],
    [.87, photoFinal, .83], [1, photoFinal, .83],
  ]);
  track(".film-negative img", [[0, "scale(1.19)", 1], [.37, "scale(1)", 1], [.68, "scale(1.12)", 1], [1, "scale(1.06)", 1]]);
  track(".film-scrim", [[0, still, 0], [.21, still, .96], [.38, still, .96], [.54, still, 0], [1, still, 0]]);
  track(".film-print-edge", [[0, still, 0], [.38, still, 0], [.55, still, 1], [1, still, 1]]);
  const openScript = narrow ? "translate3d(-9%,-75%,0) rotate(-6deg) scale(.9)" : "translate3d(-8%,-86%,0) rotate(-6deg) scale(.92)";
  track(".film-script", [
    [0, "translate3d(-2%,37%,0) rotate(-10deg) scale(.72)", 0],
    [.38, "translate3d(-2%,37%,0) rotate(-10deg) scale(.72)", 0],
    [.55, openScript, 1], [.69, openScript, 1],
    [.88, "translate3d(-9%,-43%,0) rotate(-9deg) scale(.85)", .72], [1, "translate3d(-9%,-43%,0) rotate(-9deg) scale(.85)", .72],
  ]);
  track(".film-rubric", [
    [0, "perspective(900px) translateY(65%) rotateX(48deg) rotateZ(-4deg) scale(.8)", 0],
    [.43, "perspective(900px) translateY(65%) rotateX(48deg) rotateZ(-4deg) scale(.8)", 0],
    [.59, "perspective(900px) translateY(9%) rotateX(0deg) rotateZ(2deg) scale(1)", 1],
    [.69, "perspective(900px) translateY(9%) rotateX(0deg) rotateZ(2deg) scale(1)", 1],
    [.89, "translate3d(-4%,-9%,0) rotate(-4deg) scale(.94)", .83], [1, "translate3d(-4%,-9%,0) rotate(-4deg) scale(.94)", .83],
  ]);
  track(".film-letter", [
    [0, "perspective(900px) translate3d(10%,60%,0) rotateX(45deg) rotateZ(8deg) scale(.85)", 0],
    [.71, "perspective(900px) translate3d(10%,60%,0) rotateX(45deg) rotateZ(8deg) scale(.85)", 0],
    [.88, still, 1], [1, still, 1],
  ]);

  const enter = "translate3d(0,20%,0)";
  const leave = "translate3d(0,-14%,0)";
  function caption(index: number, start: number, hold: number, end?: number) {
    const cues: Cue[] = [[0, enter, 0], [start, enter, 0], [hold, still, 1]];
    if (end) cues.push([end, still, 1], [end + .085, leave, 0], [1, leave, 0]);
    else cues.push([1, still, 1]);
    track(`.film-copy-${index}`, cues);
  }
  caption(1, .135, .235, .365);
  caption(2, .44, .54, .685);
  caption(3, .765, .86);

  return {
    seek(progress: number) { for (const shot of shots) shot.currentTime = progress * 1000; },
    dispose() { for (const shot of shots) shot.cancel(); },
  };
}
