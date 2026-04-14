import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BHPH-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_API_KEY") || Deno.env.get("stripeAPi");
    if (!stripeKey) throw new Error("Stripe API key is not set (checked STRIPE_API_KEY and stripeAPi)");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Please sign in to make a payment");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Auth error details", { errorMessage: userError.message });
      throw new Error("Your session has expired. Please sign in again to make a payment.");
    }
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { amount, convenienceFee, totalCharge, accountId, accountBalance } = await req.json();
    
    if (!amount || amount <= 0) {
      throw new Error("Invalid payment amount");
    }
    if (amount < 0.50) {
      throw new Error("Minimum payment amount is $0.50");
    }
    if (amount > 50000) {
      throw new Error("Maximum single payment is $50,000. Contact us for larger payments.");
    }
    if (!accountId) {
      throw new Error("Account ID is required");
    }

    // Verify the authenticated user owns this account
    const { data: account, error: accountError } = await supabaseClient
      .from("customer_accounts")
      .select("user_id")
      .eq("id", accountId)
      .single();
    if (accountError || !account) {
      throw new Error("Account not found");
    }
    if (account.user_id !== user.id) {
      logStep("Ownership check failed", { accountUserId: account.user_id, authUserId: user.id });
      throw new Error("You can only make payments on your own account");
    }
    logStep("Account ownership verified");

    // Recalculate convenience fee server-side to prevent tampering
    const fee = Math.round(amount * 0.03 * 100) / 100;
    const chargeAmount = amount + fee;
    
    logStep("Request parsed", { amount, convenienceFee: fee, totalCharge: chargeAmount, accountId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://carsandclaims.com";

    // Build line items - include convenience fee as separate line item for transparency
    const lineItems = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "BHPH Account Payment",
            description: `Payment for your Cars & Claims account. Current balance: $${accountBalance?.toFixed(2) || 'N/A'}`,
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ];

    // Add convenience fee as separate line item if present
    if (fee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Convenience Fee",
            description: "3% processing fee for card payments",
          },
          unit_amount: Math.round(fee * 100),
        },
        quantity: 1,
      });
    }

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payments?canceled=true`,
      metadata: {
        accountId: accountId,
        userId: user.id,
        paymentType: "bhph_payment",
        baseAmount: amount.toString(),
        convenienceFee: fee.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
