import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

// Helper function to escape HTML special characters
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

// Input validation
function validateInput(data: PurchaseApplicationRequest): { valid: boolean; error?: string } {
  if (!data.vehicleInfo || typeof data.vehicleInfo !== 'string' || data.vehicleInfo.length > 200) {
    return { valid: false, error: "Vehicle info is required and must be under 200 characters" };
  }
  if (typeof data.vehiclePrice !== 'number' || data.vehiclePrice < 0 || data.vehiclePrice > 10000000) {
    return { valid: false, error: "Valid vehicle price is required" };
  }
  if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.length < 2 || data.fullName.length > 100) {
    return { valid: false, error: "Name must be between 2 and 100 characters" };
  }
  if (!data.email || typeof data.email !== 'string' || !data.email.includes('@') || data.email.length > 255) {
    return { valid: false, error: "Valid email is required" };
  }
  if (!data.phone || typeof data.phone !== 'string' || data.phone.length < 10 || data.phone.length > 20) {
    return { valid: false, error: "Valid phone number is required" };
  }
  if (!data.address || typeof data.address !== 'string' || data.address.length > 500) {
    return { valid: false, error: "Address is required and must be under 500 characters" };
  }
  if (typeof data.downPayment !== 'number' || data.downPayment < 0) {
    return { valid: false, error: "Valid down payment is required" };
  }
  if (typeof data.termMonths !== 'number' || data.termMonths < 1 || data.termMonths > 120) {
    return { valid: false, error: "Term months must be between 1 and 120" };
  }
  if (typeof data.estimatedMonthlyPayment !== 'number' || data.estimatedMonthlyPayment < 0) {
    return { valid: false, error: "Valid estimated monthly payment is required" };
  }
  if (data.notes && (typeof data.notes !== 'string' || data.notes.length > 2000)) {
    return { valid: false, error: "Notes must be under 2000 characters" };
  }
  return { valid: true };
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PurchaseApplicationRequest = await req.json();

    // Validate input
    const validation = validateInput(data);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing purchase application notification for:", escapeHtml(data.fullName));

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    };

    const emailResponse = await resend.emails.send({
      from: "Cars & Claims <noreply@carsandclaims.com>",
      to: [Deno.env.get("ADMIN_EMAIL") || "ramon@carsandclaims.com"],
      subject: `New Purchase Application - ${escapeHtml(data.vehicleInfo)}`,
      html: `
        <h2>New Vehicle Purchase Application</h2>
        
        <h3>Vehicle Information</h3>
        <ul>
          <li><strong>Vehicle:</strong> ${escapeHtml(data.vehicleInfo)}</li>
          <li><strong>Price:</strong> ${formatCurrency(data.vehiclePrice)}</li>
        </ul>

        <h3>Customer Information</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(data.fullName)}</li>
          <li><strong>Email:</strong> ${escapeHtml(data.email)}</li>
          <li><strong>Phone:</strong> ${escapeHtml(data.phone)}</li>
          <li><strong>Address:</strong> ${escapeHtml(data.address)}</li>
        </ul>

        <h3>Financing Details</h3>
        <ul>
          <li><strong>Down Payment:</strong> ${formatCurrency(data.downPayment)}</li>
          <li><strong>Desired Term:</strong> ${data.termMonths} months</li>
          <li><strong>Estimated Monthly Payment:</strong> ${formatCurrency(data.estimatedMonthlyPayment)}</li>
          <li><strong>Amount to Finance:</strong> ${formatCurrency(data.vehiclePrice - data.downPayment)}</li>
        </ul>

        ${data.notes ? `<h3>Additional Notes</h3><p>${escapeHtml(data.notes)}</p>` : ''}

        <hr />
        <p style="color: #666; font-size: 12px;">
          This application was submitted through the Cars &amp; Claims website.
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
      JSON.stringify({ error: "Failed to process application" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);