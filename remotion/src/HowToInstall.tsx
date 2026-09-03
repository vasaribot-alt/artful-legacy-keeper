import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Series,
} from "remotion";
import { theme } from "./theme";
import { SANS, SERIF, PaperGrain, Eyebrow, BigWords, ReelSafe } from "./InstagramShared";

/* ---------------------------------- shell --------------------------------- */

const Phone: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 80 } });
  return (
    <div
      style={{
        width: 520,
        height: 1040,
        borderRadius: 64,
        background: theme.ink,
        padding: 14,
        opacity: s,
        transform: `translateY(${(1 - s) * 60}px) scale(${0.95 + s * 0.05})`,
        boxShadow: "0 70px 110px -30px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 52,
          overflow: "hidden",
          background: theme.bg,
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            width: 130,
            height: 28,
            background: theme.ink,
            borderRadius: 16,
            zIndex: 60,
          }}
        />
        {children}
      </div>
    </div>
  );
};

const StepFrame: React.FC<{
  step: string;
  title: string;
  titleItalic?: string;
  caption: string;
  children: React.ReactNode;
}> = ({ step, title, titleItalic, caption, children }) => {
  const frame = useCurrentFrame();
  const o = (d: number) => interpolate(frame, [d, d + 16], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <PaperGrain />
      <AbsoluteFill
        style={{
          padding: "150px 70px 130px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 20,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: theme.muted,
            opacity: o(2),
          }}
        >
          {step}
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 68,
            lineHeight: 1.02,
            color: theme.ink,
            letterSpacing: "-0.02em",
            textAlign: "center",
            marginTop: 22,
            opacity: o(8),
          }}
        >
          {title}
          {titleItalic ? (
            <>
              {" "}
              <span style={{ fontStyle: "italic" }}>{titleItalic}</span>
            </>
          ) : null}
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", marginTop: 40 }}>
          {children}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 26,
            lineHeight: 1.45,
            color: theme.inkSoft,
            textAlign: "center",
            maxWidth: 780,
            opacity: o(30),
          }}
        >
          {caption}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Tap: React.FC<{ start: number; x: number; y: number; size?: number }> = ({
  start,
  x,
  y,
  size = 90,
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [start, start + 6, start + 30], [0, 1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const sc = interpolate(frame, [start, start + 30], [0.35, 1.9], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "50%",
        border: `3px solid ${theme.ink}`,
        opacity: o * 0.55,
        transform: `scale(${sc})`,
        zIndex: 70,
      }}
    />
  );
};

const GarfMark: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <div
    style={{
      fontFamily: SERIF,
      fontSize: size,
      letterSpacing: "0.02em",
      color: theme.ink,
      lineHeight: 1,
    }}
  >
    GARF
  </div>
);

/* --------------------------------- scene 1 -------------------------------- */

