
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create a Supabase client with the service role key
  // This bypasses RLS and allows the function to see all work orders
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log("Generating new unique work order number");

  try {
    // Get the current year
    const currentYear = new Date().getFullYear().toString();
    
    // Find the latest number for the current year from ALL work orders
    // This bypasses RLS using the service role
    const { data, error } = await supabase
      .from("workorders")
      .select("wo_number")
      .like("wo_number", `${currentYear}-%`)
      .order("wo_number", { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("Error fetching latest work order number:", error);
      throw error;
    }
    
    console.log("Latest work order data:", data);
    
    let latestNumber = 0;
    
    if (data && data.length > 0 && data[0].wo_number) {
      // Extract the number part of the work order number (e.g., from "2025-0001" get "0001")
      const matches = data[0].wo_number.match(new RegExp(`^${currentYear}-([0-9]+)$`));
      if (matches && matches.length > 1) {
        latestNumber = parseInt(matches[1], 10);
      }
    }
    
    // Calculate the next number
    const nextNumber = latestNumber + 1;
    
    // Format the new work order number: YYYY-XXXX (e.g., 2025-0001)
    const newWorkOrderNumber = `${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    
    console.log("Generated new work order number:", newWorkOrderNumber);
    
    return new Response(
      JSON.stringify({ 
        workOrderNumber: newWorkOrderNumber,
        message: "Unique work order number generated successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating work order number:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
