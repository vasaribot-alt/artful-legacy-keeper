import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";

const Field: React.FC<{ label: string; value: string; delay: number; typeFrom: number; typeTo: number; multiline?: boolean }> = ({ label, value, delay, typeFrom, typeTo, multiline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 110 } });
  const t = Math.min(1, Math.max(0, (frame - typeFrom) / (typeTo - typeFrom)));
  const shown = value.slice(0, Math.floor(t * value.length));
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * 12}px)` }}>
      <div style={{ fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.muted, marginBottom: 10 }}>{label}</div>
      <div style={{
        minHeight: multiline ? 110 : 52,
        borderBottom: `1.5px solid ${theme.ink}`,
        display: "flex", alignItems: multiline ? "flex-start" : "center",
        fontFamily: multiline ? "DM Serif Display" : "DM Sans",
        fontSize: multiline ? 22 : 22, color: theme.ink,
        paddingTop: multiline ? 6 : 0, lineHeight: 1.4,
      }}>
        <span>
          {shown}
          <span style={{ opacity: frame % 30 < 15 && t < 1 ? 1 : 0, marginLeft: 2 }}>|</span>
        </span>
      </div>
    </div>
  );
};

const SocialChip: React.FC<{ icon: string; handle: string; delay: number }> = ({ icon, handle, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 110 } });
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", border: `1px solid ${theme.ink}25`, borderRadius: 4,
      fontFamily: "DM Sans", fontSize: 15, color: theme.ink,
      opacity: s, transform: `translateY(${(1 - s) * 10}px)`,
    }}>
      <div style={{
        width: 22, height: 22, background: theme.ink, color: theme.bg, fontSize: 12,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600,
      }}>{icon}</div>
      <span>{handle}</span>
    </div>
  );
};

export const SceneProfileBasics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardS = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });
  const sideO = interpolate(frame, [0, 26], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ width: 420, opacity: sideO, transform: `translateX(${(1 - sideO) * -20}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", color: theme.muted, marginBottom: 22 }}>Step 01</div>
        <div style={{ fontFamily: "DM Serif Display", fontSize: 76, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
          The<br/>essentials.
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 21, color: theme.inkSoft, marginTop: 28, lineHeight: 1.5 }}>
          A short bio, your location, website and social handles.
        </div>
      </div>

      <div style={{
        width: 740, padding: "52px 60px", background: theme.card, borderRadius: 12,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        transform: `translateY(${(1 - cardS) * 60}px)`, opacity: cardS,
        display: "flex", flexDirection: "column", gap: 26,
      }}>
        <div>
          <div style={{ fontFamily: "DM Serif Display", fontSize: 32, color: theme.ink }}>Your profile</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 15, color: theme.muted, marginTop: 4 }}>Public on your artist page.</div>
        </div>
        <Field label="Short bio" value="Lives and works between Oslo and Lisbon." delay={20} typeFrom={36} typeTo={130} multiline />
        <Field label="Location" value="Oslo, Norway" delay={70} typeFrom={140} typeTo={180} />
        <Field label="Website" value="sashalindqvist.studio" delay={110} typeFrom={186} typeTo={224} />

        <div>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.muted, marginBottom: 12 }}>Social</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SocialChip icon="IG" handle="@sasha.lindqvist" delay={150} />
            <SocialChip icon="IN" handle="/in/sashalindqvist" delay={165} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
