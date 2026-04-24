import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "mock-trial-images";

async function tryGenerate(prompt: string, attempt: number, timeoutMs = 60000): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const enrichedPrompt = attempt === 1
      ? `Generate a HIGHLY REALISTIC medical imaging exam, as if officially issued by a hospital diagnostic department. Proper grayscale for X-ray/CT/MRI, proper colors and grid for ECG, proper microscopy appearance for histology. Include realistic anatomical orientation markers. NO captions, NO text overlays explaining the finding. Description: ${prompt}`
      : `Realistic medical exam image (radiology/ECG/microscopy as appropriate). Clean, no text overlay, no captions, single centered diagnostic image. ${prompt}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: enrichedPrompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!resp.ok) {
      console.error(`Image gen attempt ${attempt} failed:`, resp.status, (await resp.text()).slice(0, 300));
      return null;
    }
    const data = await resp.json();
    const msg = data.choices?.[0]?.message;
    let url: string | null =
      msg?.images?.[0]?.image_url?.url ||
      msg?.images?.[0]?.url ||
      msg?.image_url?.url ||
      null;
    if (!url && typeof msg?.content === "string") {
      const m = msg.content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/);
      if (m) url = m[0];
    }
    if (!url && Array.isArray(msg?.content)) {
      for (const part of msg.content) {
        if (part?.type === "image_url" && part?.image_url?.url) {
          url = part.image_url.url;
          break;
        }
      }
    }
    return url || null;
  } catch (e) {
    console.error(`Image gen attempt ${attempt} error:`, (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageId } = await req.json();
    if (!imageId) {
      return new Response(JSON.stringify({ error: "imageId é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: img, error: fetchErr } = await supabase
      .from("mock_trial_case_images")
      .select("*")
      .eq("id", imageId)
      .single();

    if (fetchErr || !img) {
      return new Response(JSON.stringify({ error: "Imagem não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("mock_trial_case_images")
      .update({ status: "processing", error_message: null, attempts: (img.attempts || 0) + 1 })
      .eq("id", imageId);

    let dataUrl: string | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      dataUrl = await tryGenerate(img.prompt || img.title || img.slug, attempt);
      if (dataUrl) break;
    }

    if (!dataUrl) {
      await supabase
        .from("mock_trial_case_images")
        .update({ status: "failed", error_message: "A IA não retornou uma imagem válida." })
        .eq("id", imageId);
      return new Response(JSON.stringify({ error: "Falha na geração da imagem" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate base64 data URL
    const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!m) {
      await supabase
        .from("mock_trial_case_images")
        .update({ status: "failed", error_message: "Formato de imagem inválido retornado pela IA." })
        .eq("id", imageId);
      return new Response(JSON.stringify({ error: "Formato inválido" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    const base64 = m[2];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const path = `${img.case_id}/${img.slug}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: `image/${m[1]}`, upsert: true });

    if (upErr) {
      console.error("Storage upload error:", upErr);
      await supabase
        .from("mock_trial_case_images")
        .update({ status: "failed", error_message: "Erro ao salvar imagem no storage." })
        .eq("id", imageId);
      return new Response(JSON.stringify({ error: "Erro ao salvar" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await supabase
      .from("mock_trial_case_images")
      .update({
        status: "ready",
        image_url: urlData.publicUrl,
        storage_path: path,
        error_message: null,
      })
      .eq("id", imageId);

    return new Response(JSON.stringify({ url: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-mock-trial-image error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
