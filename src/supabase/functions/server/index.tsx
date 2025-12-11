import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Helper to get supabase client
const getSupabase = () => createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);


// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-0c980ec2/health", (c) => {
  return c.json({ status: "ok" });
});

// Helper to sanitize error messages
const sanitizeError = (err: any) => {
  const msg = err.message || String(err);
  if (msg.includes("<!DOCTYPE html") || msg.includes("Cloudflare")) {
    return "Database service temporarily unavailable (Cloudflare Error)";
  }
  return msg;
};

// Load boats
app.get("/make-server-0c980ec2/load", async (c) => {
  try {
    const boats = await kv.get("dock-planner-boats");
    return c.json({ boats: boats || [] });
  } catch (error) {
    const message = sanitizeError(error);
    console.error("Error loading boats:", message);
    return c.json({ error: message }, 500);
  }
});

// Save boats
app.post("/make-server-0c980ec2/save", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
       return c.json({ error: 'Missing Authorization header' }, 401);
    }
    const token = authHeader.split(' ')[1];
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
       return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    if (!body.boats) {
      return c.json({ error: "Missing boats data" }, 400);
    }
    await kv.set("dock-planner-boats", body.boats);
    return c.json({ success: true });
  } catch (error) {
    const message = sanitizeError(error);
    console.error("Error saving boats:", message);
    return c.json({ error: message }, 500);
  }
});

Deno.serve(app.fetch);