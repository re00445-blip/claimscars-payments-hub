import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Server is missing required configuration" }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    // User-scoped client (to verify requester + check admin role)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    if (roleError) return json({ error: roleError.message }, 500);
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { userId } = await req.json();
    if (!userId) return json({ error: "userId is required" }, 400);

    // Service-role client (performs deletion with elevated permissions)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Best-effort cleanup of related records
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    await adminClient.from("user_roles").delete().eq("user_id", userId);
    await adminClient.from("marketing_affiliates").delete().eq("user_id", userId);
    if (profile?.email) {
      await adminClient.from("marketing_affiliates").delete().eq("email", profile.email);
    }

    const { data: deletedProfiles, error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId)
      .select("id");

    if (profileDeleteError) return json({ error: profileDeleteError.message }, 500);

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) return json({ error: authDeleteError.message }, 500);

    return json({
      success: true,
      deletedProfileCount: Array.isArray(deletedProfiles) ? deletedProfiles.length : 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ADMIN-DELETE-USER] ERROR", message);
    return json({ error: message }, 500);
  }
});
