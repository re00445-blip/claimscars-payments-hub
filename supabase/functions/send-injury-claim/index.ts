import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

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
  attachments?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, address, accidentDate, injuryArea, atFault, contactNumber, attachments }: InjuryClaimRequest = await req.json();

    console.log("Processing injury claim for:", name);

    const attachmentsHtml = attachments && attachments.length > 0
      ? `
        <h3>Attached Photos/Videos</h3>
        <ul>
          ${attachments.map((url, index) => {
            const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
            return `<li><a href="${url}" target="_blank">${isVideo ? 'Video' : 'Photo'} ${index + 1}</a></li>`;
          }).join('')}
        </ul>
      `
      : '';

    const emailResponse = await resend.emails.send({
      from: "Cars & Claims <onboarding@resend.dev>",
      to: ["re00445@gmail.com"],
      subject: "New Injury Claim Inquiry",
      html: `
        <h2>New Injury Claim Inquiry</h2>
        <p><strong>Prospect Information:</strong></p>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Address:</strong> ${address}</li>
          <li><strong>Best Contact Number:</strong> ${contactNumber}</li>
        </ul>
        <p><strong>Accident Details:</strong></p>
        <ul>
          <li><strong>Accident Date:</strong> ${accidentDate}</li>
          <li><strong>Area of Bodily Injury:</strong> ${injuryArea}</li>
          <li><strong>Were They At Fault:</strong> ${atFault}</li>
        </ul>
        ${attachmentsHtml}
      `,
    });

    console.log("Injury claim email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending injury claim:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
