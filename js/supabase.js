/* =========================================================
   FASAL SETU ADMIN
   Supabase Connection
========================================================= */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

export const SUPABASE_URL =
    "https://iyurbpfsvqzmdyaqinqi.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzIiwicmVmIjoiaXl1cmJwZnN2cXptZGF5YXFpbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjkyODUsImV4cCI6MjEwMjkwNTI4NX0.QiHk-cjLDETbK385RqW3R40A3ePpTn1B0XgN4FOJs2Q";


/* =========================================================
   SUPABASE CLIENT
========================================================= */

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
