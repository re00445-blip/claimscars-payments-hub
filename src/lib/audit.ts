import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    // Use .from() with type assertion since audit_log isn't in generated types yet
    await (supabase as any).from("audit_log").insert({
      user_id: user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
