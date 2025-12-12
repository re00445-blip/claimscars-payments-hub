import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VehicleData {
  year: number;
  make: string;
  model: string;
  mileage?: number;
  color?: string;
  price: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const vehicleData: VehicleData = await req.json();
    console.log("Generating description for vehicle:", vehicleData);

    const { year, make, model, mileage, color, price } = vehicleData;

    // Calculate financing details based on the template
    const downPayment = Math.round(price * 0.3); // ~30% down
    const financedAmount = price - downPayment;
    const monthlyPayment = Math.round(financedAmount / 15); // ~15 month term

    const prompt = `Generate a short, compelling vehicle sales description for a used car dealership. Follow this exact template style:

Template example: "Highway ready! Runs and drives amazing. Cold AC and hot heater. $6,500 out the door price with financing available: $2,000 down payment at $300/month with 33.33% in-house financing."

Vehicle details:
- Year: ${year}
- Make: ${make}
- Model: ${model}
${mileage ? `- Mileage: ${mileage.toLocaleString()} miles` : ""}
${color ? `- Color: ${color}` : ""}
- Price: $${price.toLocaleString()}
- Suggested down payment: $${downPayment.toLocaleString()}
- Suggested monthly payment: $${monthlyPayment}/month

Write a similar 2-3 sentence description that:
1. Starts with an enthusiastic hook about the vehicle condition
2. Mentions key features (AC, heater, reliability, etc.)
3. Ends with the out-the-door price and financing terms (33.33% in-house financing)

Keep it under 50 words. Do not use quotation marks in your response.`;

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
            content: "You are a helpful assistant that writes compelling used car sales descriptions. Keep descriptions short, punchy, and sales-focused. Always mention financing options."
          },
          { role: "user", content: prompt },
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
      throw new Error("Failed to generate description");
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() || "";

    console.log("Generated description:", description);

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating description:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
