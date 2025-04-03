
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
    const { workorder_id } = await req.json();
    
    if (!workorder_id) {
      throw new Error("Missing required parameters");
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL and service role key are required");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // First get the parent_schedule_id from the workorder
    const { data: workorder, error: workorderError } = await supabase
      .from('workorders')
      .select('parent_schedule_id')
      .eq('id', workorder_id)
      .single();
    
    if (workorderError || !workorder || !workorder.parent_schedule_id) {
      return new Response(
        JSON.stringify({ parentSchedule: null }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // Then get the schedule and its associated workorder
    const { data, error } = await supabase
      .from('workorder_schedules')
      .select(`
        *,
        parent_workorder:workorder_id(id, wo_number)
      `)
      .eq('id', workorder.parent_schedule_id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return new Response(
      JSON.stringify({ parentSchedule: data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in get-parent-schedule function:", error);
    
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
