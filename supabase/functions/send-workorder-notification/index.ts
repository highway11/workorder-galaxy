
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

// Interface for the request payload
interface NotificationPayload {
  workOrderId: string;
}

// Function to get users who should be notified for a specific group
async function getUsersToNotify(supabase: any, groupId: string) {
  const { data, error } = await supabase
    .from('user_groups')
    .select(`
      user_id,
      profiles:user_id(
        email,
        name
      )
    `)
    .eq('group_id', groupId)
    .eq('notify', true);
  
  if (error) {
    console.error('Error fetching users to notify:', error);
    throw error;
  }
  
  // Extract user information from the response
  return data.map((item: any) => ({
    userId: item.user_id,
    email: item.profiles.email,
    name: item.profiles.name,
  }));
}

// Function to get work order details
async function getWorkOrderDetails(supabase: any, workOrderId: string) {
  const { data, error } = await supabase
    .from('workorders')
    .select(`
      id,
      wo_number,
      item,
      description,
      date,
      complete_by,
      requested_by,
      locations:location_id(name),
      groups:group_id(name, id)
    `)
    .eq('id', workOrderId)
    .single();
  
  if (error) {
    console.error('Error fetching work order details:', error);
    throw error;
  }
  
  return data;
}

// Main server function
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
    const requestData: NotificationPayload = await req.json();
    const { workOrderId } = requestData;
    
    if (!workOrderId) {
      throw new Error("Work order ID is required");
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL and service role key are required");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get work order details
    const workOrder = await getWorkOrderDetails(supabase, workOrderId);
    
    if (!workOrder || !workOrder.groups || !workOrder.groups.id) {
      throw new Error("Work order or group information not found");
    }
    
    // Get users to notify for this work order's group
    const usersToNotify = await getUsersToNotify(supabase, workOrder.groups.id);
    
    if (usersToNotify.length === 0) {
      console.log("No users to notify for this work order's group");
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // Set up notification process
    // This would be replaced with actual email sending logic
    // using a service like Resend, SendGrid, or similar
    console.log(`Would send notifications to ${usersToNotify.length} users for work order ${workOrder.wo_number}`);
    console.log('Users to notify:', usersToNotify);
    console.log('Work order details:', workOrder);
    
    // For now, just log the notification details
    // In production, you would integrate with an email service here
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification would be sent to ${usersToNotify.length} users`,
        notifiedUsers: usersToNotify.map((u: any) => u.email),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing notification request:", error);
    
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
