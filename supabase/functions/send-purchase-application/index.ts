import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurchaseApplicationRequest {
  vehicleInfo: string;
  vehiclePrice: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  downPayment: number;
  termMonths: number;
  estimatedMonthlyPayment: number;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PurchaseApplicationRequest = await req.json();

    console.log("Processing purchase application notification for:", data.fullName);

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    };

    const emailResponse = await resend.emails.send({
      from: "Cars & Claims <onboarding@resend.dev>",
      to: ["re00445@gmail.com"],
      subject: `New Purchase Application - ${data.vehicleInfo}`,
      html: `
        <h2>New Vehicle Purchase Application</h2>
        
        <h3>Vehicle Information</h3>
        <ul>
          <li><strong>Vehicle:</strong> ${data.vehicleInfo}</li>
          <li><strong>Price:</strong> ${formatCurrency(data.vehiclePrice)}</li>
        </ul>

        <h3>Customer Information</h3>
        <ul>
          <li><strong>Name:</strong> ${data.fullName}</li>
          <li><strong>Email:</strong> ${data.email}</li>
          <li><strong>Phone:</strong> ${data.phone}</li>
          <li><strong>Address:</strong> ${data.address}</li>
        </ul>

        <h3>Financing Details</h3>
        <ul>
          <li><strong>Down Payment:</strong> ${formatCurrency(data.downPayment)}</li>
          <li><strong>Desired Term:</strong> ${data.termMonths} months</li>
          <li><strong>Estimated Monthly Payment:</strong> ${formatCurrency(data.estimatedMonthlyPayment)}</li>
          <li><strong>Amount to Finance:</strong> ${formatCurrency(data.vehiclePrice - data.downPayment)}</li>
        </ul>

        ${data.notes ? `<h3>Additional Notes</h3><p>${data.notes}</p>` : ''}

        <hr />
        <p style="color: #666; font-size: 12px;">
          This application was submitted through the Cars & Claims website.
          Log in to the admin portal to review and process this application.
        </p>
      `,
    });

    console.log("Purchase application email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending purchase application notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
