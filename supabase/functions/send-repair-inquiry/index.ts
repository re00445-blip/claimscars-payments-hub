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
  attachments?: string[];
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

// Helper function to validate and sanitize URL
function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow https URLs
    if (parsed.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

// Input validation
function validateInput(data: RepairInquiryRequest): { valid: boolean; error?: string } {
  if (!data.name || typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 100) {
    return { valid: false, error: "Name must be between 2 and 100 characters" };
  }
  if (!data.phone || typeof data.phone !== 'string' || data.phone.length < 10 || data.phone.length > 20) {
    return { valid: false, error: "Valid phone number is required" };
  }
  if (!data.address || typeof data.address !== 'string' || data.address.length > 500) {
    return { valid: false, error: "Address is required and must be under 500 characters" };
  }
  if (!data.year || typeof data.year !== 'string' || data.year.length > 4) {
    return { valid: false, error: "Valid vehicle year is required" };
  }
  if (!data.make || typeof data.make !== 'string' || data.make.length > 50) {
    return { valid: false, error: "Vehicle make is required and must be under 50 characters" };
  }
  if (!data.model || typeof data.model !== 'string' || data.model.length > 50) {
    return { valid: false, error: "Vehicle model is required and must be under 50 characters" };
  }
  if (!data.description || typeof data.description !== 'string' || data.description.length > 2000) {
    return { valid: false, error: "Description is required and must be under 2000 characters" };
  }
  if (data.attachments && (!Array.isArray(data.attachments) || data.attachments.length > 10)) {
    return { valid: false, error: "Maximum 10 attachments allowed" };
  }
  return { valid: true };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: RepairInquiryRequest = await req.json();

    // Validate input
    const validation = validateInput(data);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { name, phone, address, year, make, model, description, attachments } = data;

    console.log("Processing repair inquiry for:", escapeHtml(name));

    // Sanitize and validate attachment URLs
    const sanitizedAttachments = (attachments || [])
      .map(sanitizeUrl)
      .filter((url): url is string => url !== null)
      .slice(0, 10);

    const attachmentsHtml = sanitizedAttachments.length > 0
      ? `
        <h3>Attached Photos/Videos</h3>
        <ul>
          ${sanitizedAttachments.map((url, index) => {
            const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
            return `<li><a href="${escapeHtml(url)}" target="_blank">${isVideo ? 'Video' : 'Photo'} ${index + 1}</a></li>`;
          }).join('')}
        </ul>
      `
      : '';

    const emailResponse = await resend.emails.send({
      from: "Quality Foreign and Domestic Auto's <noreply@carsandclaims.com>",
      to: ["re00445@gmail.com"],
      subject: "New Car Repair Inquiry",
      html: `
        <h2>New Car Repair Inquiry</h2>
        <p><strong>Customer Information:</strong></p>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(name)}</li>
          <li><strong>Phone:</strong> ${escapeHtml(phone)}</li>
          <li><strong>Address:</strong> ${escapeHtml(address)}</li>
        </ul>
        <p><strong>Vehicle Information:</strong></p>
        <ul>
          <li><strong>Year:</strong> ${escapeHtml(year)}</li>
          <li><strong>Make:</strong> ${escapeHtml(make)}</li>
          <li><strong>Model:</strong> ${escapeHtml(model)}</li>
        </ul>
        <p><strong>Issue Description:</strong></p>
        <p>${escapeHtml(description)}</p>
        ${attachmentsHtml}
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
      JSON.stringify({ error: "Failed to process inquiry" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);