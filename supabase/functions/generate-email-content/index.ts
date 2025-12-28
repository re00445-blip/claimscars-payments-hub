import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  occasion: string;
  type: "email" | "sms";
}

const occasionPrompts: Record<string, string> = {
  // Seasons
  "spring": "Spring season - focus on new beginnings, warmer weather, spring cleaning specials",
  "summer": "Summer season - focus on summer road trips, vacation readiness, A/C checks",
  "fall": "Fall/Autumn season - focus on back to school, fall maintenance, cooler weather prep",
  "winter": "Winter season - focus on winter safety, holiday travel, cold weather car care",
  
  // Major Holidays
  "new-year": "New Year - focus on fresh starts, resolutions, starting the year right with reliable transportation",
  "valentines": "Valentine's Day - focus on showing love to your vehicle, treating yourself or a loved one",
  "easter": "Easter - focus on spring travel, family gatherings, reliable transportation for the holidays",
  "memorial-day": "Memorial Day - focus on honoring service, summer kickoff, road trip season",
  "independence-day": "Independence Day/4th of July - focus on patriotism, summer celebrations, travel safety",
  "labor-day": "Labor Day - focus on end of summer, back to school, appreciation for hard work",
  "halloween": "Halloween - focus on fall fun, safety, spooky season specials",
  "thanksgiving": "Thanksgiving - focus on gratitude, family travel, thankful for loyal customers",
  "christmas": "Christmas/Holiday Season - focus on holiday cheer, gift giving, year-end appreciation",
  
  // Events
  "tax-season": "Tax Season - focus on tax refunds, using refund for down payment or payments",
  "back-to-school": "Back to School - focus on reliable transportation for students and families",
  "black-friday": "Black Friday/Cyber Monday - focus on special deals, limited time offers",
  "payment-reminder": "Payment Reminder - friendly reminder about upcoming or past due payments",
  "service-reminder": "Service/Maintenance Reminder - focus on vehicle maintenance, oil changes, inspections",
  "referral-program": "Referral Program - encourage customers to refer friends and family",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { occasion, type }: GenerateRequest = await req.json();
    console.log(`Generating ${type} content for occasion: ${occasion}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const occasionContext = occasionPrompts[occasion] || occasion;
    
    const systemPrompt = type === "email" 
      ? `You are a professional marketing copywriter for Cars & Claims, a buy-here-pay-here car dealership and injury claims company in Athens, GA. 
         Generate a warm, professional email for customers.
         Keep the tone friendly but professional.
         The email should be 2-3 short paragraphs.
         Do NOT include greetings like "Dear Customer" or sign-offs - those are added automatically.
         Focus on the content/body only.`
      : `You are a professional marketing copywriter for Cars & Claims.
         Generate a short, friendly SMS message for customers.
         Keep it under 150 characters.
         Be concise and include a clear call to action if appropriate.
         Do NOT include greetings - get straight to the point.`;

    const userPrompt = `Generate ${type === "email" ? "an email body" : "an SMS message"} for: ${occasionContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate content");
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content || "";

    // Also generate a subject line for emails
    let subject = "";
    if (type === "email") {
      const subjectResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Generate a short, engaging email subject line (max 60 characters). Return ONLY the subject line, no quotes or extra text." },
            { role: "user", content: `Subject line for: ${occasionContext}` },
          ],
        }),
      });

      if (subjectResponse.ok) {
        const subjectData = await subjectResponse.json();
        subject = subjectData.choices?.[0]?.message?.content?.trim() || "";
      }
    }

    console.log("Content generated successfully");
    return new Response(
      JSON.stringify({ content: generatedContent.trim(), subject: subject }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating content:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
