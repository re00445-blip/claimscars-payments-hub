import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-STRIPE-PAYMENT] ${step}${detailsStr}`);
};

const generateReceiptHTML = (data: {
  customerName: string;
  vehicleInfo: string;
  paymentDate: string;
  invoiceNumber: string;
  principalPaid: number;
  interestPaid: number;
  lateFeePaid: number;
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
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Payment Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Principal Payment</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${data.principalPaid.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Interest Payment</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${data.interestPaid.toFixed(2)}</td>
            </tr>
            ${data.lateFeePaid > 0 ? `
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Late Fee</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${data.lateFeePaid.toFixed(2)}</td>
            </tr>
            ` : ''}
          </table>
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
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_API_KEY") || Deno.env.get("stripeAPi");
    if (!stripeKey) throw new Error("Stripe API key is not set (checked STRIPE_API_KEY and stripeAPi)");
    logStep("Stripe key verified");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");
    logStep("Resend key verified");

    // Service role client for DB operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller identity when auth header is present
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      authenticatedUserId = userData?.user?.id || null;
      logStep("Caller authenticated", { userId: authenticatedUserId });
    }

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    logStep("Session ID received", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status, amount: session.amount_total });

    // Verify the caller matches the session owner (when auth is available)
    const sessionUserId = session.metadata?.userId;
    if (authenticatedUserId && sessionUserId && authenticatedUserId !== sessionUserId) {
      logStep("User mismatch", { caller: authenticatedUserId, sessionOwner: sessionUserId });
      throw new Error("You can only verify your own payments");
    }

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Verify session is fully complete (not just paid)
    if (session.status !== "complete") {
      throw new Error(`Checkout session is not complete (status: ${session.status})`);
    }

    // Verify session was created recently (within the last hour) to prevent replay attacks
    const sessionCreatedAt = (session.created || 0) * 1000; // Stripe timestamps are in seconds
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (sessionCreatedAt < oneHourAgo) {
      throw new Error("Checkout session has expired (older than 1 hour)");
    }
    logStep("Session age verified", { createdAt: new Date(sessionCreatedAt).toISOString() });

    // Log Stripe payment intent ID for audit trail
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
    logStep("Audit trail", { paymentIntentId, sessionId, paymentStatus: session.payment_status });

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

    // Calculate late fees if payment is overdue
    let lateFeeAmount = 0;
    const today = new Date();
    const nextPaymentDue = new Date(account.next_payment_date + 'T00:00:00');
    const dailyLateFee = account.late_fee_amount || 20; // Default $20/day
    
    if (today > nextPaymentDue) {
      const daysLate = Math.floor((today.getTime() - nextPaymentDue.getTime()) / (1000 * 60 * 60 * 24));
      const rawLateFees = daysLate * dailyLateFee;
      const waivedLateFees = account.waived_late_fees || 0;
      lateFeeAmount = Math.max(0, rawLateFees - waivedLateFees);
      logStep("Late fee calculated", { daysLate, dailyLateFee, rawLateFees, waivedLateFees, netLateFee: lateFeeAmount });
    }

    // Calculate payment breakdown based on account interest type
    let principalPaid = 0;
    let interestPaid = 0;
    let lateFeePaid = 0;
    
    // First, pay off any late fees
    let remainingPayment = amount;
    if (lateFeeAmount > 0 && remainingPayment > 0) {
      lateFeePaid = Math.min(lateFeeAmount, remainingPayment);
      remainingPayment -= lateFeePaid;
    }
    
    // Then, handle interest based on account type
    if (account.interest_rate_type === "flat_fee") {
      // For flat fee: interest is the flat fee amount
      interestPaid = Math.min(account.interest_rate, remainingPayment);
      remainingPayment -= interestPaid;
      principalPaid = remainingPayment;
    } else {
      // For percentage: calculate monthly interest
      const monthlyInterest = (account.current_balance * (account.interest_rate / 100)) / 12;
      interestPaid = Math.min(monthlyInterest, remainingPayment);
      remainingPayment -= interestPaid;
      principalPaid = remainingPayment;
    }
    
    logStep("Payment breakdown", { principalPaid, interestPaid, lateFeePaid });

    // Generate invoice number
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${sessionId.slice(-5).toUpperCase()}`;

    // Calculate next payment date based on payment frequency
    const calculateNextPaymentDate = (currentDate: string, frequency: string | null): string => {
      const date = new Date(currentDate + 'T00:00:00');
      switch (frequency) {
        case 'weekly':
          date.setDate(date.getDate() + 7);
          break;
        case 'biweekly':
          date.setDate(date.getDate() + 14);
          break;
        case 'monthly':
        default:
          date.setMonth(date.getMonth() + 1);
          break;
      }
      return date.toISOString().split('T')[0];
    };

    const nextPaymentDate = calculateNextPaymentDate(account.next_payment_date, account.payment_frequency);

    // Record payment + update balance atomically in a single transaction
    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc("record_payment_atomic", {
      _account_id: accountId,
      _amount: amount,
      _principal_paid: principalPaid,
      _interest_paid: interestPaid,
      _late_fee_paid: lateFeePaid,
      _payment_method: "Card (Online)",
      _entry_type: "automatic",
      _receipt_url: sessionId,
      _notes: lateFeePaid > 0 ? `Online payment via Stripe (includes $${lateFeePaid.toFixed(2)} late fees)` : "Online payment via Stripe",
      _payment_date: now.toISOString(),
      _next_payment_date: nextPaymentDate,
    });

    if (rpcError) {
      // Handle unique constraint violation (duplicate payment from race condition)
      if (rpcError.code === "23505" || rpcError.message?.includes("unique") || rpcError.message?.includes("duplicate")) {
        logStep("Duplicate payment caught by constraint", { sessionId });
        return new Response(JSON.stringify({ success: true, alreadyRecorded: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      logStep("Payment RPC error", { error: rpcError.message });
      throw new Error(`Failed to record payment: ${rpcError.message}`);
    }

    const newPaymentId = rpcResult?.payment_id;
    const newBalance = rpcResult?.new_balance ?? 0;
    logStep("Payment recorded atomically", { paymentId: newPaymentId, newBalance, nextPaymentDate });

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
      principalPaid,
      interestPaid,
      lateFeePaid,
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
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "ramon@carsandclaims.com";
    try {
      const adminResponse = await resend.emails.send({
        from: "Quality Foreign Domestic Autos <noreply@carsandclaims.com>",
        to: [adminEmail],
        subject: `Payment Received - ${customerName} - Invoice #${invoiceNumber} - $${amount.toFixed(2)}`,
        html: receiptHTML,
      });
      logStep("Admin email sent", { response: adminResponse });
    } catch (emailError: any) {
      logStep("Admin email error", { error: emailError.message });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      paymentId: newPaymentId,
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
