import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiImageWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_TYPE_LABELS: Record<string, string> = {
  radiography: "radiografia convencional (raio-X)",
  ct: "tomografia computadorizada (TC/CT scan)",
  mri: "ressonância magnética (RM/MRI)",
  histology: "lâmina histopatológica vista ao microscópio",
  ecg: "eletrocardiograma (ECG/EKG) em papel milimetrado",
  ultrasound: "imagem de ultrassonografia",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { questionText, imageType, details } = await req.json();

    if (!questionText || !imageType) {
      return new Response(JSON.stringify({ error: "questionText e imageType são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = IMAGE_TYPE_LABELS[imageType] || imageType;
    const detailsText = details ? `\nDetalhes adicionais: ${details}` : "";

    const prompt = `Generate a realistic, high-quality synthetic medical image for educational purposes.

Type of image: ${typeLabel}

The image should be clinically accurate and based on the following clinical question context:
"${questionText}"
${detailsText}

IMPORTANT RULES:
- The image must look realistic and professional, as if from a real medical exam
- Do NOT include any text, labels, annotations, or watermarks on the image
- Do NOT include patient identifying information
- The image should be suitable for use in a medical exam question
- Make it a single, clean image without borders or frames
- For radiographs: use proper grayscale with anatomical accuracy
- For histology: use proper H&E staining colors (pink/purple)
- For ECG: show proper grid paper with waveforms
- For CT/MRI: show proper cross-sectional anatomy with correct windowing`;

    const { response, provider } = await callAiImageWithFallback(
      {
        messages: [{ role: "user", content: prompt }],
      },
      {
        userId: user.id,
        promptType: "generate-medical-image",
      },
    );

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      let errorMessage = "Erro ao gerar imagem médica";

      try {
        const parsed = JSON.parse(errorText);
        errorMessage = parsed?.error || parsed?.message || errorMessage;
      } catch {
        if (errorText) errorMessage = errorText;
      }

      if (status === 429) {
        return new Response(JSON.stringify({ error: errorMessage || "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: errorMessage || "Créditos de IA insuficientes. Adicione créditos nas configurações do workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI image generation error:", status, errorText);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "A IA não retornou uma imagem. Tente novamente com mais detalhes." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract base64 data and upload to storage
    const base64Match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: "Formato de imagem inválido retornado pela IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const base64Content = base64Match[2];
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const filePath = `${user.id}/ai-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("question-images")
      .upload(filePath, bytes, {
        contentType: `image/${base64Match[1]}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Erro ao salvar imagem no storage" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage
      .from("question-images")
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        url: urlData.publicUrl,
        provider,
        imageType,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("generate-medical-image error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
