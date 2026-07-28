// Edge Function: admin-user-photos
// Returns signed URLs for a user's tree photos (admin only)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify the caller is admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Check admin role
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { user_id } = await req.json()
    if (!user_id) return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Fetch trees with photos
    const { data: trees } = await supabase
      .from('trees')
      .select('id, custom_name, species_free_text, species_id, style, age_years, date_added')
      .eq('user_id', user_id)
      .order('date_added', { ascending: false })

    // Fetch photos for all trees
    const treeIds = (trees ?? []).map(t => t.id)
    const { data: photos } = await supabase
      .from('photos')
      .select('id, tree_id, storage_path, photo_date, is_cover')
      .in('tree_id', treeIds.length > 0 ? treeIds : ['none'])
      .order('photo_date', { ascending: false })

    // Generate signed URLs
    const photosWithUrls = await Promise.all(
      (photos ?? []).map(async (photo) => {
        const { data } = await supabase.storage
          .from('bonsai-photos')
          .createSignedUrl(photo.storage_path, 3600)
        return { ...photo, url: data?.signedUrl ?? null }
      })
    )

    // Fetch treatments summary
    const { data: treatments } = await supabase
      .from('treatment_logs')
      .select('id, tree_id, treatment_type, treatment_date, status, notes')
      .in('tree_id', treeIds.length > 0 ? treeIds : ['none'])
      .order('treatment_date', { ascending: false })
      .limit(50)

    return new Response(JSON.stringify({
      trees: trees ?? [],
      photos: photosWithUrls,
      treatments: treatments ?? [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
