import { theme } from "../theme";
import React from "react";

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  scale?: number;
  rotate?: number;
  translateY?: number;
  opacity?: number;
}> = ({ children, scale = 1, rotate = 0, translateY = 0, opacity = 1 }) => {
  return (
    <div style={{
      width: 440, height: 900, borderRadius: 56,
      background: theme.ink, padding: 16,
      opacity,
      transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
      boxShadow: "0 60px 100px -25px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.3)",
    }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 42, overflow: "hidden",
        background: theme.bg, position: "relative",
        display: "flex", flexDirection: "column",
      }}>
        {/* Notch */}
        <div style={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          width: 120, height: 26, background: theme.ink, borderRadius: 16, zIndex: 50,
        }} />
        {children}
      </div>
    </div>
  );
};

export const PhoneHeader: React.FC<{ title: string; role?: string }> = ({ title, role = "Artist" }) => (
  <div style={{
    paddingTop: 58, paddingLeft: 22, paddingRight: 22, paddingBottom: 14,
    borderBottom: `1px solid ${theme.ink}12`,
    display: "flex", alignItems: "center", gap: 12,
    fontFamily: "DM Sans",
  }}>
    <div style={{ fontSize: 22, color: theme.inkSoft, lineHeight: 1 }}>‹</div>
    <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: theme.ink }}>{title}</div>
    <div style={{
      fontSize: 11, padding: "5px 10px", border: `1px solid ${theme.ink}25`,
      borderRadius: 6, color: theme.inkSoft, textTransform: "lowercase",
    }}>{role}</div>
  </div>
);
