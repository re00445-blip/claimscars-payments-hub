import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-STRIPE-PAYMENT] ${step}${detailsStr}`);
};

const generateReceiptHTML = (data: {
  customerName: string;
  vehicleInfo: string;
  paymentDate: string;
  invoiceNumber: string;
  totalAmount: number;
  paymentMethod: string;
  remainingBalance: number;
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Receipt - Invoice #${data.invoiceNumber}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px; color: #22c55e;">Quality Foreign Domestic Autos</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #9ca3af;">Professional Auto Sales & Service</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #22c55e; margin: 0;">PAYMENT RECEIPT</h2>
          <p style="color: #666; margin: 5px 0;">Invoice #${data.invoiceNumber}</p>
          <p style="color: #666; margin: 5px 0;">Date: ${data.paymentDate}</p>
        </div>
        
        <hr style="border: none; border-top: 2px solid #22c55e; margin: 20px 0;">
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Customer Information</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${data.customerName}</p>
          <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${data.vehicleInfo}</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <table style="width: 100%;">
            <tr>
              <td style="font-size: 18px; font-weight: bold;">TOTAL PAID</td>
              <td style="font-size: 24px; font-weight: bold; text-align: right;">$${data.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
          <p style="margin: 5px 0;"><strong>Remaining Balance:</strong> $${data.remainingBalance.toFixed(2)}</p>
        </div>
        
        <hr style="border: none; border-top: 1px dashed #ccc; margin: 25px 0;">
        
        <div style="text-align: center; color: #666;">
          <h3 style="color: #22c55e; margin-bottom: 10px;">Thank You for Your Payment!</h3>
          <p style="margin: 5px 0; font-size: 14px;">We appreciate your trust in Quality Foreign Domestic Autos.</p>
          <p style="margin: 15px 0 5px 0; font-size: 12px;"><strong>Contact:</strong> 470-519-6717</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Email:</strong> ramon@carsandclaims.com</p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 15px; color: #999; font-size: 11px;">
        <p>This is an official receipt from Quality Foreign Domestic Autos.</p>
        <p>Please keep this for your records.</p>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("stripeAPi");
    if (!stripeKey) throw new Error("stripeAPi is not set");
    logStep("Stripe key verified");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");
    logStep("Resend key verified");

    // Use service role client - don't require auth header since user returns from Stripe
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    logStep("Session ID received", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status, amount: session.amount_total });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Check if this payment was already recorded
    const { data: existingPayment } = await supabaseClient
      .from("payments")
      .select("id")
      .eq("receipt_url", sessionId)
      .maybeSingle();

    if (existingPayment) {
      logStep("Payment already recorded", { paymentId: existingPayment.id });
      return new Response(JSON.stringify({ success: true, alreadyRecorded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const accountId = session.metadata?.accountId;
    const amount = (session.amount_total || 0) / 100; // Convert from cents
    logStep("Payment details", { accountId, amount });

    if (!accountId) {
      throw new Error("Account ID not found in session metadata");
    }

    // Fetch account details
    const { data: account, error: accountError } = await supabaseClient
      .from("customer_accounts")
      .select(`
        *,
        vehicles (year, make, model)
      `)
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      throw new Error("Account not found");
    }
    logStep("Account fetched", { balance: account.current_balance });

    // Fetch customer profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", account.user_id)
      .single();

    const customerName = profile?.full_name || "Customer";
    const customerEmail = profile?.email;
    logStep("Customer info", { customerName, customerEmail });

    // Calculate payment breakdown (simple split - 80% principal, 20% interest for online payments)
    const principalPaid = amount * 0.8;
    const interestPaid = amount * 0.2;
    const newBalance = Math.max(0, account.current_balance - principalPaid);

    // Generate invoice number
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${sessionId.slice(-5).toUpperCase()}`;

    // Record the payment
    const { data: newPayment, error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        account_id: accountId,
        amount: amount,
        principal_paid: principalPaid,
        interest_paid: interestPaid,
        late_fee_paid: 0,
        payment_method: "Card (Online)",
        receipt_url: sessionId, // Store session ID to prevent duplicates
        notes: "Online payment via Stripe",
        payment_date: now.toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      logStep("Payment insert error", { error: paymentError.message });
      throw new Error(`Failed to record payment: ${paymentError.message}`);
    }
    logStep("Payment recorded", { paymentId: newPayment.id });

    // Update account balance
    const { error: updateError } = await supabaseClient
      .from("customer_accounts")
      .update({ current_balance: newBalance })
      .eq("id", accountId);

    if (updateError) {
      logStep("Balance update error", { error: updateError.message });
    } else {
      logStep("Balance updated", { newBalance });
    }

    // Prepare vehicle info
    const vehicleInfo = account.vehicles 
      ? `${account.vehicles.year} ${account.vehicles.make} ${account.vehicles.model}`
      : "Vehicle";

    // Generate and send receipt
    const receiptHTML = generateReceiptHTML({
      customerName,
      vehicleInfo,
      paymentDate: now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      invoiceNumber,
      totalAmount: amount,
      paymentMethod: "Credit/Debit Card (Online)",
      remainingBalance: newBalance,
    });

    const resend = new Resend(resendKey);

    // Send to customer
    if (customerEmail) {
      try {
        const customerResponse = await resend.emails.send({
          from: "Quality Foreign Domestic Autos <noreply@carsandclaims.com>",
          to: [customerEmail],
          subject: `Payment Receipt - Invoice #${invoiceNumber}`,
          html: receiptHTML,
        });
        logStep("Customer email sent", { response: customerResponse });
      } catch (emailError: any) {
        logStep("Customer email error", { error: emailError.message });
      }
    }

    // Send to admin
    try {
      const adminResponse = await resend.emails.send({
        from: "Quality Foreign Domestic Autos <noreply@carsandclaims.com>",
        to: ["ramon@carsandclaims.com"],
        subject: `Payment Received - ${customerName} - Invoice #${invoiceNumber} - $${amount.toFixed(2)}`,
        html: receiptHTML,
      });
      logStep("Admin email sent", { response: adminResponse });
    } catch (emailError: any) {
      logStep("Admin email error", { error: emailError.message });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      paymentId: newPayment.id,
      newBalance,
      invoiceNumber
    }), {
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
