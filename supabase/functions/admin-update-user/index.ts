
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Admin role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create a Supabase client to validate the authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Extract auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    // Verify the user is authenticated and get their ID
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if the caller is an admin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin permissions required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the request body
    const { userId, updates, updateType } = await req.json()

    if (!userId || !updateType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing admin update:', { userId, updateType, updates })

    let result = null
    let error = null

    // Handle different types of updates
    switch (updateType) {
      case 'profile':
        // Update the user's profile (name, email, role)
        const { data: profileData, error: updateProfileError } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()

        result = profileData
        error = updateProfileError
        break

      case 'password':
        // Update the user's password
        if (!updates.password) {
          return new Response(
            JSON.stringify({ error: 'Password is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: passwordData, error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: updates.password }
        )

        result = passwordData
        error = updatePasswordError
        break

      case 'email':
        // Update the user's email
        if (!updates.email) {
          return new Response(
            JSON.stringify({ error: 'Email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update auth email
        const { data: emailData, error: updateEmailError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { email: updates.email, email_confirm: true }
        )

        // If auth update succeeded, also update email in profiles table
        if (!updateEmailError) {
          await supabaseAdmin
            .from('profiles')
            .update({ email: updates.email })
            .eq('id', userId)
        }

        result = emailData
        error = updateEmailError
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid update type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (error) {
      console.error(`Error updating user (${updateType}):`, error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error in admin-update-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
