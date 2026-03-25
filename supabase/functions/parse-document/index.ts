import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Use Lovable AI (Gemini) to extract structured text from a binary document.
 * Sends the file as a base64-encoded inline_data part.
 */
async function extractTextWithAI(
  fileBytes: ArrayBuffer,
  fileName: string,
  mimeType: string,
): Promise<{ text: string; preview: string; confidence: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

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
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a document text extraction specialist. Extract ALL text content from the provided document preserving structure (headings, lists, tables, paragraphs). Output ONLY the extracted text, no commentary. For tables, use markdown table format. For lists, use bullet points. Preserve section headings with markdown # syntax.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all text content from this document: "${fileName}"`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("AI extraction failed:", response.status, errBody);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const extractedText = result.choices?.[0]?.message?.content || "";

  return {
    text: extractedText,
    preview: extractedText.substring(0, 500),
    confidence: extractedText.length > 100 ? 0.85 : extractedText.length > 20 ? 0.6 : 0.3,
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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

    if (!file || !projectId) {
      return new Response(JSON.stringify({ error: "Missing file or projectId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name;
    const fileType = fileName.split(".").pop()?.toLowerCase() || "";
    const storagePath = `${user.id}/${projectId}/${Date.now()}-${fileName}`;

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("source-documents")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text content based on file type
    let extractedText = "";
    let preview = "";
    let confidence = 0;
    let status = "pending";

    const textFormats = ["txt", "md", "csv", "json", "html"];
    const aiFormats = ["pdf", "docx", "pptx", "xlsx", "doc", "ppt", "xls"];

    // Mime type mapping for AI extraction
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ppt: "application/vnd.ms-powerpoint",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
    };

    if (textFormats.includes(fileType)) {
      extractedText = new TextDecoder().decode(arrayBuffer);
      preview = extractedText.substring(0, 500);
      confidence = 0.95;
      status = "processed";
    } else if (aiFormats.includes(fileType)) {
      try {
        status = "extracting";
        // Insert initial record as "extracting"
        const { data: source, error: insertError } = await supabase
          .from("sources")
          .insert({
            project_id: projectId,
            user_id: user.id,
            type: "document",
            name: fileName,
            file_name: fileName,
            file_type: fileType,
            status: "extracting",
            origin: "Upload",
            preview: `Extracting text from ${fileName}...`,
            extracted_content: null,
            confidence: 0,
            tags: [fileType],
            url: storagePath,
          })
          .select()
          .single();

        if (insertError) {
          return new Response(JSON.stringify({ error: `DB insert failed: ${insertError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Run AI extraction
        const mimeType = mimeMap[fileType] || file.type || "application/octet-stream";
        const aiResult = await extractTextWithAI(arrayBuffer, fileName, mimeType);

        // Update the record with extracted content
        const { data: updated, error: updateError } = await supabase
          .from("sources")
          .update({
            status: "processed",
            extracted_content: aiResult.text,
            preview: aiResult.preview,
            confidence: aiResult.confidence,
          })
          .eq("id", source.id)
          .select()
          .single();

        if (updateError) {
          console.error("Failed to update source after extraction:", updateError);
        }

        return new Response(JSON.stringify({ source: updated || source }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (aiError) {
        console.error("AI extraction error:", aiError);
        // If AI fails, still keep the record as pending
        const { data: source } = await supabase
          .from("sources")
          .update({
            status: "pending",
            preview: `Document uploaded: ${fileName} (${fileType.toUpperCase()}, ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB) — AI extraction failed, retry later`,
          })
          .eq("project_id", projectId)
          .eq("file_name", fileName)
          .eq("user_id", user.id)
          .select()
          .single();

        return new Response(JSON.stringify({ source, warning: "AI extraction failed, document saved as pending" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      preview = `Document uploaded: ${fileName} (${fileType.toUpperCase()}, ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`;
      status = "pending";
    }

    // Insert source record (for text formats and unknown formats)
    const { data: source, error: insertError } = await supabase
      .from("sources")
      .insert({
        project_id: projectId,
        user_id: user.id,
        type: "document",
        name: fileName,
        file_name: fileName,
        file_type: fileType,
        status,
        origin: "Upload",
        preview,
        extracted_content: extractedText || null,
        confidence,
        tags: [fileType],
        url: storagePath,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: `DB insert failed: ${insertError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ source }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-document error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
