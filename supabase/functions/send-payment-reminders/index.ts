import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
const cronSecret = Deno.env.get("CRON_SECRET");

const resend = new Resend(resendApiKey);

interface AccountWithProfile {
  id: string;
  user_id: string;
  current_balance: number;
  payment_amount: number;
  next_payment_date: string;
  late_fee_amount: number;
  status: string;
  profiles: {
    email: string;
    full_name: string | null;
    phone: string | null;
  };
  vehicles: {
    year: number;
    make: string;
    model: string;
  } | null;
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

async function sendSms(to: string, message: string): Promise<boolean> {
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("Twilio credentials not configured, skipping SMS");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        },
        body: new URLSearchParams({
          To: to,
          From: twilioPhoneNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio SMS error:", error);
      return false;
    }

    console.log("SMS sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resendApiKey) {
    console.log("Resend API key not configured, skipping email");
    return false;
  }

  try {
    const response = await resend.emails.send({
      from: "Cars & Claims <noreply@carsandclaims.com>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization - either via cron secret or JWT
    const cronSecretHeader = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    
    // Check cron secret first (for scheduled jobs)
    if (cronSecret && cronSecretHeader === cronSecret) {
      console.log("Authorized via cron secret");
    } else if (authHeader) {
      // Verify JWT token for admin users
      const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
      
      if (authError || !user) {
        console.error("Auth error:", authError);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Check if user is admin
      const { data: roleData } = await supabaseAuth
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log("Authorized via admin JWT");
    } else {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("Checking for payment reminders on:", today.toISOString());

    // Calculate reminder dates
    const sevenDaysBefore = new Date(today);
    sevenDaysBefore.setDate(sevenDaysBefore.getDate() + 7);
    
    const threeDaysBefore = new Date(today);
    threeDaysBefore.setDate(threeDaysBefore.getDate() + 3);
    
    const oneDayLate = new Date(today);
    oneDayLate.setDate(oneDayLate.getDate() - 1);

    // Get all active accounts with their profiles
    const { data: accounts, error: accountsError } = await supabase
      .from("customer_accounts")
      .select(`
        id,
        user_id,
        current_balance,
        payment_amount,
        next_payment_date,
        late_fee_amount,
        status,
        profiles!customer_accounts_user_id_fkey (
          email,
          full_name,
          phone
        ),
        vehicles (
          year,
          make,
          model
        )
      `)
      .eq("status", "active");

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      throw accountsError;
    }

    console.log(`Found ${accounts?.length || 0} active accounts`);

    const results = {
      sevenDayReminders: 0,
      threeDayReminders: 0,
      lateReminders: 0,
      errors: [] as string[],
    };

    for (const account of (accounts || []) as unknown as AccountWithProfile[]) {
      const paymentDate = new Date(account.next_payment_date);
      paymentDate.setHours(0, 0, 0, 0);
      
      const profile = account.profiles;
      if (!profile?.email) {
        console.log(`No email for account ${account.id}, skipping`);
        continue;
      }

      let reminderType: string | null = null;
      let subject = "";
      let message = "";
      let smsMessage = "";

      const vehicleInfo = account.vehicles 
        ? `${account.vehicles.year} ${escapeHtml(account.vehicles.make)} ${escapeHtml(account.vehicles.model)}` 
        : "your vehicle";
      const customerName = escapeHtml(profile.full_name || "Valued Customer");
      const formattedBalance = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(account.current_balance);
      const formattedPayment = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(account.payment_amount);
      const formattedDate = new Date(account.next_payment_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Check which reminder to send
      if (paymentDate.getTime() === sevenDaysBefore.getTime()) {
        reminderType = "7_days_before";
        subject = `Payment Reminder: ${formattedPayment} due in 7 days`;
        message = `
          <h2>Payment Reminder</h2>
          <p>Hello ${customerName},</p>
          <p>This is a friendly reminder that your payment of <strong>${formattedPayment}</strong> for ${vehicleInfo} is due in <strong>7 days</strong> on ${formattedDate}.</p>
          <p><strong>Current Balance:</strong> ${formattedBalance}</p>
          <p>Thank you for your business!</p>
          <p>- Cars &amp; Claims</p>
        `;
        smsMessage = `Cars & Claims: Your payment of ${formattedPayment} for ${vehicleInfo} is due in 7 days on ${formattedDate}. Balance: ${formattedBalance}`;
      } else if (paymentDate.getTime() === threeDaysBefore.getTime()) {
        reminderType = "3_days_before";
        subject = `Payment Reminder: ${formattedPayment} due in 3 days`;
        message = `
          <h2>Payment Due Soon</h2>
          <p>Hello ${customerName},</p>
          <p>Your payment of <strong>${formattedPayment}</strong> for ${vehicleInfo} is due in <strong>3 days</strong> on ${formattedDate}.</p>
          <p><strong>Current Balance:</strong> ${formattedBalance}</p>
          <p>Please ensure your payment is made on time to avoid late fees.</p>
          <p>- Cars &amp; Claims</p>
        `;
        smsMessage = `Cars & Claims: Payment of ${formattedPayment} due in 3 days on ${formattedDate}. Balance: ${formattedBalance}. Pay on time to avoid late fees.`;
      } else if (paymentDate.getTime() === oneDayLate.getTime()) {
        reminderType = "1_day_late";
        const lateFee = account.late_fee_amount || 25;
        const formattedLateFee = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(lateFee);
        
        subject = `OVERDUE: Payment of ${formattedPayment} is past due`;
        message = `
          <h2 style="color: #dc2626;">Payment Overdue</h2>
          <p>Hello ${customerName},</p>
          <p>Your payment of <strong>${formattedPayment}</strong> for ${vehicleInfo} was due on ${formattedDate} and is now <strong>1 day past due</strong>.</p>
          <p><strong>Current Balance:</strong> ${formattedBalance}</p>
          <p style="color: #dc2626;"><strong>A late fee of ${formattedLateFee} may be applied to your account.</strong></p>
          <p>Please make your payment as soon as possible to avoid additional fees.</p>
          <p>- Cars &amp; Claims</p>
        `;
        smsMessage = `OVERDUE: Cars & Claims payment of ${formattedPayment} was due ${formattedDate}. Late fee of ${formattedLateFee} may apply. Please pay ASAP.`;
      }

      if (reminderType) {
        // Check if we already sent this reminder
        const { data: existingReminder } = await supabase
          .from("payment_reminders")
          .select("id")
          .eq("account_id", account.id)
          .eq("reminder_type", reminderType)
          .gte("sent_at", today.toISOString())
          .maybeSingle();

        if (existingReminder) {
          console.log(`Already sent ${reminderType} reminder for account ${account.id} today`);
          continue;
        }

        // Send notifications
        const emailSent = await sendEmail(profile.email, subject, message);
        const smsSent = profile.phone ? await sendSms(profile.phone, smsMessage) : false;
        
        const sentVia = emailSent && smsSent ? "both" : emailSent ? "email" : smsSent ? "sms" : "none";
        const status = emailSent || smsSent ? "sent" : "failed";

        // Record the reminder
        const { error: insertError } = await supabase
          .from("payment_reminders")
          .insert({
            account_id: account.id,
            reminder_type: reminderType,
            sent_via: sentVia,
            status,
            error_message: status === "failed" ? "Failed to send notification" : null,
          });

        if (insertError) {
          console.error("Error recording reminder:", insertError);
          results.errors.push(`Failed to record reminder for account ${account.id}`);
        }

        if (reminderType === "7_days_before") results.sevenDayReminders++;
        else if (reminderType === "3_days_before") results.threeDayReminders++;
        else if (reminderType === "1_day_late") results.lateReminders++;

        console.log(`Sent ${reminderType} reminder to ${profile.email} via ${sentVia}`);
      }
    }

    console.log("Reminder results:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-payment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);