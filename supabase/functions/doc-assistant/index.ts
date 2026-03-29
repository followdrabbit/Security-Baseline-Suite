import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Aureum Baseline Studio documentation assistant. You help users understand and navigate the platform.

## About Aureum Baseline Studio
Aureum is an enterprise-grade platform for automated security baseline generation. It uses AI to analyze security sources (documents, URLs) and generate structured security controls with full traceability.

## Platform Sections

### Dashboard
Central hub showing metrics (total projects, active baselines, controls generated, avg confidence), recent projects with status/technology/controls/confidence, quick actions (Create New Baseline, Import Project), recent activity feed, and trend charts.

### New Project
Create a project by filling: Name, Technology, Vendor, Version, Category, Output Language, Tags. Categories include Cloud, Network, Application, Data, Identity, Endpoint, IoT, Container, API, Mobile.

### Source Library
Add evidence sources via URL or file upload (PDF, DOCX, TXT, MD, HTML). Sources go through statuses: Pending → Extracting → Normalized → Processed → Failed. Recommended sources: CIS Benchmarks, NIST Publications, vendor hardening guides, OWASP guides, ISO 27001/27002.

### Rules & Templates
Configure AI generation rules: Structure (title, description, risk, references format), Writing style (technical/executive), Risk mapping (STRIDE model), Criticality scale (Critical/High/Medium/Low/Informational), Deduplication threshold, Framework mapping (NIST 800-53, ISO 27001, CIS Controls, MITRE ATT&CK, PCI DSS), Threat scenarios.

### AI Workspace
Run the AI pipeline with stages: Ingestion → Extraction → Normalization → Grouping → Deduplication → Generation. Requires at least one AI provider configured. Supports Lovable AI (default, no API key needed), OpenAI, Anthropic, Google Gemini, Azure OpenAI, Mistral AI.

### Baseline Editor
Review generated controls with: Card/table view, STRIDE category filters (Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege), Confidence score indicators, Review status workflow (Pending → Reviewed → Approved/Rejected/Adjusted), Reviewer notes, Mind map visualization.

### Traceability
Map controls to frameworks: NIST 800-53, ISO 27001, CIS Controls, MITRE ATT&CK, PCI DSS, SOC 2, GDPR. Features radar chart, control cards with framework badges, filtering, CSV/JSON export.

### History (Version Control)
Immutable version snapshots with: Side-by-side diff comparison, version statistics, filtering by date/status, restore to previous versions. Always create a snapshot before restoring.

### Export / Import
Formats: JSON (backup/import), Markdown (wikis like Confluence/Notion/GitHub), PDF (audit reports), CSV (spreadsheet analysis). Full project import/export supported.

### AI Integrations
Configure AI providers: Lovable AI (default, no key needed), OpenAI (GPT-5), Anthropic (Claude), Google Gemini, Azure OpenAI, Mistral AI. Test connections, set default provider, manage API keys.

### Teams
Create teams, invite members with roles, share projects, team-scoped notifications. Role-based access control.

### Notifications
Types: control updates, team invitations, version changes. Badge counter, mark as read.

### Settings
Language (EN-US, PT-BR, ES-ES), Output language, Theme (Light/Dark/Auto), Tooltips toggle, Export format preferences, AI strictness levels (Conservative/Balanced/Aggressive), Backup/restore settings.

### Mind Map
Interactive visualization of baseline structure: root node (project), category nodes (STRIDE), control nodes with color-coded criticality. Zoom, pan, filters, toolbar, detail panel on click.

### Security
Authentication (email + Google OAuth), Row-Level Security (RLS), project data isolation, immutable version snapshots, encrypted API keys, full audit trails.

## Criticality Scale
- Critical: Immediate risk, full compromise possible
- High: Significant risk, major impact
- Medium: Moderate risk, moderate impact
- Low: Minor risk, implement as resources allow
- Informational: Best practice, no direct risk

## Best Practices
1. Use 3+ diverse sources for comprehensive baselines
2. Start with "Balanced" AI strictness
3. Review lowest confidence controls first
4. Always snapshot before restoring versions
5. Use framework mappings for compliance evidence
6. Export as PDF for formal audit reports
7. Use mind map for structural overview
8. Keep AI provider API keys secure

## Response Guidelines
- Answer in the SAME LANGUAGE the user writes in
- Be concise and helpful
- Reference specific platform sections when relevant
- If unsure about something, say so honestly
- Use markdown formatting for clarity
- Provide step-by-step instructions when explaining workflows`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("doc-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
