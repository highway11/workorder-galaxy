
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL and service role key are required");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log("Checking for scheduled workorders...");
    
    // Get schedules that need to be run
    const { data: schedulesToRun, error: schedulesError } = await supabase
      .from('workorder_schedules')
      .select('*')
      .lte('next_run', new Date().toISOString())
      .eq('active', true);
    
    if (schedulesError) {
      throw schedulesError;
    }
    
    console.log(`Found ${schedulesToRun?.length || 0} schedules to process`);
    
    // Process each schedule
    const results = await Promise.all(schedulesToRun?.map(async (schedule) => {
      try {
        // Get the original workorder details
        const { data: workorder, error: workorderError } = await supabase
          .from('workorders')
          .select('*')
          .eq('id', schedule.workorder_id)
          .single();
        
        if (workorderError) throw workorderError;
        
        // Calculate interval expression based on schedule_type
        let intervalValue = '1 month'; // Default
        
        switch (schedule.schedule_type) {
          case 'weekly': intervalValue = '7 days'; break;
          case '3-weeks': intervalValue = '21 days'; break;
          case 'monthly': intervalValue = '1 month'; break;
          case 'bi-monthly': intervalValue = '2 months'; break;
          case 'quarterly': intervalValue = '3 months'; break;
          case 'semi-annual': intervalValue = '6 months'; break;
          case 'annual': intervalValue = '1 year'; break;
          case 'bi-annual': intervalValue = '2 years'; break;
          case '5-year': intervalValue = '5 years'; break;
          case '6-year': intervalValue = '6 years'; break;
        }
        
        // Create a new workorder
        const { data: newWorkorder, error: insertError } = await supabase
          .from('workorders')
          .insert({
            date: new Date().toISOString(),
            complete_by: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
            requested_by: workorder.requested_by,
            item: workorder.item,
            description: workorder.description,
            location_id: workorder.location_id,
            gl_number: workorder.gl_number,
            group_id: workorder.group_id,
            created_by: workorder.created_by,
            status: 'open',
            parent_schedule_id: schedule.id
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        // Update next run time - add the interval to the current next_run
        const nextRunDate = new Date(schedule.next_run);
        let newNextRun;
        
        switch (schedule.schedule_type) {
          case 'weekly': 
            newNextRun = new Date(nextRunDate.setDate(nextRunDate.getDate() + 7)); 
            break;
          case '3-weeks': 
            newNextRun = new Date(nextRunDate.setDate(nextRunDate.getDate() + 21)); 
            break;
          case 'monthly': 
            newNextRun = new Date(nextRunDate.setMonth(nextRunDate.getMonth() + 1)); 
            break;
          case 'bi-monthly': 
            newNextRun = new Date(nextRunDate.setMonth(nextRunDate.getMonth() + 2)); 
            break;
          case 'quarterly': 
            newNextRun = new Date(nextRunDate.setMonth(nextRunDate.getMonth() + 3)); 
            break;
          case 'semi-annual': 
            newNextRun = new Date(nextRunDate.setMonth(nextRunDate.getMonth() + 6)); 
            break;
          case 'annual': 
            newNextRun = new Date(nextRunDate.setFullYear(nextRunDate.getFullYear() + 1)); 
            break;
          case 'bi-annual': 
            newNextRun = new Date(nextRunDate.setFullYear(nextRunDate.getFullYear() + 2)); 
            break;
          case '5-year': 
            newNextRun = new Date(nextRunDate.setFullYear(nextRunDate.getFullYear() + 5)); 
            break;
          case '6-year': 
            newNextRun = new Date(nextRunDate.setFullYear(nextRunDate.getFullYear() + 6)); 
            break;
          default:
            newNextRun = new Date(nextRunDate.setMonth(nextRunDate.getMonth() + 1)); 
            break;
        }
        
        const { error: updateError } = await supabase
          .from('workorder_schedules')
          .update({ next_run: newNextRun.toISOString() })
          .eq('id', schedule.id);
        
        if (updateError) throw updateError;
        
        // Send notification email
        if (newWorkorder) {
          try {
            await supabase.functions.invoke('send-workorder-notification', {
              body: { workOrderId: newWorkorder.id },
            });
            console.log(`Notification sent for workorder ${newWorkorder.id}`);
          } catch (error) {
            console.error("Error sending notification:", error);
          }
        }
        
        return { 
          success: true, 
          schedule_id: schedule.id, 
          new_workorder_id: newWorkorder?.id 
        };
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        return { 
          success: false, 
          schedule_id: schedule.id, 
          error: error.message 
        };
      }
    }) || []);
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in check-scheduled-workorders function:", error);
    
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