const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 8, fps, config: { damping: 20, stiffness: 80 } });
  const sub = interpolate(frame, [50, 80], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <PaperGrain />
      <AbsoluteFill
        style={{
          padding: "220px 64px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Eyebrow text="Global Artist Registry Foundation" delay={2} />
        <div style={{ marginTop: 28 }}>
          <BigWords lines={["Keep the Registry", "one tap away."]} delay={8} size={78} italicIndex={1} />
        </div>
        <div
          style={{
            marginTop: 46,
            fontFamily: SANS,
            fontSize: 26,
            lineHeight: 1.45,
            color: theme.inkSoft,
            maxWidth: 760,
            opacity: sub,
          }}
        >
          Add GARF to your home screen on iPhone and Android. Sign in once, then open it
          like an app.
        </div>
        <div
          style={{
            marginTop: 44,
            padding: "20px 40px",
            background: theme.ink,
            color: theme.bg,
            borderRadius: 14,
            fontFamily: SANS,
            fontSize: 24,
            fontWeight: 700,
            opacity: s,
            transform: `translateY(${(1 - s) * 26}px)`,
          }}
        >
          globalartistregistry.org
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* --------------------------------- scene 2 -------------------------------- */

const NAV = ["About", "Artists", "Registry", "Collectors", "Registrars", "Donate"];

const SceneSlideMenu: React.FC = () => {
  const frame = useCurrentFrame();
  // Drag the nav sideways twice
  const shift = interpolate(
    frame,
    [40, 90, 110, 150],
    [0, -210, -210, -360],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );
  const handX = interpolate(frame, [40, 90, 110, 150], [400, 190, 400, 250], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const handO = interpolate(frame, [32, 44, 150, 164], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <StepFrame
      step="Step 01"
      title="Slide the top menu."
      caption="On a phone the menu scrolls sideways, so every section stays reachable."
    >
      <Phone>
        {/* header */}
        <div
          style={{
            paddingTop: 62,
            paddingBottom: 14,
            borderBottom: `1px solid ${theme.ink}12`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 20,
          }}
        >
          <GarfMark size={30} />
        </div>
        {/* sliding nav */}
        <div style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${theme.ink}10` }}>
          <div
            style={{
              display: "flex",
              gap: 26,
              padding: "16px 20px",
              transform: `translateX(${shift}px)`,
              whiteSpace: "nowrap",
            }}
          >
            {NAV.map((n, i) => (
              <div
                key={n}
                style={{
                  fontFamily: SANS,
                  fontSize: 19,
                  color: i === 0 ? theme.ink : theme.inkSoft,
                  fontWeight: i === 0 ? 600 : 400,
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
        {/* page peek */}
        <div style={{ flex: 1, padding: 24 }}>
          <div style={{ fontFamily: SERIF, fontSize: 40, color: theme.ink, lineHeight: 1.05 }}>
            A permanent record
            <br />
            of your work.
          </div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 10,
                borderRadius: 3,
                background: `${theme.ink}12`,
                marginTop: i === 0 ? 30 : 14,
                width: i === 2 ? "60%" : "100%",
              }}
            />
          ))}
          <div
            style={{
              marginTop: 34,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 130,
                  background: theme.card,
                  border: `1px solid ${theme.ink}10`,
                  borderRadius: 8,
                }}
              />
            ))}
          </div>
        </div>
        {/* dragging hand */}
        <div
          style={{
            position: "absolute",
            top: 132,
            left: handX,
            width: 54,
            height: 54,
            marginLeft: -27,
            marginTop: -27,
            borderRadius: "50%",
            background: `${theme.ink}18`,
            border: `2px solid ${theme.ink}55`,
            opacity: handO,
            zIndex: 70,
          }}
        />
      </Phone>
    </StepFrame>
  );
};

/* --------------------------------- scene 3 -------------------------------- */

const SceneSignIn: React.FC = () => {
  const frame = useCurrentFrame();
  const emailChars = Math.floor(
    interpolate(frame, [30, 78], [0, 26], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
  );
  const pwChars = Math.floor(
    interpolate(frame, [86, 118], [0, 10], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
  );
  const email = "anna@artiststudio.com".slice(0, emailChars);
  const pw = "••••••••••".slice(0, pwChars);
  const signedIn = interpolate(frame, [150, 172], [0, 1], { extrapolateRight: "clamp" });

  return (
    <StepFrame
      step="Step 02"
      title="Sign in once."
      caption="Your session stays active, so the icon opens straight into your archive."
    >
      <Phone>
        <div
          style={{
            flex: 1,
            padding: "100px 34px 34px",
            display: "flex",
            flexDirection: "column",
            opacity: 1 - signedIn,
          }}
        >
          <GarfMark size={34} />
          <div style={{ fontFamily: SERIF, fontSize: 40, color: theme.ink, marginTop: 46 }}>
            Sign in
          </div>
          <div style={{ fontFamily: SANS, fontSize: 17, color: theme.muted, marginTop: 10 }}>
            Enter your credentials to access your archive.
          </div>

          {[
            { label: "Email", value: email },
            { label: "Password", value: pw },
          ].map((f) => (
            <div key={f.label} style={{ marginTop: 30 }}>
              <div style={{ fontFamily: SANS, fontSize: 15, color: theme.inkSoft }}>{f.label}</div>
              <div
                style={{
                  marginTop: 8,
                  height: 54,
                  borderRadius: 8,
                  border: `1px solid ${theme.ink}22`,
                  background: theme.card,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  fontFamily: SANS,
                  fontSize: 18,
                  color: theme.ink,
                }}
              >
                {f.value}
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: 36,
              height: 56,
              borderRadius: 8,
              background: theme.ink,
              color: theme.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Sign In
          </div>
        </div>

        {/* dashboard reveal */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: theme.bg,
            opacity: signedIn,
            padding: "100px 26px 26px",
          }}
        >
          <div style={{ fontFamily: SERIF, fontSize: 34, color: theme.ink }}>Your Artworks</div>
          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  height: 150,
                  background: theme.card,
                  border: `1px solid ${theme.ink}12`,
                  borderRadius: 8,
                }}
              />
            ))}
          </div>
        </div>

        <Tap start={130} x={260} y={720} />
      </Phone>
    </StepFrame>
  );
};

/* --------------------------------- scene 4 -------------------------------- */

const SheetRow: React.FC<{
  label: string;
  glyph: string;
  highlight?: boolean;
}> = ({ label, glyph, highlight }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 18px",
      borderBottom: `1px solid ${theme.ink}0D`,
      background: highlight ? `${theme.ink}0A` : "transparent",
      fontFamily: SANS,
      fontSize: 19,
      color: theme.ink,
      fontWeight: highlight ? 600 : 400,
    }}
  >
    <span>{label}</span>
    <span style={{ fontSize: 20, color: theme.inkSoft }}>{glyph}</span>
  </div>
);

const SceneIphone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sheet = spring({ frame: frame - 60, fps, config: { damping: 24, stiffness: 90 } });
  const added = interpolate(frame, [170, 190], [0, 1], { extrapolateRight: "clamp" });

  return (
    <StepFrame
      step="Step 03 — iPhone"
      title="Share, then"
      titleItalic="Add to Home Screen."
      caption="In Safari, tap the share icon, scroll to Add to Home Screen, then tap Add."
    >
      <Phone>
        {/* page */}
        <div style={{ flex: 1, padding: "100px 26px 0" }}>
          <GarfMark size={30} />
          <div style={{ fontFamily: SERIF, fontSize: 36, color: theme.ink, marginTop: 30 }}>
            Your Artworks
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                marginTop: 14,
                height: 74,
                background: theme.card,
                border: `1px solid ${theme.ink}10`,
                borderRadius: 8,
              }}
            />
          ))}
        </div>

        {/* safari bottom bar */}
        <div
          style={{
            borderTop: `1px solid ${theme.ink}15`,
            padding: "16px 26px 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: SANS,
            fontSize: 24,
            color: theme.inkSoft,
            background: theme.bgDeep,
          }}
        >
          <span>‹</span>
          <span>›</span>
          <span style={{ color: theme.ink, fontSize: 26 }}>⬆</span>
          <span>▢</span>
          <span>⧉</span>
        </div>

        <Tap start={40} x={260} y={936} />

        {/* share sheet */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 560,
            background: theme.card,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            boxShadow: "0 -30px 60px rgba(0,0,0,0.18)",
            transform: `translateY(${(1 - sheet) * 560}px)`,
            zIndex: 65,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px 18px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: `1px solid ${theme.ink}12`,
            }}
          >
            <div>
              <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, color: theme.ink }}>
                Global Artist Registry
              </div>
              <div style={{ fontFamily: SANS, fontSize: 14, color: theme.muted }}>
                globalartistregistry.org
              </div>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 16, color: theme.inkSoft }}>Options ›</div>
          </div>
          <SheetRow label="Add to Reading List" glyph="◇" />
          <SheetRow label="Add Bookmark" glyph="▢" />
          <SheetRow label="Add to Home Screen" glyph="⊞" highlight={frame > 118} />
          <SheetRow label="Markup" glyph="✎" />
          <SheetRow label="Print" glyph="⎙" />
          <Tap start={122} x={260} y={300} />
        </div>

        {/* add dialog */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `${theme.ink}55`,
            opacity: added,
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 380,
              background: theme.card,
              borderRadius: 16,
              padding: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: SANS,
                fontSize: 17,
                color: theme.inkSoft,
              }}
            >
              <span>Cancel</span>
              <span style={{ fontWeight: 600, color: theme.ink }}>Add to Home Screen</span>
              <span style={{ fontWeight: 600, color: theme.ink }}>Add</span>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 24 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: theme.bg,
                  border: `1px solid ${theme.ink}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GarfMark size={17} />
              </div>
              <div
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 8,
                  border: `1px solid ${theme.ink}20`,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  fontFamily: SANS,
                  fontSize: 17,
                  color: theme.ink,
                }}
              >
                GARF
              </div>
            </div>
          </div>
        </div>
      </Phone>
    </StepFrame>
  );
};

/* --------------------------------- scene 5 -------------------------------- */

const MenuRow: React.FC<{ label: string; highlight?: boolean }> = ({ label, highlight }) => (
  <div
    style={{
      padding: "16px 18px",
      fontFamily: SANS,
      fontSize: 19,
      color: theme.ink,
      background: highlight ? `${theme.ink}0A` : "transparent",
      fontWeight: highlight ? 600 : 400,
    }}
  >
    {label}
  </div>
);

const SceneAndroid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const menuIn = spring({ frame: frame - 55, fps, config: { damping: 26, stiffness: 110 } });
  const menu = menuIn * interpolate(frame, [142, 156], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const dialog = interpolate(frame, [150, 170], [0, 1], { extrapolateRight: "clamp" });

  return (
    <StepFrame
      step="Step 03 — Android"
      title="Menu, then"
      titleItalic="Install app."
      caption="In Chrome, open the three dot menu and choose Add to Home screen, then Install."
    >
      <Phone>
        {/* chrome top bar */}
        <div
          style={{
            paddingTop: 62,
            paddingBottom: 14,
            paddingLeft: 20,
            paddingRight: 20,
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: theme.bgDeep,
            borderBottom: `1px solid ${theme.ink}12`,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 44,
              borderRadius: 22,
              background: theme.card,
              border: `1px solid ${theme.ink}12`,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              fontFamily: SANS,
              fontSize: 16,
              color: theme.inkSoft,
            }}
          >
            globalartistregistry.org
          </div>
          <div style={{ fontFamily: SANS, fontSize: 24, color: theme.ink, lineHeight: 0.8 }}>⋮</div>
        </div>

        <div style={{ flex: 1, padding: "26px" }}>
          <GarfMark size={28} />
          <div style={{ fontFamily: SERIF, fontSize: 34, color: theme.ink, marginTop: 26 }}>
            Your Artworks
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                marginTop: 14,
                height: 74,
                background: theme.card,
                border: `1px solid ${theme.ink}10`,
                borderRadius: 8,
              }}
            />
          ))}
        </div>

        <Tap start={34} x={462} y={100} size={70} />

        {/* chrome menu */}
        <div
          style={{
            position: "absolute",
            top: 118,
            right: 16,
            width: 300,
            background: theme.card,
            borderRadius: 12,
            boxShadow: "0 24px 50px rgba(0,0,0,0.22)",
            paddingTop: 8,
            paddingBottom: 8,
            transformOrigin: "top right",
            transform: `scale(${0.85 + menu * 0.15})`,
            opacity: menu,
            zIndex: 65,
            overflow: "hidden",
          }}
        >
          <MenuRow label="New tab" />
          <MenuRow label="History" />
          <MenuRow label="Downloads" />
          <MenuRow label="Add to Home screen" highlight={frame > 108} />
          <MenuRow label="Desktop site" />
          <MenuRow label="Settings" />
          <Tap start={112} x={150} y={210} size={80} />
        </div>

        {/* install dialog */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `${theme.ink}55`,
            opacity: dialog,
            zIndex: 70,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              margin: 20,
              width: "100%",
              background: theme.card,
              borderRadius: 18,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 14,
                  background: theme.bg,
                  border: `1px solid ${theme.ink}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GarfMark size={15} />
              </div>
              <div>
                <div style={{ fontFamily: SANS, fontSize: 19, fontWeight: 600, color: theme.ink }}>
                  Install app
                </div>
                <div style={{ fontFamily: SANS, fontSize: 15, color: theme.muted }}>
                  globalartistregistry.org
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 22,
                display: "flex",
                justifyContent: "flex-end",
                gap: 22,
                fontFamily: SANS,
                fontSize: 18,
              }}
            >
              <span style={{ color: theme.inkSoft }}>Cancel</span>
              <span style={{ color: theme.ink, fontWeight: 600 }}>Install</span>
            </div>
          </div>
        </div>
      </Phone>
    </StepFrame>
  );
};

/* --------------------------------- scene 6 -------------------------------- */

const SceneHomeScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 45, fps, config: { damping: 12, stiffness: 140 } });

  return (
    <StepFrame
      step="Done"
      title="Open it like"
      titleItalic="an app."
      caption="The icon sits on your home screen and opens the Registry full screen, without the browser bars."
    >
      <Phone>
        <div
          style={{
            flex: 1,
            paddingTop: 110,
            paddingLeft: 30,
            paddingRight: 30,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 22,
            alignContent: "start",
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: 86,
                borderRadius: 20,
                background: `${theme.ink}0E`,
                border: `1px solid ${theme.ink}0D`,
              }}
            />
          ))}
          <div style={{ position: "relative" }}>
            <div
              style={{
                height: 86,
                borderRadius: 20,
                background: theme.card,
                border: `1px solid ${theme.ink}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${0.4 + pop * 0.6})`,
                opacity: pop,
                boxShadow: "0 14px 28px -8px rgba(0,0,0,0.25)",
              }}
            >
              <GarfMark size={16} />
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 13,
                color: theme.inkSoft,
                textAlign: "center",
                marginTop: 8,
                opacity: pop,
              }}
            >
              GARF
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "0 30px 40px",
            fontFamily: SANS,
            fontSize: 15,
            color: theme.muted,
            textAlign: "center",
          }}
        >
          globalartistregistry.org
        </div>
      </Phone>
    </StepFrame>
  );
};

/* ---------------------------------- video --------------------------------- */

export const HowToInstall: React.FC = () => (
  <AbsoluteFill style={{ background: theme.bg }}>
    <ReelSafe>
    <Series>
      <Series.Sequence durationInFrames={140}>
        <SceneTitle />
      </Series.Sequence>
      <Series.Sequence durationInFrames={190}>
        <SceneSlideMenu />
      </Series.Sequence>
      <Series.Sequence durationInFrames={210}>
        <SceneSignIn />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <SceneIphone />
      </Series.Sequence>
      <Series.Sequence durationInFrames={230}>
        <SceneAndroid />
      </Series.Sequence>
      <Series.Sequence durationInFrames={150}>
        <SceneHomeScreen />
      </Series.Sequence>
    </Series>
    </ReelSafe>
  </AbsoluteFill>
);
