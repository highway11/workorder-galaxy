
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create authenticated supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get request data
    const { workorderId, scheduleType } = await req.json();
    
    if (!workorderId || !scheduleType) {
      return new Response(
        JSON.stringify({ error: 'Work order ID and schedule type are required' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    console.log(`Creating schedule for workorder ${workorderId} with type ${scheduleType}`);
    
    // Calculate next run date based on schedule type
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (scheduleType) {
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case '3week':
        nextRun.setDate(nextRun.getDate() + 21);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case 'bimonthly':
        nextRun.setMonth(nextRun.getMonth() + 2);
        break;
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3);
        break;
      case 'semiannual':
        nextRun.setMonth(nextRun.getMonth() + 6);
        break;
      case 'annual':
        nextRun.setFullYear(nextRun.getFullYear() + 1);
        break;
      case 'biannual':
        nextRun.setFullYear(nextRun.getFullYear() + 2);
        break;
      case '5year':
        nextRun.setFullYear(nextRun.getFullYear() + 5);
        break;
      case '6year':
        nextRun.setFullYear(nextRun.getFullYear() + 6);
        break;
      default:
        nextRun.setMonth(nextRun.getMonth() + 1);
    }
    
    // Insert directly into workorder_schedules table
    const { data, error } = await supabase
      .from('workorder_schedules')
      .insert([{
        workorder_id: workorderId,
        schedule_type: scheduleType,
        next_run: nextRun.toISOString(),
        active: true
      }])
      .select();
    
    if (error) {
      console.error("Error creating work order schedule:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    return new Response(
      JSON.stringify(data),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
