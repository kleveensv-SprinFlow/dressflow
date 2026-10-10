import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server configuration unavailable" }), { status: 500, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });
  }

  for (const bucket of ["clothes-images", "avatars"]) {
    let offset = 0;
    while (true) {
      const { data: files, error: listError } = await admin.storage.from(bucket).list(user.id, { limit: 1000, offset });
      if (listError) {
        return new Response(JSON.stringify({ error: "Could not clean private files" }), { status: 500, headers: corsHeaders });
      }
      const paths = (files || []).filter((file) => file.id || file.metadata).map((file) => user.id + "/" + file.name);
      if (paths.length) {
        const { error: removeError } = await admin.storage.from(bucket).remove(paths);
        if (removeError) {
          return new Response(JSON.stringify({ error: "Could not remove private files" }), { status: 500, headers: corsHeaders });
        }
      }
      if (!files || files.length < 1000) break;
      offset += files.length;
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: "Could not delete account" }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
});
