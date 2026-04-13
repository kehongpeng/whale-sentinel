import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createTimeoutFetch(timeoutMs = 3000) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  };
}

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        global: { fetch: createTimeoutFetch(3000) },
      })
    : ({} as ReturnType<typeof createClient>);

// Service-role client for server-only operations (API routes / cron)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin =
  supabaseUrl && (serviceRoleKey || supabaseKey)
    ? createClient(supabaseUrl, serviceRoleKey || supabaseKey!, {
        global: { fetch: createTimeoutFetch(3000) },
      })
    : ({} as ReturnType<typeof createClient>);
