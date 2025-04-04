
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vxqruxwaqmokirlmkmxs.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkOrderSchedule {
  id: string;
  workorder_id: string;
  schedule_type: string;
  next_run: string;
  active: boolean;
}

interface WorkOrder {
  id: string;
  item: string;
  description: string | null;
  requested_by: string;
  location_id: string;
  complete_by: string;
  gl_number: string | null;
  group_id: string;
  created_by: string;
  [key: string]: any;
}

serve(async (req) => {
  console.log('Checking scheduled workorders function triggered');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create Supabase client with Admin rights
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current time as ISO string
    const now = new Date().toISOString();
    
    // Find all active schedules that are due to run
    const { data: dueSchedules, error: scheduleError } = await supabase
      .from('workorder_schedules')
      .select('*')
      .eq('active', true)
      .lte('next_run', now);
    
    if (scheduleError) {
      console.error('Error fetching due schedules:', scheduleError);
      return new Response(
        JSON.stringify({ error: 'Error fetching due schedules' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${dueSchedules?.length || 0} schedules due for processing`);
    
    if (!dueSchedules || dueSchedules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No schedules due for processing' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const results = await Promise.all(
      dueSchedules.map(async (schedule: WorkOrderSchedule) => {
        return await processSchedule(supabase, schedule);
      })
    );
    
    return new Response(
      JSON.stringify({ 
        message: 'Schedules processed', 
        processed: results.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('General error in scheduled workorders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processSchedule(supabase, schedule: WorkOrderSchedule) {
  console.log(`Processing schedule ${schedule.id}`);
  
  try {
    // Get the template workorder
    const { data: templateWorkOrder, error: templateError } = await supabase
      .from('workorders')
      .select('*')
      .eq('id', schedule.workorder_id)
      .single();
    
    if (templateError) {
      console.error(`Error fetching template workorder ${schedule.workorder_id}:`, templateError);
      return {
        schedule_id: schedule.id,
        success: false,
        error: 'Error fetching template workorder'
      };
    }
    
    // Calculate the next run date based on the schedule type
    const nextRun = calculateNextRunDate(schedule.next_run, schedule.schedule_type);
    
    // Create a new workorder based on the template
    const newWorkOrderData = createWorkOrderFromTemplate(templateWorkOrder, schedule.id);
    
    const { data: newWorkOrder, error: createError } = await supabase
      .from('workorders')
      .insert([newWorkOrderData])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating new workorder:', createError);
      return {
        schedule_id: schedule.id,
        success: false,
        error: 'Error creating new workorder'
      };
    }
    
    // Generate workorder number for the new workorder
    const { data: generatedNumber, error: numberError } = await supabase
      .functions.invoke('generate-workorder-number', {
        body: { workOrderId: newWorkOrder.id }
      });
    
    // Update the schedule with the new next_run date
    const { error: updateError } = await supabase
      .from('workorder_schedules')
      .update({ next_run: nextRun })
      .eq('id', schedule.id);
    
    if (updateError) {
      console.error(`Error updating schedule ${schedule.id}:`, updateError);
      return {
        schedule_id: schedule.id,
        success: true,
        workorder_id: newWorkOrder.id,
        warning: 'Created workorder but failed to update schedule next_run date'
      };
    }
    
    // Send notification about the new workorder
    try {
      await supabase.functions.invoke('send-workorder-notification', {
        body: { workOrderId: newWorkOrder.id }
      });
    } catch (notifyError) {
      console.error(`Error sending notification for workorder ${newWorkOrder.id}:`, notifyError);
    }
    
    return {
      schedule_id: schedule.id,
      success: true,
      workorder_id: newWorkOrder.id,
      next_run: nextRun
    };
    
  } catch (error) {
    console.error(`Error processing schedule ${schedule.id}:`, error);
    return {
      schedule_id: schedule.id,
      success: false,
      error: error.message
    };
  }
}

function calculateNextRunDate(currentDate: string, scheduleType: string): string {
  const date = new Date(currentDate);
  
  switch (scheduleType) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case '3week':
      date.setDate(date.getDate() + 21);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'bimonthly':
      date.setMonth(date.getMonth() + 2);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semiannual':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'biannual':
      date.setFullYear(date.getFullYear() + 2);
      break;
    case '5year':
      date.setFullYear(date.getFullYear() + 5);
      break;
    case '6year':
      date.setFullYear(date.getFullYear() + 6);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  
  return date.toISOString();
}

function createWorkOrderFromTemplate(template: WorkOrder, scheduleId: string): Omit<WorkOrder, 'id'> {
  // Set the new complete_by date to be the same number of days from now
  // as the original complete_by was from the original date
  const origDate = new Date(template.date);
  const origCompleteBy = new Date(template.complete_by);
  const daysDiff = Math.ceil((origCompleteBy.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const now = new Date();
  const newCompleteBy = new Date();
  newCompleteBy.setDate(now.getDate() + daysDiff);
  
  // Create a new work order based on the template, but with new dates
  const newWorkOrder = {
    ...template,
    date: now.toISOString(),
    complete_by: newCompleteBy.toISOString(),
    status: 'open',
    closed_on: null,
    parent_schedule_id: scheduleId
  };
  
  // Remove properties that should not be duplicated
  delete newWorkOrder.id;
  delete newWorkOrder.wo_number;
  
  return newWorkOrder;
}
