// Edge function: optimize-image
// Receives a base64 image, returns a web-optimized JPEG (max 2000px wide, ~85% quality).
// The original is uploaded separately by the client and remains untouched.

import { corsHeaders } from "@supabase/supabase-js/cors";

const MAX_DIMENSION = 2000;
const QUALITY = 0.85;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64 → Uint8Array
    const bin = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bin], { type: mimeType || "image/jpeg" });

    // Decode using ImageBitmap (Deno deploy supports this via Web APIs)
    const bitmap = await createImageBitmap(blob);

    let { width, height } = bitmap;
    const ratio = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetW = Math.round(width * ratio);
    const targetH = Math.round(height * ratio);

    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not available");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const outBlob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: QUALITY,
    });
    const buf = new Uint8Array(await outBlob.arrayBuffer());

    // base64 encode (chunked to avoid stack overflow on large arrays)
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode.apply(null, buf.subarray(i, i + chunk) as unknown as number[]);
    }
    const optimizedBase64 = btoa(binary);

    return new Response(
      JSON.stringify({
        optimizedBase64,
        width: targetW,
        height: targetH,
        size: buf.length,
        mimeType: "image/jpeg",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("optimize-image error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
