import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const DEFAULT_MAX_TOKENS = 65000;

async function extractWithAI(
  content: string,
  systemPrompt: string,
  userPrompt: string,
  model: string,
  maxTokens: number,
): Promise<{ text: string; tokensUsed: number | null }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("AI extraction failed:", response.status, errBody);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || "";
  const tokensUsed = result.usage?.total_tokens || result.usage?.completion_tokens || null;
  return { text, tokensUsed };
}

async function reprocessPdfWithAI(
  fileBytes: ArrayBuffer,
  fileName: string,
  model: string,
  maxTokens: number,
): Promise<{ text: string; tokensUsed: number | null }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const base64 = btoa(
    new Uint8Array(fileBytes).reduce((data, byte) => data + String.fromCharCode(byte), ""),
  );

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `You are a document text extraction specialist. Extract ALL text content from the provided document preserving structure (headings, lists, tables, paragraphs). Output ONLY the extracted text, no commentary. Extract EVERYTHING — do not summarize, abbreviate, or skip any content.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Extract ALL text content from this PDF document: "${fileName}". Do not skip or summarize any sections.` },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI PDF extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || "";
  const tokensUsed = result.usage?.total_tokens || result.usage?.completion_tokens || null;
  return { text, tokensUsed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { sourceId, model: reqModel, maxTokens: reqMaxTokens } = body;
    const model = reqModel || DEFAULT_MODEL;
    const maxTokens = reqMaxTokens || DEFAULT_MAX_TOKENS;

    if (!sourceId) {
      return new Response(JSON.stringify({ error: "Missing sourceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the existing source
    const { data: source, error: fetchError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !source) {
      return new Response(JSON.stringify({ error: "Source not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set status to extracting
    await supabase.from("sources").update({
      status: "extracting",
      preview: `Re-processing with ${model}...`,
    }).eq("id", sourceId);

    try {
      let extractedText = "";
      let tokensUsed: number | null = null;

      if (source.type === "url" && source.raw_content) {
        // Re-extract from raw HTML
        const result = await extractWithAI(
          source.raw_content,
          `You are a web content extraction specialist focused on security documentation. Extract ALL meaningful text content from the HTML, removing navigation, ads, footers, and boilerplate. Preserve structure with markdown formatting. Extract EVERYTHING — do not summarize, abbreviate, or skip any content.`,
          `Extract ALL main content from this web page (URL: ${source.url || ""}, Title: "${source.name}"). Do not skip or summarize any sections:\n\n${source.raw_content}`,
          model,
          maxTokens,
        );
        extractedText = result.text;
        tokensUsed = result.tokensUsed;
      } else if (source.type === "document" && source.file_type === "pdf" && source.url) {
        // Re-download PDF from storage and re-extract
        const { data: fileData, error: dlError } = await supabase.storage
          .from("source-documents")
          .download(source.url);

        if (dlError || !fileData) {
          throw new Error("Failed to download original file from storage");
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const result = await reprocessPdfWithAI(arrayBuffer, source.file_name || source.name, model, maxTokens);
        extractedText = result.text;
        tokensUsed = result.tokensUsed;
      } else if (source.type === "document" && source.raw_content) {
        // Office/text docs — re-structure from raw content
        const result = await extractWithAI(
          source.raw_content,
          `You are a document text structuring specialist. Given raw extracted text from a document, clean it up and organize it with proper markdown formatting. Output ONLY the structured text, no commentary. Preserve ALL content.`,
          `Structure and clean the following raw text extracted from "${source.name}". Preserve all content completely:\n\n${source.raw_content}`,
          model,
          maxTokens,
        );
        extractedText = result.text;
        tokensUsed = result.tokensUsed;
      } else {
        throw new Error("Cannot reprocess: no raw content or file available");
      }

      const confidence = extractedText.length > 200 ? 0.8 : extractedText.length > 50 ? 0.6 : 0.3;

      const { data: updated } = await supabase
        .from("sources")
        .update({
          status: "processed",
          extracted_content: extractedText,
          preview: extractedText.substring(0, 500),
          confidence,
          processed_at: new Date().toISOString(),
          extraction_model: model,
          extraction_tokens: tokensUsed,
        })
        .eq("id", sourceId)
        .select()
        .single();

      return new Response(JSON.stringify({ source: updated || source }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Reprocess error:", err);
      await supabase.from("sources").update({
        status: "processed", // Restore to processed, not failed
        preview: source.preview, // Restore original preview
      }).eq("id", sourceId);

      return new Response(JSON.stringify({ error: `Reprocessing failed: ${String(err)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("reprocess-source error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
