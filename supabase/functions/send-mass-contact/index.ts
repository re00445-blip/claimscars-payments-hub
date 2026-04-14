import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  content_type: string;
}

interface MassContactRequest {
  type: "email" | "sms";
  to: string;
  subject?: string;
  message: string;
  customerName: string;
  attachments?: EmailAttachment[];
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
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

    const { type, to, subject, message, customerName, attachments }: MassContactRequest = await req.json();
    console.log(`Sending ${type} to ${to} for ${customerName}${attachments?.length ? ` with ${attachments.length} attachments` : ""}`);

    if (type === "email") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY not configured");
      }

      // Build email payload
      const emailPayload: any = {
        from: "Cars & Claims <notifications@carsandclaims.com>",
        to: [to],
        subject: subject || "Message from Cars & Claims",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hello ${customerName},</h2>
            <div style="color: #555; line-height: 1.6;">
              ${message.replace(/\n/g, "<br>")}
            </div>
            ${attachments?.length ? `
              <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">📎 Attachments (${attachments.length}):</p>
                <ul style="margin: 0; padding-left: 20px; color: #555;">
                  ${attachments.map(a => `<li>${a.filename}</li>`).join("")}
                </ul>
              </div>
            ` : ""}
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <div style="color: #666; font-size: 14px; margin-top: 20px;">
              <p style="margin: 0; font-weight: bold;">Best regards,</p>
              <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;">Cars & Claims</p>
            </div>
            <div style="margin-top: 20px; padding: 20px; background-color: #1a1a1a; border-radius: 8px; text-align: center;">
              <img src="https://kauqfglsnbmshlteegaf.supabase.co/storage/v1/object/public/email-assets/email-logo.jpg" alt="Cars & Claims Logo" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
              <div style="color: #c9a227; font-size: 12px;">
                <p style="margin: 0;">📍 2500 W Broad Street, Suite 109</p>
                <p style="margin: 3px 0;">Athens, GA 30606</p>
                <p style="margin: 3px 0;">📞 (470) 519-6717</p>
                <p style="margin: 3px 0;">✉️ info@carsandclaims.com</p>
                <p style="margin: 8px 0 0 0;">
                  <a href="https://carsandclaims.com" style="color: #4ade80; text-decoration: none; font-weight: bold;">CARSANDCLAIMS.COM</a>
                </p>
              </div>
            </div>
            <p style="color: #999; font-size: 11px; margin-top: 15px; text-align: center;">
              This message was sent from Cars & Claims.
            </p>
          </div>
        `,
      };

      // Add attachments if present
      if (attachments && attachments.length > 0) {
        emailPayload.attachments = attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.content_type,
        }));
      }

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      const emailResult = await emailResponse.json();
      
      if (!emailResponse.ok) {
        console.error("Resend error:", emailResult);
        throw new Error(emailResult.message || "Failed to send email");
      }

      console.log("Email sent successfully:", emailResult);
      return new Response(JSON.stringify({ success: true, emailResponse: emailResult }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } else if (type === "sms") {
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        throw new Error("Twilio credentials not configured");
      }

      // Format phone number
      let formattedPhone = to.replace(/\D/g, "");
      if (formattedPhone.length === 10) {
        formattedPhone = "+1" + formattedPhone;
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+" + formattedPhone;
      }

      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedPhone,
            From: twilioPhoneNumber,
            Body: message,
          }),
        }
      );

      const twilioResult = await twilioResponse.json();
      
      if (!twilioResponse.ok) {
        console.error("Twilio error:", twilioResult);
        throw new Error(twilioResult.message || "Failed to send SMS");
      }

      console.log("SMS sent successfully:", twilioResult.sid);
      return new Response(JSON.stringify({ success: true, sid: twilioResult.sid }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    throw new Error("Invalid contact type");
  } catch (error: any) {
    console.error("Error in send-mass-contact:", error);
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
