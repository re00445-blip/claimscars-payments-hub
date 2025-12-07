import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RepairInquiryRequest {
  name: string;
  phone: string;
  address: string;
  year: string;
  make: string;
  model: string;
  description: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, phone, address, year, make, model, description }: RepairInquiryRequest = await req.json();

    console.log("Processing repair inquiry for:", name);

    const emailResponse = await resend.emails.send({
      from: "Quality Foreign and Domestic Auto's <onboarding@resend.dev>",
      to: ["re00445@gmail.com"],
      subject: "New Car Repair Inquiry",
      html: `
        <h2>New Car Repair Inquiry</h2>
        <p><strong>Customer Information:</strong></p>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Phone:</strong> ${phone}</li>
          <li><strong>Address:</strong> ${address}</li>
        </ul>
        <p><strong>Vehicle Information:</strong></p>
        <ul>
          <li><strong>Year:</strong> ${year}</li>
          <li><strong>Make:</strong> ${make}</li>
          <li><strong>Model:</strong> ${model}</li>
        </ul>
        <p><strong>Issue Description:</strong></p>
        <p>${description}</p>
      `,
    });

    console.log("Repair inquiry email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending repair inquiry:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
