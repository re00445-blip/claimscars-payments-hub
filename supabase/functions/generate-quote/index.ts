import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an inspirational quote generator. Generate a single short, uplifting, and motivational quote about success, perseverance, financial freedom, or new beginnings. The quote should be encouraging for someone making car payments or working toward their goals. Only respond with the quote itself, no attribution or quotation marks."
          },
          {
            role: "user",
            content: "Generate an inspirational quote of the day."
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate quote");
    }

    const data = await response.json();
    const quote = data.choices?.[0]?.message?.content?.trim() || "Every payment brings you closer to your dreams.";

    return new Response(JSON.stringify({ quote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating quote:", error);
    return new Response(
      JSON.stringify({ quote: "Every step forward is a step toward achieving something bigger and better." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
