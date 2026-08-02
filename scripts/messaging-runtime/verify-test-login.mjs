import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

async function loadEnv(file) {
  const text = await readFile(file, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function main() {
  const test = await loadEnv(".env.test.local");
  const current = await loadEnv(".env.local");
  const anon = createClient(test.NEXT_PUBLIC_SUPABASE_URL, test.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createClient(current.NEXT_PUBLIC_SUPABASE_URL ?? current.SUPABASE_URL, current.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = test.MARKTX_TEST_STORE_OWNER_B_EMAIL;
  const phone = test.MARKTX_TEST_STORE_OWNER_B_PHONE;
  const rawPhone = "511111112";
  const password = test.MARKTX_TEST_STORE_OWNER_B_PASSWORD;
  const userId = test.MARKTX_TEST_STORE_OWNER_B_USER_ID;

  const authUser = await service.auth.admin.getUserById(userId);
  const profile = await service.from("profiles").select("email, phone").eq("id", userId).maybeSingle();
  const memberships = await service.from("store_members").select("id, role, store_id").eq("user_id", userId);

  const phoneLogin = await anon.auth.signInWithPassword({ phone, password });
  await anon.auth.signOut();

  const normalizedResolver = await anon.rpc("resolve_auth_email_for_phone", { p_phone: phone });
  const rawResolver = await anon.rpc("resolve_auth_email_for_phone", { p_phone: rawPhone });

  const emailLogin = await anon.auth.signInWithPassword({ email, password });
  await anon.auth.signOut();

  console.log(
    JSON.stringify(
      {
        authUser: {
          email: authUser.data.user?.email ?? null,
          phone: authUser.data.user?.phone ?? null,
          phoneConfirmed: Boolean(authUser.data.user?.phone_confirmed_at),
        },
        profile: profile.data,
        memberships: memberships.data,
        phoneLogin: {
          ok: !phoneLogin.error,
          message: phoneLogin.error?.message ?? null,
        },
        normalizedResolver: {
          ok: !normalizedResolver.error,
          resolvedExpectedEmail: normalizedResolver.data === email,
          message: normalizedResolver.error?.message ?? null,
        },
        rawResolver: {
          ok: !rawResolver.error,
          resolvedExpectedEmail: rawResolver.data === email,
          message: rawResolver.error?.message ?? null,
        },
        emailPasswordLogin: {
          ok: !emailLogin.error,
          message: emailLogin.error?.message ?? null,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
