import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client to get user
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { versionId, projectId } = await req.json();
    if (!versionId || !projectId) {
      return new Response(JSON.stringify({ error: "Missing versionId or projectId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for full CRUD
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get the version snapshot (verify ownership)
    const { data: version, error: verError } = await admin
      .from("baseline_versions")
      .select("*")
      .eq("id", versionId)
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .single();

    if (verError || !version) {
      return new Response(JSON.stringify({ error: "Version not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const snapshot = version.controls_snapshot as any[];

    // 2. Get current controls for diff computation
    const { data: currentControls } = await admin
      .from("controls")
      .select("control_id, title, criticality, review_status, description")
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    // Compute diff between current and restored snapshot
    const currentMap = new Map<string, any>();
    for (const c of (currentControls || [])) {
      if (!currentMap.has(c.control_id)) currentMap.set(c.control_id, c);
    }
    const snapMap = new Map<string, any>();
    for (const c of snapshot) {
      if (!snapMap.has(c.control_id)) snapMap.set(c.control_id, c);
    }

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    for (const [cid, ctrl] of snapMap) {
      if (!currentMap.has(cid)) added.push(cid);
    }
    for (const [cid] of currentMap) {
      if (!snapMap.has(cid)) removed.push(cid);
    }
    const compareFields = ["title", "criticality", "review_status", "description"];
    for (const [cid, snapCtrl] of snapMap) {
      const curCtrl = currentMap.get(cid);
      if (!curCtrl) continue;
      const changedFields: string[] = [];
      for (const f of compareFields) {
        if (String(curCtrl[f] || "") !== String(snapCtrl[f] || "")) changedFields.push(f);
      }
      if (changedFields.length > 0) modified.push(`${cid} (${changedFields.join(", ")})`);
    }

    // 3. Delete current controls for this project
    const { error: deleteError } = await admin
      .from("controls")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to clear current controls" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Insert snapshot controls
    if (snapshot.length > 0) {
      const controlRows = snapshot.map((c: any) => ({
        project_id: projectId,
        user_id: user.id,
        control_id: c.control_id,
        title: c.title,
        description: c.description || "",
        applicability: c.applicability || "",
        security_risk: c.security_risk || "",
        criticality: c.criticality || "medium",
        default_behavior_limitations: c.default_behavior_limitations || "",
        automation: c.automation || "",
        references: c.references || [],
        framework_mappings: c.framework_mappings || [],
        threat_scenarios: c.threat_scenarios || [],
        source_traceability: c.source_traceability || [],
        confidence_score: c.confidence_score ?? 0,
        review_status: c.review_status || "pending",
        reviewer_notes: c.reviewer_notes || "",
        version: c.version || 1,
        category: c.category || "",
      }));

      const { error: insertError } = await admin.from("controls").insert(controlRows);
      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to restore controls" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 5. Get the latest version number
    const { data: latestVersion } = await admin
      .from("baseline_versions")
      .select("version")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const newVersionNum = (latestVersion?.version || 0) + 1;

    // 6. Build detailed changes summary
    const parts: string[] = [`Restored from v${version.version}`];
    if (added.length) parts.push(`+${added.length} added`);
    if (removed.length) parts.push(`-${removed.length} removed`);
    if (modified.length) parts.push(`~${modified.length} modified: ${modified.join("; ")}`);
    if (!added.length && !removed.length && !modified.length) parts.push("no differences from current");
    parts.push(`(${snapshot.length} controls total)`);
    const changesSummary = parts.join(" · ");

    // 7. Create a new version entry for the restore
    const { error: versionInsertError } = await admin
      .from("baseline_versions")
      .insert({
        project_id: projectId,
        user_id: user.id,
        version: newVersionNum,
        control_count: snapshot.length,
        controls_snapshot: snapshot,
        status: "draft",
        changes_summary: changesSummary,
      });

    if (versionInsertError) {
      console.error("Version insert error:", versionInsertError);
    }

    // 6. Update project control count
    await admin
      .from("projects")
      .update({ control_count: snapshot.length })
      .eq("id", projectId)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        restoredVersion: version.version,
        newVersion: newVersionNum,
        controlCount: snapshot.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Restore error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
