
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

// Function to send email notifications using Resend API
async function sendEmailNotification(recipient: { email: string, name: string }, workOrder: any) {
  try {
    // Use Resend API to send emails
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
    
    // Format dates for the email
    const workOrderDate = new Date(workOrder.date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const completeByDate = new Date(workOrder.complete_by).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // Create email content with workorder details
    const emailContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #2563eb; }
            .details { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .detail-row { display: flex; margin-bottom: 10px; }
            .detail-label { font-weight: bold; width: 150px; }
            .footer { margin-top: 30px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>New Work Order Notification</h1>
            <p>Hello ${recipient.name},</p>
            <p>A new work order has been assigned to your department:</p>
            
            <div class="details">
              <div class="detail-row">
                <div class="detail-label">Work Order #:</div>
                <div>${workOrder.wo_number}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Item:</div>
                <div>${workOrder.item}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Description:</div>
                <div>${workOrder.description || 'No description provided'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Location:</div>
                <div>${workOrder.locations ? workOrder.locations.name : 'Unknown'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Requested By:</div>
                <div>${workOrder.requested_by}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Date Created:</div>
                <div>${workOrderDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Complete By:</div>
                <div>${completeByDate}</div>
              </div>
            </div>
            
            <p>Please review this work order at your earliest convenience.</p>
            
            <div class="footer">
              <p>This is an automated notification from the Work Order Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Use the Resend API to send the email
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "Work Orders <notifications@workorders.com>",
        to: [recipient.email],
        subject: `New Work Order #${workOrder.wo_number}: ${workOrder.item}`,
        html: emailContent,
      })
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error(`Resend API error: ${res.status}`, data);
      return { success: false, email: recipient.email, error: data.message || "Failed to send email" };
    }
    
    return { success: true, email: recipient.email, id: data.id };
  } catch (error) {
    console.error(`Failed to send email to ${recipient.email}:`, error);
    return { success: false, email: recipient.email, error: error.message };
  }
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
    
    console.log(`Sending notifications to ${usersToNotify.length} users for work order ${workOrder.wo_number}`);
    console.log('Work order details:', workOrder);
    
    // Send email notifications to each user
    const emailResults = await Promise.all(
      usersToNotify.map(user => sendEmailNotification(user, workOrder))
    );
    
    // Count successful and failed emails
    const successful = emailResults.filter(result => result.success).length;
    const failed = emailResults.filter(result => !result.success).length;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent to ${successful} users (${failed} failed)`,
        details: emailResults,
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
