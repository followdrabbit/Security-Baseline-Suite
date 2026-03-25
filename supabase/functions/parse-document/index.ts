import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Upload to storage
    const arrayBuffer = await file.arrayBuffer();
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

    if (["txt", "md", "csv", "json", "html"].includes(fileType)) {
      extractedText = new TextDecoder().decode(arrayBuffer);
      preview = extractedText.substring(0, 500);
    } else {
      // For PDF, DOCX, PPTX — we store as pending for now
      // A more advanced pipeline could use external APIs for extraction
      extractedText = "";
      preview = `Document uploaded: ${fileName} (${fileType.toUpperCase()}, ${(file.size / 1024).toFixed(1)} KB)`;
    }

    // Insert source record
    const { data: source, error: insertError } = await supabase
      .from("sources")
      .insert({
        project_id: projectId,
        user_id: user.id,
        type: "document",
        name: fileName,
        file_name: fileName,
        file_type: fileType,
        status: ["txt", "md", "csv", "json", "html"].includes(fileType) ? "processed" : "pending",
        origin: "Upload",
        preview,
        extracted_content: extractedText || null,
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

    return new Response(JSON.stringify({ source }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
