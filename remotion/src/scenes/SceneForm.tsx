import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const Field: React.FC<{ label: string; value: string; delay: number; typeFrom: number; typeTo: number; mask?: boolean }> = ({ label, value, delay, typeFrom, typeTo, mask }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 110 } });
  const t = Math.min(1, Math.max(0, (frame - typeFrom) / (typeTo - typeFrom)));
  const shown = value.slice(0, Math.floor(t * value.length));
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * 12}px)` }}>
      <div style={{ fontFamily: "DM Sans", fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.muted, marginBottom: 10 }}>{label}</div>
      <div style={{ height: 56, borderBottom: `1.5px solid ${theme.ink}`, display: "flex", alignItems: "center", fontFamily: "DM Sans", fontSize: 24, color: theme.ink }}>
        {mask ? "•".repeat(shown.length) : shown}
        <span style={{ opacity: frame % 30 < 15 && t < 1 ? 1 : 0, marginLeft: 2 }}>|</span>
      </div>
    </div>
  );
};

const RoleChip: React.FC<{ label: string; selected: boolean; delay: number }> = ({ label, selected, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 110 } });
  return (
    <div style={{
      flex: 1, padding: "20px 24px", borderRadius: 4,
      background: selected ? theme.ink : "transparent",
      color: selected ? theme.bg : theme.ink,
      border: `1px solid ${selected ? theme.ink : theme.ink + "30"}`,
      fontFamily: "DM Sans", fontSize: 20, textAlign: "center",
      transform: `translateY(${(1 - s) * 12}px) scale(${selected ? 1 + (1 - Math.min(1, Math.max(0,(frame-195)/12))) * 0.04 : 1})`,
      opacity: s,
    }}>{label}</div>
  );
};

export const SceneForm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 80 }}>
      {/* left side commentary */}
      <div style={{ width: 460, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 02</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 84, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          Fill in<br/>your details.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 22, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          Use your full passport name — it must match your ID for verification.
        </div>
      </div>

      {/* form card */}
      <div style={{
        width: 720, padding: "60px 64px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column", gap: 32,
      }}>
        <div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 36, color: theme.ink }}>Create your vault</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 16, color: theme.muted, marginTop: 6 }}>Register to start documenting and preserving art.</div>
        </div>
        <Field label="Full name" value="Sasha Lindqvist" delay={20} typeFrom={40} typeTo={110} />
        <Field label="Email" value="sasha@studio.example" delay={60} typeFrom={120} typeTo={180} />
        <Field label="Password" value="••••••••••••" delay={100} typeFrom={188} typeTo={220} mask />

        <div>
          <div style={{ fontFamily: "DM Sans", fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.muted, marginBottom: 12 }}>I am a</div>
          <div style={{ display: "flex", gap: 10 }}>
            <RoleChip label="Artist" selected={frame >= 195} delay={130} />
            <RoleChip label="Collector" selected={false} delay={140} />
            <RoleChip label="Registrar" selected={false} delay={150} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
