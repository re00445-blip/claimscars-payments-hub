import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MassContactRequest {
  type: "email" | "sms";
  to: string;
  subject?: string;
  message: string;
  customerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, subject, message, customerName }: MassContactRequest = await req.json();
    console.log(`Sending ${type} to ${to} for ${customerName}`);

    if (type === "email") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY not configured");
      }

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Cars & Claims <notifications@carsandclaims.com>",
          to: [to],
          subject: subject || "Message from Cars & Claims",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Hello ${customerName},</h2>
              <div style="color: #555; line-height: 1.6;">
                ${message.replace(/\n/g, "<br>")}
              </div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #999; font-size: 12px;">
                This message was sent from Cars & Claims.
              </p>
            </div>
          `,
        }),
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
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID28a");
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
