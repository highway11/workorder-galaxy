
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.3";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle OPTIONS requests for CORS
const handleOptionsRequest = () => {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      "Allow": "POST, OPTIONS",
    },
    status: 204,
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleOptionsRequest();
  }
  
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }
  
  try {
    // Parse the request body
    const { workorder_id, schedule_type, next_run, created_by } = await req.json();
    
    if (!workorder_id || !schedule_type || !next_run || !created_by) {
      throw new Error("Missing required parameters");
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL and service role key are required");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create the workorder schedule
    const { data, error } = await supabase
      .from('workorder_schedules')
      .insert({
        workorder_id,
        schedule_type,
        next_run,
        created_by,
        active: true
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return new Response(
      JSON.stringify({ success: true, schedule_id: data.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-schedule function:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
