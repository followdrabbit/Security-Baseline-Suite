import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { projectId, sourceTexts, technology, language } = await req.json();

    if (!projectId || !technology) {
      return new Response(JSON.stringify({ error: "projectId and technology are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has a custom AI provider configured
    let useCustomProvider = false;
    let customApiKey = "";
    let customModel = "";

    const { data: aiConfigs } = await supabase
      .from("ai_provider_configs")
      .select("*")
      .eq("user_id", userId)
      .eq("is_default", true)
      .eq("enabled", true)
      .single();

    if (aiConfigs?.api_key_encrypted && aiConfigs.api_key_encrypted.length > 5) {
      useCustomProvider = true;
      customApiKey = aiConfigs.api_key_encrypted;
      customModel = aiConfigs.selected_model;
    }

    const sourcesContent = (sourceTexts || []).map((s: { name: string; content: string }) =>
      `### Source: ${s.name}\n${s.content}`
    ).join("\n\n---\n\n");

    const systemPrompt = `You are an expert cybersecurity analyst specializing in security baseline creation and threat modeling using the STRIDE methodology. Your task is to analyze source documents and generate comprehensive security controls for a specific technology.

For each control, provide:
1. A unique control ID with a prefix based on the technology category
2. Title and detailed description
3. Applicability context
4. Security risk if not implemented
5. Criticality level (critical, high, medium, low, informational)
6. Default behavior and limitations
7. Automation recommendations
8. Framework mappings (NIST, CIS, ISO 27001, etc.)
9. STRIDE threat scenarios with attack vectors, threat agents, preconditions, impact, likelihood, mitigations, and residual risk
10. Source traceability linking back to the analyzed documents
11. A confidence score (0-1) based on evidence quality

Output MUST be valid JSON.`;

    const userPrompt = `Technology: ${technology}
Language for output: ${language || "en"}

Source documents to analyze:
${sourcesContent || "No specific source documents provided. Generate controls based on your knowledge of " + technology + " security best practices."}

Generate 8-15 comprehensive security controls for ${technology}. Return a JSON object with this exact structure:
{
  "controls": [
    {
      "controlId": "S3-001",
      "title": "...",
      "description": "...",
      "applicability": "...",
      "securityRisk": "...",
      "criticality": "critical|high|medium|low|informational",
      "defaultBehaviorLimitations": "...",
      "automation": "...",
      "references": ["url1", "url2"],
      "frameworkMappings": ["NIST SC-28", "CIS 3.1"],
      "category": "...",
      "confidenceScore": 0.85,
      "threatScenarios": [
        {
          "threatName": "...",
          "strideCategory": "spoofing|tampering|repudiation|information_disclosure|denial_of_service|elevation_of_privilege",
          "attackVector": "...",
          "threatAgent": "...",
          "preconditions": "...",
          "impact": "...",
          "likelihood": "very_high|high|medium|low|very_low",
          "mitigations": ["..."],
          "residualRisk": "..."
        }
      ],
      "sourceTraceability": [
        {
          "sourceName": "...",
          "excerpt": "...",
          "sourceType": "url|document",
          "confidence": 0.9
        }
      ]
    }
  ]
}`;

    // Use Lovable AI Gateway (default) or custom provider
    let aiResponse: Response;

    if (useCustomProvider && aiConfigs?.provider_id === "openai") {
      aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: customModel || "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });
    } else if (useCustomProvider && aiConfigs?.provider_id === "anthropic") {
      aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": customApiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: customModel || "claude-3.5-sonnet-20241022",
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
    } else {
      // Default: Lovable AI Gateway
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_security_controls",
                description: "Generate security controls for a technology",
                parameters: {
                  type: "object",
                  properties: {
                    controls: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          controlId: { type: "string" },
                          title: { type: "string" },
                          description: { type: "string" },
                          applicability: { type: "string" },
                          securityRisk: { type: "string" },
                          criticality: { type: "string", enum: ["critical", "high", "medium", "low", "informational"] },
                          defaultBehaviorLimitations: { type: "string" },
                          automation: { type: "string" },
                          references: { type: "array", items: { type: "string" } },
                          frameworkMappings: { type: "array", items: { type: "string" } },
                          category: { type: "string" },
                          confidenceScore: { type: "number" },
                          threatScenarios: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                threatName: { type: "string" },
                                strideCategory: { type: "string" },
                                attackVector: { type: "string" },
                                threatAgent: { type: "string" },
                                preconditions: { type: "string" },
                                impact: { type: "string" },
                                likelihood: { type: "string" },
                                mitigations: { type: "array", items: { type: "string" } },
                                residualRisk: { type: "string" },
                              },
                              required: ["threatName", "strideCategory", "attackVector", "threatAgent", "preconditions", "impact", "likelihood", "mitigations", "residualRisk"],
                              additionalProperties: false,
                            },
                          },
                          sourceTraceability: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                sourceName: { type: "string" },
                                excerpt: { type: "string" },
                                sourceType: { type: "string" },
                                confidence: { type: "number" },
                              },
                              required: ["sourceName", "excerpt", "sourceType", "confidence"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["controlId", "title", "description", "criticality", "confidenceScore", "threatScenarios"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["controls"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_security_controls" } },
        }),
      });
    }

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errBody = await aiResponse.text();
      console.error("AI API error:", status, errBody);
      return new Response(JSON.stringify({ error: "AI processing failed", details: errBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();

    // Parse controls from response
    let controls: any[];
    if (aiResult.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const parsed = JSON.parse(aiResult.choices[0].message.tool_calls[0].function.arguments);
      controls = parsed.controls;
    } else if (aiResult.choices?.[0]?.message?.content) {
      const content = aiResult.choices[0].message.content;
      const parsed = JSON.parse(content);
      controls = parsed.controls;
    } else if (aiResult.content?.[0]?.text) {
      // Anthropic format
      const parsed = JSON.parse(aiResult.content[0].text);
      controls = parsed.controls;
    } else {
      console.error("Unexpected AI response format:", JSON.stringify(aiResult).slice(0, 500));
      return new Response(JSON.stringify({ error: "Unexpected AI response format" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert controls into database
    const controlRows = controls.map((c: any) => ({
      project_id: projectId,
      user_id: userId,
      control_id: c.controlId,
      title: c.title,
      description: c.description || "",
      applicability: c.applicability || "",
      security_risk: c.securityRisk || "",
      criticality: c.criticality || "medium",
      default_behavior_limitations: c.defaultBehaviorLimitations || "",
      automation: c.automation || "",
      references: c.references || [],
      framework_mappings: c.frameworkMappings || [],
      threat_scenarios: c.threatScenarios || [],
      source_traceability: c.sourceTraceability || [],
      confidence_score: c.confidenceScore || 0,
      review_status: "pending",
      category: c.category || "",
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("controls")
      .insert(controlRows)
      .select();

    if (insertError) {
      console.error("DB insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save controls", details: insertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update project control count
    await supabase
      .from("projects")
      .update({ control_count: controlRows.length, status: "review" })
      .eq("id", projectId);

    return new Response(JSON.stringify({ controls: inserted, count: inserted?.length || 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-controls error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
