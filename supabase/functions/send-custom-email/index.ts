import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface CustomEmailRequest {
  to: string;
  subject: string;
  customerName: string;
  bodyHtml: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid session");

    const { data: roleCheck } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) throw new Error("Admin access required");

    const { to, subject, customerName, bodyHtml }: CustomEmailRequest = await req.json();

    console.log(`Sending custom email to: ${to}, subject: ${subject}`);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Quality Foreign Domestic Autos</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Professional Auto Sales & Service</p>
        </div>
        
        <p style="margin-bottom: 15px;">Dear ${customerName},</p>
        
        ${bodyHtml}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p style="margin: 5px 0;">Best regards,</p>
          <p style="margin: 5px 0; font-weight: bold; color: #22c55e;">Quality Foreign Domestic Autos Team</p>
          <p style="margin: 15px 0 5px 0; font-size: 12px;">Contact: 470-519-6717 | ramon@carsandclaims.com</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Quality Foreign Domestic Autos <invoices@carsandclaims.com>",
      to: [to],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending custom email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
