// What-if overlays (text layer, Final only): countdown badges, the phone REC frame, the view counter,
// Kokabiel's "premium" notifications and the cancelled delivery.
import { interpolate, useCurrentFrame } from "remotion";
import tl from "../timeline_ep3.json";

const s = (k: number) => tl.lines[k - 1].start;
const e = (k: number) => tl.lines[k - 1].start + tl.lines[k - 1].duration;
const pop = (f: number, at: number) => interpolate(f, [at * 30, at * 30 + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const BADGES: [string, number, number][] = [["00:00", 0.3, s(3) - 0.1], ["+10 MIN", s(3) - 0.1, s(5) - 0.1], ["+1 JOUR", s(5) - 0.1, s(7) - 0.1], ["+3 JOURS", s(7) - 0.1, s(8) - 0.1], ["+1 SEMAINE", s(8) - 0.1, s(10) - 0.1], ["+1 MOIS", s(10) - 0.1, s(11) - 0.1], ["+1 AN", s(11) - 0.1, s(14) - 0.1]];
const card: React.CSSProperties = { background: "rgba(20,22,30,0.82)", borderRadius: 26, padding: "18px 24px", color: "#fff", font: "600 30px Inter", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" };

export const Ep3Overlay: React.FC = () => {
  const f = useCurrentFrame(), t = f / 30;
  const badge = BADGES.find(([, a, b]) => t >= a && t < b);
  const rec = (t < s(2) - 0.1) || (t >= s(4) - 0.1 && t < s(5) - 0.1);
  const views = t >= s(3) - 0.1 && t < s(4) - 0.1 ? Math.round(40_000_000 * Math.min(1, Math.pow((t - s(3)) / 3.2, 2))) : -1;
  const notif = t >= s(7) - 0.1 && t < s(8) - 0.1;
  const store = t >= s(10) + 3.0 && t < s(11) - 0.1;
  return (
    <>
      {badge && (
        <div style={{ position: "absolute", top: 200, left: 0, right: 0, textAlign: "center", transform: `scale(${0.8 + 0.2 * pop(f, badge[1])})`, opacity: pop(f, badge[1]) }}>
          <span style={{ display: "inline-block", padding: "12px 34px", borderRadius: 18, background: "#E63946", color: "#fff", font: "900 64px Inter", letterSpacing: "0.04em", boxShadow: "0 6px 24px rgba(0,0,0,0.5)" }}>{badge[0]}</span>
        </div>
      )}
      {rec && (
        <div style={{ position: "absolute", inset: 30, border: "4px solid rgba(255,255,255,0.75)", borderRadius: 40 }}>
          <div style={{ position: "absolute", top: 30, left: 34, font: "700 34px Inter", color: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 22, height: 22, borderRadius: 11, background: Math.floor(t * 2) % 2 ? "#ff3b30" : "#7a1c18", display: "inline-block" }} /> REC {String(Math.floor(t % 60)).padStart(2, "0")}:{String(f % 30).padStart(2, "0")}
          </div>
        </div>
      )}
      {views >= 0 && (
        <div style={{ position: "absolute", top: 1440, left: 0, right: 0, textAlign: "center" }}>
          <span style={{ ...card, display: "inline-block", font: "900 66px Inter" }}>👁 {views.toLocaleString("fr-FR")} vues</span>
        </div>
      )}
      {notif && [0, 1, 2].map((i) => {
        const at = s(7) + 0.6 + i * 0.9, o = pop(f, at);
        const txt = ["✨ Kokabiel · Ton horoscope PREMIUM est prêt", "✨ Kokabiel · Mercure t'a laissé un vocal", "✨ Kokabiel · Essai gratuit terminé : 9,99 €"][i];
        return <div key={i} style={{ position: "absolute", top: 1380 + i * 120, left: 60, right: 60, ...card, opacity: o, transform: `translateY(${(1 - o) * -30}px)` }}>{txt}</div>;
      })}
      {store && (
        <div style={{ position: "absolute", top: 1420, left: 90, right: 90, ...card, textAlign: "center", opacity: pop(f, s(10) + 3.0) }}>
          <div style={{ font: "900 46px Inter", color: "#ff6b5b" }}>❌ Commande annulée</div>
          <div style={{ font: "500 30px Inter", color: "rgba(255,255,255,0.85)", marginTop: 8 }}>Votre livreur a été mangé.</div>
        </div>
      )}
    </>
  );
};
void e;
