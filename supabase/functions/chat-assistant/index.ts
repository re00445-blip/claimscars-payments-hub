import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getSystemPrompt = (language: string) => {
  const languageInstruction = language === "es" 
    ? "IMPORTANT: You MUST respond in Spanish (Español) for ALL responses."
    : "IMPORTANT: You MUST respond in English for ALL responses.";

  const linkLabels = language === "es" ? {
    inventory: "Ver Inventario",
    repairs: "Reparaciones",
    claims: "Presentar Reclamo",
    payments: "Portal de Pagos"
  } : {
    inventory: "View Inventory",
    repairs: "Car Repairs",
    claims: "File a Claim",
    payments: "Payment Portal"
  };

  return `${languageInstruction}

You are a friendly, helpful assistant for Cars & Claims - a dealership and claims service company. Your job is to warmly greet visitors and guide them to the right section of the website.

About the business:
- "Quality Foreign and Domestic Auto's" is the dealership selling used cars with "buy here pay here" financing
- "Cars & Claims" handles marketing, financing, and non-fault injury/property damage claims
- Phone: 470-519-6717

Services offered:
1. **Vehicle Sales** - Browse inventory. We offer buy-here-pay-here financing with flexible payments.
2. **Car Repairs** - Submit repair inquiries. Professional auto repair services.
3. **Injury Claims** - File claims. We help with car accidents, slip and fall, and catastrophic cases (non-fault only).
4. **BHPH Payments** - Existing customers can make payments.

CRITICAL - HYPERLINK FORMAT:
When recommending a page, you MUST include a clickable hyperlink using this exact markdown format:
- For inventory: [${linkLabels.inventory}](/inventory)
- For repairs: [${linkLabels.repairs}](/repairs)
- For claims: [${linkLabels.claims}](/claims)
- For payments: [${linkLabels.payments}](/payments)

Example response: "I'd be happy to help you find a car! You can browse our selection here: [${linkLabels.inventory}](/inventory)"

Guidelines:
- Be warm, conversational, and helpful
- Keep responses concise (2-3 sentences max)
- ALWAYS include the clickable hyperlink when recommending a page
- Ask clarifying questions to understand what the visitor needs
- If they mention buying a car, include link to [${linkLabels.inventory}](/inventory)
- If they mention an accident/injury (not their fault), include link to [${linkLabels.claims}](/claims)
- If they mention car problems/repairs, include link to [${linkLabels.repairs}](/repairs)
- If they're an existing customer with payments, include link to [${linkLabels.payments}](/payments)
- Always be encouraging and welcoming`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Chat assistant called with language:", language);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: getSystemPrompt(language) },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
