import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InjuryClaimRequest {
  name: string;
  address: string;
  accidentDate: string;
  injuryArea: string;
  atFault: string;
  contactNumber: string;
  vehicleType: string;
  attachments?: string[];
  referralSource?: string;
  affiliateId?: string;
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
    // Only allow https URLs from our Supabase storage
    if (parsed.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

// Input validation
function validateInput(data: InjuryClaimRequest): { valid: boolean; error?: string } {
  if (!data.name || typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 100) {
    return { valid: false, error: "Name must be between 2 and 100 characters" };
  }
  if (!data.address || typeof data.address !== 'string' || data.address.length > 500) {
    return { valid: false, error: "Address is required and must be under 500 characters" };
  }
  if (!data.accidentDate || typeof data.accidentDate !== 'string') {
    return { valid: false, error: "Accident date is required" };
  }
  if (!data.injuryArea || typeof data.injuryArea !== 'string' || data.injuryArea.length > 500) {
    return { valid: false, error: "Injury area is required and must be under 500 characters" };
  }
  if (!data.atFault || typeof data.atFault !== 'string') {
    return { valid: false, error: "At fault status is required" };
  }
  if (!data.contactNumber || typeof data.contactNumber !== 'string' || data.contactNumber.length < 10 || data.contactNumber.length > 20) {
    return { valid: false, error: "Valid contact number is required" };
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
    const data: InjuryClaimRequest = await req.json();
    
    // Validate input
    const validation = validateInput(data);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { name, address, accidentDate, injuryArea, atFault, contactNumber, vehicleType, attachments, referralSource, affiliateId } = data;

    console.log("Processing injury claim for:", escapeHtml(name), "Referral Source:", referralSource || "none", "Affiliate ID:", affiliateId || "none");

    // Sanitize and validate attachment URLs
    const sanitizedAttachments = (attachments || [])
      .map(sanitizeUrl)
      .filter((url): url is string => url !== null)
      .slice(0, 10);

    // Initialize Supabase client with service role key for database insertion
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up affiliate by referral code if not provided directly
    let resolvedAffiliateId = affiliateId || null;
    if (!resolvedAffiliateId && referralSource) {
      // Try to find affiliate by referral_code (exact match)
      const { data: affiliateData } = await supabase
        .from("marketing_affiliates")
        .select("id")
        .eq("referral_code", referralSource)
        .eq("status", "active")
        .maybeSingle();
      
      if (affiliateData) {
        resolvedAffiliateId = affiliateData.id;
        console.log("Found affiliate by referral code:", resolvedAffiliateId);
      }
    }

    // Save claim to database first (this is the most important part)
    const { data: claimData, error: dbError } = await supabase
      .from("injury_claims")
      .insert({
        full_name: name,
        address: address,
        accident_date: accidentDate,
        injury_area: injuryArea,
        at_fault: atFault,
        phone: contactNumber,
        vehicle_type: vehicleType,
        attachments: sanitizedAttachments,
        referral_source: referralSource || null,
        affiliate_id: resolvedAffiliateId,
        status: "new",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error saving claim to database:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save claim to database" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Claim saved to database with ID:", claimData.id);

    // If claim was referred by an affiliate, increment their total_referrals count
    if (resolvedAffiliateId) {
      const { error: affiliateError } = await supabase.rpc('increment_affiliate_referrals', {
        affiliate_id: resolvedAffiliateId
      });
      
      if (affiliateError) {
        console.error("Error incrementing affiliate referrals:", affiliateError);
        // Don't fail the request - claim is already saved
      } else {
        console.log("Affiliate referral count incremented for:", resolvedAffiliateId);
      }
    }

    // Now try to send email notification (optional - don't fail if email fails)
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

    const referralHtml = referralSource 
      ? `<li><strong>Referral Source:</strong> ${escapeHtml(referralSource)}</li>`
      : '';

    try {
      const emailResponse = await resend.emails.send({
        from: "Cars & Claims <noreply@carsandclaims.com>",
        to: ["ramon@carsandclaims.com", "re00445@gmail.com"],
        subject: "New Injury Claim Inquiry",
        html: `
          <h2>New Injury Claim Inquiry</h2>
          <p><strong>Claim ID:</strong> ${claimData.id}</p>
          <p><strong>Prospect Information:</strong></p>
          <ul>
            <li><strong>Name:</strong> ${escapeHtml(name)}</li>
            <li><strong>Address:</strong> ${escapeHtml(address)}</li>
            <li><strong>Best Contact Number:</strong> ${escapeHtml(contactNumber)}</li>
            ${referralHtml}
          </ul>
          <p><strong>Accident Details:</strong></p>
          <ul>
            <li><strong>Accident Date:</strong> ${escapeHtml(accidentDate)}</li>
            <li><strong>Area of Bodily Injury:</strong> ${escapeHtml(injuryArea)}</li>
            <li><strong>Were They At Fault:</strong> ${escapeHtml(atFault)}</li>
            <li><strong>Government Entity/Commercial Vehicle:</strong> ${escapeHtml(vehicleType)}</li>
          </ul>
          ${attachmentsHtml}
        `,
      });
      console.log("Injury claim email sent successfully:", emailResponse);
    } catch (emailError) {
      // Log email error but don't fail the request - claim is already saved
      console.error("Email notification failed (claim still saved):", emailError);
    }

    return new Response(JSON.stringify({ success: true, claimId: claimData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error processing injury claim:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process claim" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
