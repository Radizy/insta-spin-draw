import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compareSync, hashSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v2.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function getSupabaseClient() {
  const url = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function getJwtKey(): Promise<CryptoKey> {
  const secret = getEnv("JWT_SECRET");
  const enc = new TextEncoder().encode(secret);
  return await crypto.subtle.importKey(
    "raw",
    enc,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hashRefreshToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

function getUserAgent(req: Request): string | undefined {
  return req.headers.get("user-agent") ?? undefined;
}

async function generateTokens(user: any, req: Request, supabase: any) {
  const key = await getJwtKey();

  const header: Header = { alg: "HS256", typ: "JWT" };
  const exp = getNumericDate(60 * 15); // 15 minutos
  const payload: Payload = {
    sub: user.id,
    role: user.role,
    franquia_id: user.franquia_id ?? null,
    unidade_id: user.unidade_id ?? null,
    username: user.username,
    exp,
  };

  const accessToken = await create(header, payload, key);

  const refreshToken = crypto.randomUUID() + "-" + crypto.randomUUID();
  const refreshHash = await hashRefreshToken(refreshToken);

  const refreshExpires = new Date();
  refreshExpires.setDate(refreshExpires.getDate() + 30);

  const { error } = await supabase.from("auth_refresh_tokens").insert({
    user_id: user.id,
    token_hash: refreshHash,
    expires_at: refreshExpires.toISOString(),
    ip: getClientIp(req) ?? null,
    user_agent: getUserAgent(req) ?? null,
  });

  if (error) {
    console.error("Erro ao salvar refresh token:", error);
    throw error;
  }

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: exp,
  };
}

function mapEffectiveRole(rawRole: string, franquiaId: string | null): "super_admin" | "admin_franquia" | "operador" {
  if (rawRole === "admin") {
    return franquiaId ? "admin_franquia" : "super_admin";
  }
  return "operador";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return new Response(
        JSON.stringify({ error: "Credenciais inválidas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from("system_users")
      .select("id, username, role, password_hash, unidade, franquia_id, unidade_id")
      .eq("username", username.trim())
      .maybeSingle();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "Usuário ou senha incorretos" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const storedHash: string = data.password_hash;
    const plainPassword = password.trim();

    let passwordOk = false;
    let needsRehash = false;

    if (storedHash.startsWith("$2")) {
      // Use compareSync instead of compare to avoid Worker issue in Deno edge runtime
      passwordOk = compareSync(plainPassword, storedHash);
    } else {
      // Compatibilidade com senhas antigas em texto plano
      passwordOk = storedHash === plainPassword;
      if (passwordOk) needsRehash = true;
    }

    if (!passwordOk) {
      return new Response(
        JSON.stringify({ error: "Usuário ou senha incorretos" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (needsRehash) {
      try {
        // Use hashSync instead of hash to avoid Worker issue in Deno edge runtime
        const newHash = hashSync(plainPassword);
        await supabase
          .from("system_users")
          .update({ password_hash: newHash })
          .eq("id", data.id);
      } catch (rehashError) {
        console.error("Erro ao re-hash de senha legacy:", rehashError);
      }
    }

    const effectiveRole = mapEffectiveRole(data.role, data.franquia_id ?? null);

    const { accessToken, refreshToken, accessTokenExpiresAt } = await generateTokens(data, req, supabase);

    const userPayload = {
      id: data.id,
      username: data.username,
      role: effectiveRole,
      unidade: data.unidade,
      franquiaId: data.franquia_id ?? null,
      unidadeId: data.unidade_id ?? null,
    };

    // Buscar unidades disponíveis
    let availableUnits: Array<{ id: string; nome_loja: string; unidade_nome: string }> | undefined;

    // Mapeamento de nome de loja para código de unidade.
    // Usa o nome_loja normalizado como fallback universal para lojas novas.
    const mapNomeLojaToUnidade = (nome_loja: string, id: string): string => {
      const nome = nome_loja.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (nome.includes("itaqua")) return "ITAQUA";
      if (nome.includes("poa") || nome.includes("poá")) return "POA";
      if (nome.includes("suzano")) return "SUZANO";
      // Fallback: usa o nome da loja diretamente para exibição (UUID causava confusão)
      return nome_loja;
    };

    if (effectiveRole === "super_admin") {
      // Super Admin vê TODAS as unidades do sistema
      const { data: allUnits } = await supabase
        .from("unidades")
        .select("id, nome_loja")
        .order("nome_loja");

      if (allUnits && allUnits.length > 0) {
        availableUnits = allUnits.map((u: any) => ({
          id: u.id,
          nome_loja: u.nome_loja,
          unidade_nome: mapNomeLojaToUnidade(u.nome_loja, u.id),
        }));
      }
    } else if (data.franquia_id) {
      const { data: userUnits, error: unitsError } = await supabase
        .from("user_unidades")
        .select("unidade_id, unidades!inner(id, nome_loja)")
        .eq("user_id", data.id);

      if (!unitsError && userUnits && userUnits.length > 0) {
        availableUnits = userUnits.map((uu: any) => ({
          id: uu.unidades.id,
          nome_loja: uu.unidades.nome_loja,
          unidade_nome: mapNomeLojaToUnidade(uu.unidades.nome_loja, uu.unidades.id),
        }));
      }
    }

    const responseBody = {
      user: { ...userPayload, availableUnits },
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
      },
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro no auth-login:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno de autenticação", details: JSON.stringify(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
