import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function extractTextFromOfficeXml(fileBytes: ArrayBuffer, fileType: string): Promise<string> {
  const { unzipSync } = await import("https://esm.sh/fflate@0.8.2");

  const uint8 = new Uint8Array(fileBytes);
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(uint8);
  } catch {
    return "";
  }

  const decoder = new TextDecoder();
  let rawText = "";

  if (fileType === "docx" || fileType === "doc") {
    for (const [path, data] of Object.entries(files)) {
      if (path.startsWith("word/") && path.endsWith(".xml")) {
        const xml = decoder.decode(data);
        const matches = xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        const parts: string[] = [];
        for (const m of matches) parts.push(m[1]);
        if (parts.length > 0) rawText += parts.join(" ") + "\n";
      }
    }
  } else if (fileType === "pptx" || fileType === "ppt") {
    const slideEntries = Object.entries(files)
      .filter(([path]) => path.startsWith("ppt/slides/slide") && path.endsWith(".xml"))
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
    for (const [, data] of slideEntries) {
      const xml = decoder.decode(data);
      const matches = xml.matchAll(/<a:t>([^<]*)<\/a:t>/g);
      const parts: string[] = [];
      for (const m of matches) parts.push(m[1]);
      if (parts.length > 0) rawText += `--- Slide ---\n${parts.join(" ")}\n\n`;
    }
  } else if (fileType === "xlsx" || fileType === "xls") {
    for (const [path, data] of Object.entries(files)) {
      if (path === "xl/sharedStrings.xml") {
        const xml = decoder.decode(data);
        const matches = xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
        const parts: string[] = [];
        for (const m of matches) parts.push(m[1]);
        rawText += parts.join(", ");
      }
    }
  }

  return rawText.trim();
}

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const DEFAULT_MAX_TOKENS = 65000;

