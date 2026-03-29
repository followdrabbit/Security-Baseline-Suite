import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Fetch a URL and extract its text content, then use AI to structure it.
 */
async function fetchAndExtractUrl(url: string): Promise<{ rawHtml: string; title: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AureumBot/1.0)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || new URL(url).hostname;

  return { rawHtml: html, title };
}

/**
 * Use AI to extract structured content from HTML
 */
async function extractContentWithAI(
  html: string,
  url: string,
  title: string,
): Promise<{ text: string; preview: string; confidence: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  // Send more HTML to AI for better extraction (up to ~500k chars)
  const truncatedHtml = html.length > 500000 ? html.substring(0, 500000) + "\n[... truncated]" : html;

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
          content: `You are a web content extraction specialist focused on security documentation. Extract ALL meaningful text content from the HTML, removing navigation, ads, footers, and boilerplate. Preserve structure with markdown formatting (headings, lists, tables, code blocks). Focus on technical content, security guidelines, best practices, configurations, and recommendations. Output ONLY the extracted content in clean markdown. Extract EVERYTHING — do not summarize, abbreviate, or skip any content.`,
        },
        {
          role: "user",
          content: `Extract ALL main content from this web page (URL: ${url}, Title: "${title}"). Do not skip or summarize any sections:\n\n${truncatedHtml}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 65000,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("AI extraction failed:", response.status, errBody);
    throw new Error(`AI content extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const extractedText = result.choices?.[0]?.message?.content || "";

  return {
    text: extractedText,
    preview: extractedText.substring(0, 500),
    confidence: extractedText.length > 200 ? 0.8 : extractedText.length > 50 ? 0.6 : 0.3,
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

    const body = await req.json();
    const { url, projectId } = body;

    if (!url || !projectId) {
      return new Response(JSON.stringify({ error: "Missing url or projectId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUrl = parsedUrl.toString();

    // Insert source as "extracting"
    const { data: source, error: insertError } = await supabase
      .from("sources")
      .insert({
        project_id: projectId,
        user_id: user.id,
        type: "url",
        name: parsedUrl.hostname + parsedUrl.pathname,
        url: normalizedUrl,
        status: "extracting",
        origin: "URL Import",
        preview: `Fetching content from ${normalizedUrl}...`,
        extracted_content: null,
        raw_content: null,
        confidence: 0,
        tags: ["url", parsedUrl.hostname],
        extraction_method: "ai_url_extraction",
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: `DB insert failed: ${insertError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      // Fetch the URL
      console.log("Fetching URL:", normalizedUrl);
      const { rawHtml, title } = await fetchAndExtractUrl(normalizedUrl);

      // Store raw HTML content (truncated to ~500KB for storage)
      const rawContentToStore = rawHtml.length > 500000 ? rawHtml.substring(0, 500000) + "\n[... truncated]" : rawHtml;
      await supabase.from("sources").update({
        name: title,
        raw_content: rawContentToStore,
      }).eq("id", source.id);

      // Extract content with AI
      console.log("Extracting content with AI for:", title);
      const aiResult = await extractContentWithAI(rawHtml, normalizedUrl, title);

      const { data: updated } = await supabase
        .from("sources")
        .update({
          status: "processed",
          name: title,
          extracted_content: aiResult.text,
          preview: aiResult.preview,
          confidence: aiResult.confidence,
          processed_at: new Date().toISOString(),
        })
        .eq("id", source.id)
        .select()
        .single();

      return new Response(JSON.stringify({ source: updated || source }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("URL processing error:", err);
      await supabase.from("sources").update({
        status: "failed",
        preview: `Failed to process ${normalizedUrl}: ${String(err)}`,
      }).eq("id", source.id);

      return new Response(JSON.stringify({ source, warning: `URL processing failed: ${String(err)}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("parse-url error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
