import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Crypto helpers (Web Crypto API — built into Deno, no external deps) ──────

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Support legacy bcrypt hashes (starts with $2) — treat as invalid, force reset
  if (stored.startsWith('$2')) {
    return false;
  }
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
  const [, saltHex, expectedHash] = parts;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === expectedHash;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    if (action === "bootstrap_status") {
      const { count, error } = await supabase
        .from("system_users")
        .select("id", { count: "exact", head: true });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ hasUsers: (count || 0) > 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LOGIN ──────────────────────────────────────────────────────────────
    if (action === "login") {
      const { email, password } = payload;

      const { data: user, error } = await supabase
        .from("system_users")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("status", "Ativo")
        .maybeSingle();

      if (error || !user) {
        return new Response(JSON.stringify({ error: "E-mail ou senha incorretos." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return new Response(JSON.stringify({ error: "Conta bloqueada. Tente novamente mais tarde ou contate o administrador." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const valid = await verifyPassword(password, user.password_hash);

      if (!valid) {
        const newAttempts = (user.failed_attempts || 0) + 1;
        const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
        await supabase.from("system_users").update({
          failed_attempts: newAttempts,
          locked_until: lockUntil,
          updated_at: new Date().toISOString(),
        }).eq("id", user.id);

        const remaining = 5 - newAttempts;
        const msg = remaining <= 0
          ? "Conta bloqueada por 30 minutos após 5 tentativas."
          : `Senha incorreta. ${remaining} tentativa(s) restante(s).`;
        return new Response(JSON.stringify({ error: msg }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Success — reset attempts, update last_login
      await supabase.from("system_users").update({
        failed_attempts: 0,
        locked_until: null,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        user_name: user.name,
        action: "Login realizado com sucesso",
        module: "Autenticação",
        ip: req.headers.get("x-forwarded-for") || "0.0.0.0",
        type: "success",
      });

      return new Response(JSON.stringify({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          status: user.status,
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── CREATE USER ────────────────────────────────────────────────────────
    if (action === "create_user") {
      const { name, email, password, role, status } = payload;
      const hash = await hashPassword(password);
      const avatar = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

      const { data, error } = await supabase.from("system_users").insert({
        name,
        email: email.toLowerCase().trim(),
        password_hash: hash,
        role,
        avatar,
        status: status || "Ativo",
        failed_attempts: 0,
      }).select("id, name, email, role, avatar, status, created_at").maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UPDATE USER ────────────────────────────────────────────────────────
    if (action === "update_user") {
      const { id, name, email, role, status } = payload;
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name !== undefined) {
        updateData.name = name;
        updateData.avatar = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
      }
      if (email !== undefined) updateData.email = email.toLowerCase().trim();
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;

      const { data, error } = await supabase.from("system_users").update(updateData).eq("id", id)
        .select("id, name, email, role, avatar, status").maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CHANGE PASSWORD ────────────────────────────────────────────────────
    if (action === "change_password") {
      const { id, new_password, current_password, is_admin } = payload;

      if (!is_admin) {
        const { data: user } = await supabase.from("system_users").select("password_hash").eq("id", id).maybeSingle();
        if (!user) {
          return new Response(JSON.stringify({ error: "Usuário não encontrado." }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const valid = await verifyPassword(current_password, user.password_hash);
        if (!valid) {
          return new Response(JSON.stringify({ error: "Senha atual incorreta." }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const hash = await hashPassword(new_password);
      await supabase.from("system_users").update({
        password_hash: hash,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE USER ────────────────────────────────────────────────────────
    if (action === "delete_user") {
      const { id } = payload;
      await supabase.from("system_users").update({ status: "Inativo", updated_at: new Date().toISOString() }).eq("id", id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIST USERS ─────────────────────────────────────────────────────────
    if (action === "list_users") {
      const { data, error } = await supabase.from("system_users")
        .select("id, name, email, role, avatar, status, last_login, created_at")
        .order("created_at", { ascending: true });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ users: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SETUP ADMIN (first time) ───────────────────────────────────────────
    if (action === "setup_admin") {
      const { name, email, password } = payload;

      // Check if any user exists
      const { count } = await supabase.from("system_users").select("*", { count: "exact", head: true });
      if ((count || 0) > 0) {
        return new Response(JSON.stringify({ error: "Sistema já possui usuários cadastrados." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hash = await hashPassword(password);
      const avatar = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

      const { data, error } = await supabase.from("system_users").insert({
        name,
        email: email.toLowerCase().trim(),
        password_hash: hash,
        role: "Administrador",
        avatar,
        status: "Ativo",
        failed_attempts: 0,
      }).select("id, name, email, role, avatar, status").maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