async function extractTextFromPdfWithAI(
  fileBytes: ArrayBuffer,
  fileName: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): Promise<{ text: string; preview: string; confidence: number }> {
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
      model: model,
      messages: [
        {
          role: "system",
          content: `You are a document text extraction specialist. Extract ALL text content from the provided document preserving structure (headings, lists, tables, paragraphs). Output ONLY the extracted text, no commentary. For tables, use markdown table format. For lists, use bullet points. Preserve section headings with markdown # syntax. Extract EVERYTHING — do not summarize, abbreviate, or skip any content. Include every page, section, appendix, and footnote.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Extract ALL text content from this PDF document: "${fileName}". Do not skip or summarize any sections — output the complete text.` },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("AI PDF extraction failed:", response.status, errBody);
    throw new Error(`AI PDF extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const extractedText = result.choices?.[0]?.message?.content || "";
  const tokensUsed = result.usage?.total_tokens || result.usage?.completion_tokens || null;

  return {
    text: extractedText,
    preview: extractedText.substring(0, 500),
    confidence: extractedText.length > 100 ? 0.85 : extractedText.length > 20 ? 0.6 : 0.3,
    tokensUsed,
  };
}

async function structureTextWithAI(
  rawText: string,
  fileName: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): Promise<{ text: string; preview: string; confidence: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: `You are a document text structuring specialist. Given raw extracted text from a document, clean it up and organize it with proper markdown formatting (headings, lists, tables, paragraphs). Output ONLY the structured text, no commentary. Preserve ALL content — do not summarize or skip any sections.`,
        },
        {
          role: "user",
          content: `Structure and clean the following raw text extracted from "${fileName}". Preserve all content completely:\n\n${rawText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    console.error("AI structuring failed, using raw text");
    return { text: rawText, preview: rawText.substring(0, 500), confidence: 0.6 };
  }

  const result = await response.json();
  const structuredText = result.choices?.[0]?.message?.content || rawText;
  const tokensUsed = result.usage?.total_tokens || result.usage?.completion_tokens || null;

  return {
    text: structuredText,
    preview: structuredText.substring(0, 500),
    confidence: structuredText.length > 100 ? 0.8 : 0.5,
    tokensUsed,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const model = (formData.get("model") as string) || DEFAULT_MODEL;
    const maxTokens = parseInt((formData.get("maxTokens") as string) || "", 10) || DEFAULT_MAX_TOKENS;

    if (!file || !projectId) {
      return new Response(JSON.stringify({ error: "Missing file or projectId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name;
    const fileType = fileName.split(".").pop()?.toLowerCase() || "";
    const storagePath = `${user.id}/${projectId}/${Date.now()}-${fileName}`;
    const arrayBuffer = await file.arrayBuffer();

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("source-documents")
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textFormats = ["txt", "md", "csv", "json", "html"];
    const officeFormats = ["docx", "doc", "pptx", "ppt", "xlsx", "xls"];
    const now = new Date().toISOString();

    let extractedText = "";
    let rawContent = "";
    let preview = "";
    let confidence = 0;
    let status = "pending";
    let extractionMethod = "none";

    // --- Plain text formats ---
    if (textFormats.includes(fileType)) {
      rawContent = new TextDecoder().decode(arrayBuffer);
      extractedText = rawContent;
      preview = extractedText.substring(0, 500);
      confidence = 0.95;
      status = "processed";
      extractionMethod = "direct_text";
    }
    // --- PDF ---
    else if (fileType === "pdf") {
      rawContent = `[Binary PDF file: ${fileName}, ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB]`;
      extractionMethod = "ai_gemini_pdf";

      const { data: source, error: insertError } = await supabase
        .from("sources")
        .insert({
          project_id: projectId, user_id: user.id, type: "document",
          name: fileName, file_name: fileName, file_type: fileType,
          status: "extracting", origin: "Upload",
          preview: `Extracting text from ${fileName}...`,
          extracted_content: null, raw_content: rawContent,
          confidence: 0, tags: [fileType], url: storagePath,
          extraction_method: extractionMethod,
        })
        .select().single();

      if (insertError) {
        return new Response(JSON.stringify({ error: `DB insert failed: ${insertError.message}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const aiResult = await extractTextFromPdfWithAI(arrayBuffer, fileName, model, maxTokens);
        const { data: updated } = await supabase
          .from("sources")
          .update({
            status: "processed",
            extracted_content: aiResult.text,
            preview: aiResult.preview,
            confidence: aiResult.confidence,
            processed_at: new Date().toISOString(),
          })
          .eq("id", source.id).select().single();

        return new Response(JSON.stringify({ source: updated || source }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("PDF AI extraction error:", err);
        await supabase.from("sources").update({
          status: "pending",
          preview: `Document uploaded: ${fileName} (PDF, ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB) — extraction failed`,
        }).eq("id", source.id);

        return new Response(JSON.stringify({ source, warning: "PDF AI extraction failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // --- Office formats ---
    else if (officeFormats.includes(fileType)) {
      extractionMethod = "office_xml_ai";

      const { data: source, error: insertError } = await supabase
        .from("sources")
        .insert({
          project_id: projectId, user_id: user.id, type: "document",
          name: fileName, file_name: fileName, file_type: fileType,
          status: "extracting", origin: "Upload",
          preview: `Extracting text from ${fileName}...`,
          extracted_content: null, raw_content: null,
          confidence: 0, tags: [fileType], url: storagePath,
          extraction_method: extractionMethod,
        })
        .select().single();

      if (insertError) {
        return new Response(JSON.stringify({ error: `DB insert failed: ${insertError.message}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const rawText = await extractTextFromOfficeXml(arrayBuffer, fileType);

        // Store raw extracted XML text
        await supabase.from("sources").update({ raw_content: rawText || null }).eq("id", source.id);

        if (!rawText) {
          await supabase.from("sources").update({
            status: "pending",
            preview: `Document uploaded: ${fileName} (${fileType.toUpperCase()}, ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB) — no text extracted`,
          }).eq("id", source.id);

          return new Response(JSON.stringify({ source, warning: "No text could be extracted from Office document" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const structured = await structureTextWithAI(rawText, fileName, model, maxTokens);
        const { data: updated } = await supabase
          .from("sources")
          .update({
            status: "processed",
            extracted_content: structured.text,
            preview: structured.preview,
            confidence: structured.confidence,
            processed_at: new Date().toISOString(),
          })
          .eq("id", source.id).select().single();

        return new Response(JSON.stringify({ source: updated || source }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Office extraction error:", err);
        await supabase.from("sources").update({
          status: "pending",
          preview: `Document uploaded: ${fileName} — extraction failed`,
        }).eq("id", source.id);

        return new Response(JSON.stringify({ source, warning: "Office extraction failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // --- Unknown formats ---
    else {
      rawContent = `[Unsupported format: ${fileName}, ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB]`;
      preview = `Document uploaded: ${fileName} (${fileType.toUpperCase()}, ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`;
      extractionMethod = "unsupported";
    }

    // Insert for text formats and unknown formats
    const { data: source, error: insertError } = await supabase
      .from("sources")
      .insert({
        project_id: projectId, user_id: user.id, type: "document",
        name: fileName, file_name: fileName, file_type: fileType,
        status, origin: "Upload", preview,
        extracted_content: extractedText || null,
        raw_content: rawContent || null,
        confidence, tags: [fileType], url: storagePath,
        extraction_method: extractionMethod,
        processed_at: status === "processed" ? now : null,
      })
      .select().single();

    if (insertError) {
      return new Response(JSON.stringify({ error: `DB insert failed: ${insertError.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ source }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-document error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
