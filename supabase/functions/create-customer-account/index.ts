import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    const body = await req.json();
    const { 
      customer_name, 
      customer_email, 
      customer_phone, 
      customer_address,
      vehicle_year,
      vehicle_make,
      vehicle_model,
      vehicle_vin,
      principal_amount,
      current_balance,
      interest_rate,
      payment_amount,
      next_payment_date,
      late_fee_amount,
      status,
      payment_frequency
    } = body;

    // Generate email if not provided (use phone-based placeholder)
    const email = customer_email || `${customer_phone.replace(/\D/g, '')}@customer.local`;
    
    // Default password for BHPH customers
    const password = "123456";

    // Check if user already exists by email
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let userId: string;
    let isNewUser = false;

    if (existingProfile) {
      userId = existingProfile.id;
      // Update existing profile
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: customer_name,
          phone: customer_phone,
          address: customer_address,
        })
        .eq("id", userId);
    } else {
      // Create new user via admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: customer_name,
        }
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      isNewUser = true;

      // Wait briefly for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Upsert profile to ensure it exists with correct data
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: email,
          full_name: customer_name,
          phone: customer_phone,
          address: customer_address,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error("Profile upsert error:", profileError);
      }

      // Send credentials via email to the customer (only if they have a real email)
      if (customer_email && customer_email.includes('@') && !customer_email.endsWith('@customer.local')) {
        try {
          await resend.emails.send({
            from: "Cars & Claims <noreply@carsandclaims.com>",
            to: [customer_email],
            subject: "Your Cars & Claims Account Credentials",
            html: `
              <h2>Welcome to Cars &amp; Claims!</h2>
              <p>Hello ${customer_name},</p>
              <p>Your account has been created. Here are your login credentials:</p>
              <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Temporary Password:</strong> ${password}</li>
              </ul>
              <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
              <p>You can access your account at the payment portal to view your balance and payment history.</p>
              <p>Thank you for choosing Cars &amp; Claims!</p>
            `,
          });
          console.log("Credentials sent to customer via email");
        } catch (emailError) {
          console.error("Failed to send credentials email:", emailError);
          // Don't fail the whole operation if email fails
        }
      }
    }

    // Create vehicle if info provided
    let vehicleId: string | null = null;
    if (vehicle_year && vehicle_make && vehicle_model) {
      const { data: vehicleData, error: vehicleError } = await supabaseAdmin
        .from("vehicles")
        .insert({
          year: parseInt(vehicle_year),
          make: vehicle_make,
          model: vehicle_model,
          vin: vehicle_vin || `MANUAL-${Date.now()}`,
          price: principal_amount,
          status: "sold",
        })
        .select()
        .single();

      if (!vehicleError && vehicleData) {
        vehicleId = vehicleData.id;
      }
    }

    // Create customer account
    const { data: accountData, error: accountError } = await supabaseAdmin
      .from("customer_accounts")
      .insert({
        user_id: userId,
        vehicle_id: vehicleId,
        principal_amount,
        current_balance,
        interest_rate,
        payment_amount,
        next_payment_date,
        late_fee_amount,
        status,
        payment_frequency,
      })
      .select()
      .single();

    if (accountError) {
      throw new Error(`Failed to create account: ${accountError.message}`);
    }

    // Return success without exposing password in response
    return new Response(
      JSON.stringify({ 
        success: true, 
        account: accountData,
        userId,
        generatedEmail: !customer_email ? email : undefined,
        // Password is sent via email, not returned in response for security
        credentialsSent: isNewUser && customer_email && !customer_email.endsWith('@customer.local'),
        message: isNewUser 
          ? (customer_email && !customer_email.endsWith('@customer.local') 
              ? "Account created. Login credentials sent to customer's email." 
              : "Account created. Please provide credentials to customer manually.")
          : "Account updated for existing user."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});