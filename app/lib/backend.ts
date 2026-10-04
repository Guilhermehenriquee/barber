import { env } from "cloudflare:workers";

export type UserRole = "owner" | "admin" | "barber" | "reception" | "client";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_service"
  | "completed"
  | "no_show"
  | "cancelled";

export type SessionUser = {
  id: string;
  barberShopId: string;
  barberShopSlug: string;
  barberShopName: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
};

export type BarberShop = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  theme_json: string;
};

export type Service = {
  id: string;
  barber_shop_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  price_cents: number;
  active: number;
};

export type Professional = {
  id: string;
  barber_shop_id: string;
  user_id: string | null;
  name: string;
  public_name: string;
  color: string;
  active: number;
};

export type Client = {
  id: string;
  barber_shop_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  preferences: string | null;
  active: number;
};

export type Appointment = {
  id: string;
  barber_shop_id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  source: "client" | "admin" | "walk_in";
  client_name: string;
  client_phone: string;
  professional_name: string;
  service_name: string;
  duration_minutes: number;
  price_cents: number;
};

export type WorkingHour = {
  id: string;
  barber_shop_id: string;
  professional_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  active: number;
};

export type AvailabilitySlot = {
  professionalId: string;
  professionalName: string;
  startsAt: string;
  endsAt: string;
  label: string;
};

export type TwoFactorChallenge = {
  challengeId: string;
  expiresAt: string;
  channel: "email";
  deliveryTarget: string;
  devCode: string;
};

export type PendingAuth = {
  requiresTwoFactor: true;
  challenge: TwoFactorChallenge;
};

const SESSION_COOKIE = "rosa_session_v2";
const SAO_PAULO_OFFSET = "-03:00";
const encoder = new TextEncoder();

export function getDb(): D1Database {
  const db = (env as { DB?: D1Database }).DB;
  if (!db) {
    throw new Error("Banco D1 indisponivel. Configure o binding DB antes de usar dados reais.");
  }
  return db;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function canManageAgenda(role: UserRole) {
  return role === "owner" || role === "admin" || role === "reception" || role === "barber";
}

export function canManageCatalog(role: UserRole) {
  return role === "owner" || role === "admin";
}

async function ensureAuthSchema(db: D1Database) {
  await runBestEffort(db, "alter table users add column two_factor_enabled integer not null default 1");
  await runBestEffort(db, "alter table users add column two_factor_channel text not null default 'email'");
  await runBestEffort(db, "alter table users add column google_sub text");
  await db
    .prepare(
      `create table if not exists auth_challenges (
        id text primary key,
        barber_shop_id text not null,
        user_id text not null,
        purpose text not null,
        code_hash text not null,
        expires_at text not null,
        consumed_at text,
        created_at text not null default CURRENT_TIMESTAMP
      )`,
    )
    .run();
  await runBestEffort(db, "create index if not exists idx_auth_challenges_user on auth_challenges (user_id)");
  await runBestEffort(db, "create index if not exists idx_auth_challenges_expires on auth_challenges (expires_at)");
}

async function runBestEffort(db: D1Database, statement: string) {
  try {
    await db.prepare(statement).run();
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (!message.includes("duplicate column") && !message.includes("already exists") && !message.includes("no such table")) {
      throw error;
    }
  }
}

export async function ensureSeedData() {
  const db = getDb();
  await ensureAuthSchema(db);
  const existing = await db
    .prepare("select id from barber_shops where slug = ? limit 1")
    .bind("rosa-do-corte")
    .first<{ id: string }>();

  if (!existing) {
    await seedInitialWorkspace(db);
  }

  await seedTodayAppointments(db);
}

async function seedInitialWorkspace(db: D1Database) {
  const shopId = "shop_rosa";
  const adminSalt = "rosa-admin-salt";
  const barberSalt = "rosa-barbeiro-salt";
  const receptionSalt = "rosa-recepcao-salt";
  const clientSalt = "rosa-cliente-salt";

  await db.batch([
    db
      .prepare(
        `insert into barber_shops (id, slug, name, phone, address, timezone, theme_json, active)
         values (?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind(
        shopId,
        "rosa-do-corte",
        "Rosa do Corte",
        "(11) 98888-2211",
        "Rua da Navalha, 108 - Sao Paulo",
        "America/Sao_Paulo",
        JSON.stringify({
          ink: "#111111",
          panel: "#191817",
          wine: "#8f2638",
          red: "#d7353d",
          blue: "#2b85c7",
          gold: "#d7a94a",
        }),
      ),
    db
      .prepare(
        `insert into barber_shops (id, slug, name, phone, address, timezone, theme_json, active)
         values (?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind(
        "shop_modelo",
        "barbearia-modelo",
        "Barbearia Modelo",
        "(11) 97777-1000",
        "Avenida Exemplo, 200",
        "America/Sao_Paulo",
        JSON.stringify({
          ink: "#101216",
          panel: "#20242a",
          wine: "#315b7c",
          red: "#c4473f",
          blue: "#376d94",
          gold: "#d6b15d",
        }),
      ),
  ]);

  const adminHash = await hashPassword("rosa-admin", adminSalt);
  const barberHash = await hashPassword("rosa-barbeiro", barberSalt);
  const receptionHash = await hashPassword("rosa-recepcao", receptionSalt);
  const clientHash = await hashPassword("rosa-cliente", clientSalt);

  await db.batch([
    db
      .prepare(
        `insert into users (id, barber_shop_id, name, email, phone, role, password_salt, password_hash, active)
         values (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("user_admin_rosa", shopId, "Dono Rosa", "admin@rosadocorte.com.br", "(11) 98888-2211", "owner", adminSalt, adminHash),
    db
      .prepare(
        `insert into users (id, barber_shop_id, name, email, phone, role, password_salt, password_hash, active)
         values (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("user_barber_rosa", shopId, "Rosa", "rosa@rosadocorte.com.br", "(11) 94444-1000", "barber", barberSalt, barberHash),
    db
      .prepare(
        `insert into users (id, barber_shop_id, name, email, phone, role, password_salt, password_hash, active)
         values (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("user_reception_rosa", shopId, "Recepcao", "recepcao@rosadocorte.com.br", "(11) 93333-1000", "reception", receptionSalt, receptionHash),
    db
      .prepare(
        `insert into users (id, barber_shop_id, name, email, phone, role, password_salt, password_hash, active)
         values (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("user_client_marcos", shopId, "Marcos Vinicius", "cliente@rosadocorte.com.br", "(11) 98888-4411", "client", clientSalt, clientHash),
  ]);

  await db.batch([
    db
      .prepare(
        `insert into professionals (id, barber_shop_id, user_id, name, public_name, color, active)
         values (?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("pro_rosa", shopId, "user_barber_rosa", "Rosa", "Rosa", "#d7353d"),
    db
      .prepare(
        `insert into professionals (id, barber_shop_id, user_id, name, public_name, color, active)
         values (?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("pro_rafa", shopId, null, "Rafa", "Rafa", "#2b85c7"),
    db
      .prepare(
        `insert into professionals (id, barber_shop_id, user_id, name, public_name, color, active)
         values (?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("pro_ph", shopId, null, "PH", "PH", "#d7a94a"),
    db
      .prepare(
        `insert into clients (id, barber_shop_id, user_id, name, phone, email, notes, preferences, active)
         values (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind(
        "client_marcos",
        shopId,
        "user_client_marcos",
        "Marcos Vinicius",
        "(11) 98888-4411",
        "cliente@rosadocorte.com.br",
        "Gosta de horario no fim da tarde.",
        "Degrade baixo, topo texturizado",
      ),
    db
      .prepare(
        `insert into clients (id, barber_shop_id, name, phone, email, notes, preferences, active)
         values (?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("client_daniel", shopId, "Daniel Souza", "(11) 97777-6622", "daniel@email.com", "Prefere Rafa.", "Barba desenhada"),
    db
      .prepare(
        `insert into clients (id, barber_shop_id, name, phone, email, notes, preferences, active)
         values (?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("client_igor", shopId, "Igor Martins", "(11) 96666-1188", "igor@email.com", "Cliente de encaixe.", "Combo completo"),
  ]);

  await db.batch([
    db
      .prepare(
        `insert into services (id, barber_shop_id, name, description, duration_minutes, buffer_minutes, price_cents, active)
         values (?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("svc_corte", shopId, "Corte degrade", "Corte masculino com acabamento", 45, 10, 5500),
    db
      .prepare(
        `insert into services (id, barber_shop_id, name, description, duration_minutes, buffer_minutes, price_cents, active)
         values (?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("svc_barba", shopId, "Barba premium", "Toalha quente, navalha e balm", 35, 10, 3900),
    db
      .prepare(
        `insert into services (id, barber_shop_id, name, description, duration_minutes, buffer_minutes, price_cents, active)
         values (?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind("svc_combo", shopId, "Combo corte + barba", "Corte completo com barba premium", 75, 10, 8900),
  ]);

  const hourStatements = [];
  for (const professionalId of ["pro_rosa", "pro_rafa", "pro_ph"]) {
    for (const weekday of [1, 2, 3, 4, 5, 6]) {
      hourStatements.push(
        db
          .prepare(
            `insert into working_hours (id, barber_shop_id, professional_id, weekday, start_time, end_time, break_start, break_end, active)
             values (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          )
          .bind(`wh_${professionalId}_${weekday}`, shopId, professionalId, weekday, "09:00", "19:00", "12:00", "13:00"),
      );
    }
  }
  await db.batch(hourStatements);
}

async function seedTodayAppointments(db: D1Database) {
  const today = todayInSaoPaulo();
  const marker = await db
    .prepare("select id from appointments where barber_shop_id = ? and starts_at >= ? and starts_at < ? limit 1")
    .bind("shop_rosa", localDateTimeToUtcIso(today, "00:00"), addDaysUtcIso(today, 1))
    .first<{ id: string }>();

  if (marker) return;

  await db.batch([
    appointmentSeedStatement(db, "appt_today_0900", "client_marcos", "pro_rosa", "svc_corte", today, "09:00", 45, "confirmed", "admin"),
    appointmentSeedStatement(db, "appt_today_1020", "client_daniel", "pro_rafa", "svc_barba", today, "10:20", 35, "in_service", "walk_in"),
    appointmentSeedStatement(db, "appt_today_1610", "client_igor", "pro_ph", "svc_combo", today, "16:10", 75, "scheduled", "client"),
  ]);
}

function appointmentSeedStatement(
  db: D1Database,
  id: string,
  clientId: string,
  professionalId: string,
  serviceId: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  status: AppointmentStatus,
  source: "client" | "admin" | "walk_in",
) {
  const startsAt = localDateTimeToUtcIso(date, startTime);
  const endsAt = addMinutesIso(startsAt, durationMinutes);
  return db
    .prepare(
      `insert into appointments
       (id, barber_shop_id, client_id, professional_id, service_id, starts_at, ends_at, status, notes, source, created_by_user_id)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, "shop_rosa", clientId, professionalId, serviceId, startsAt, endsAt, status, null, source, "user_admin_rosa");
}

export async function loginWithPassword(slug: string, email: string, password: string): Promise<PendingAuth> {
  await ensureSeedData();
  const normalizedEmail = email.trim().toLowerCase();
  const shop = await findShopBySlug(slug);
  if (!shop) throw new Error("Barbearia nao encontrada.");

  const user = await getDb()
    .prepare(
      `select u.id, u.barber_shop_id, u.name, u.email, u.phone, u.role, u.password_salt, u.password_hash,
              b.slug as barber_shop_slug, b.name as barber_shop_name
       from users u
       join barber_shops b on b.id = u.barber_shop_id
       where b.slug = ? and lower(u.email) = ? and u.active = 1
       limit 1`,
    )
    .bind(shop.slug, normalizedEmail)
    .first<
      SessionUser & {
        password_salt: string;
        password_hash: string;
        barber_shop_id: string;
        barber_shop_slug: string;
        barber_shop_name: string;
      }
    >();

  if (!user) throw new Error("E-mail ou senha invalidos.");
  const attemptedHash = await hashPassword(password, user.password_salt);
  if (!timingSafeEqual(attemptedHash, user.password_hash)) {
    throw new Error("E-mail ou senha invalidos.");
  }

  return {
    requiresTwoFactor: true,
    challenge: await createTwoFactorChallenge(user.id, user.barber_shop_id, user.email, "login"),
  };
}

export async function registerClientAccount(payload: {
  slug: string;
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<PendingAuth> {
  await ensureSeedData();
  const shop = await findShopBySlug(payload.slug);
  if (!shop) throw new Error("Barbearia nao encontrada.");

  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const phone = payload.phone.trim();
  const password = payload.password.trim();

  if (!name || !email || !phone || !password) {
    throw new Error("Informe nome, e-mail, WhatsApp e senha.");
  }
  if (password.length < 8) {
    throw new Error("Use uma senha com pelo menos 8 caracteres.");
  }

  const existing = await getDb()
    .prepare("select id from users where barber_shop_id = ? and lower(email) = ? limit 1")
    .bind(shop.id, email)
    .first<{ id: string }>();
  if (existing) {
    throw new Error("Ja existe uma conta com este e-mail nesta barbearia.");
  }

  const userId = createId("user");
  const clientId = createId("client");
  const salt = createToken();
  const passwordHash = await hashPassword(password, salt);

  await getDb().batch([
    getDb()
      .prepare(
        `insert into users
         (id, barber_shop_id, name, email, phone, role, password_salt, password_hash, active, two_factor_enabled, two_factor_channel)
         values (?, ?, ?, ?, ?, 'client', ?, ?, 1, 1, 'email')`,
      )
      .bind(userId, shop.id, name, email, phone, salt, passwordHash),
    getDb()
      .prepare(
        `insert into clients (id, barber_shop_id, user_id, name, phone, email, notes, preferences, active)
         values (?, ?, ?, ?, ?, ?, ?, null, 1)`,
      )
      .bind(clientId, shop.id, userId, name, phone, email, "Criado pelo cadastro do cliente."),
  ]);

  return {
    requiresTwoFactor: true,
    challenge: await createTwoFactorChallenge(userId, shop.id, email, "register"),
  };
}

export async function verifyTwoFactorChallenge(challengeId: string, code: string, requestUrl: string) {
  await ensureSeedData();
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error("Informe o codigo de 6 digitos.");
  }

  const row = await getDb()
    .prepare(
      `select c.id, c.user_id, c.code_hash, c.expires_at, c.consumed_at,
              u.id as id, u.barber_shop_id, u.name, u.email, u.phone, u.role,
              b.slug as barber_shop_slug, b.name as barber_shop_name
       from auth_challenges c
       join users u on u.id = c.user_id
       join barber_shops b on b.id = u.barber_shop_id
       where c.id = ? and u.active = 1 and b.active = 1
       limit 1`,
    )
    .bind(challengeId)
    .first<
      SessionUser & {
        code_hash: string;
        expires_at: string;
        consumed_at: string | null;
        user_id: string;
        barber_shop_id: string;
        barber_shop_slug: string;
        barber_shop_name: string;
      }
    >();

  if (!row) throw new Error("Verificacao nao encontrada.");
  if (row.consumed_at) throw new Error("Este codigo ja foi usado.");
  if (Date.parse(row.expires_at) <= Date.now()) throw new Error("Codigo expirado. Entre novamente.");

  const attemptedHash = await sha256Hex(`${challengeId}:${normalizedCode}`);
  if (!timingSafeEqual(attemptedHash, row.code_hash)) {
    throw new Error("Codigo 2FA invalido.");
  }

  await getDb()
    .prepare("update auth_challenges set consumed_at = ? where id = ?")
    .bind(new Date().toISOString(), challengeId)
    .run();

  const session = await issueSession(row.user_id, requestUrl);
  return session;
}

export function getGoogleAuthStart(slug: string, mode: "login" | "register", requestUrl: string) {
  const googleEnv = env as { GOOGLE_CLIENT_ID?: string; GOOGLE_REDIRECT_URI?: string };
  const clientId = googleEnv.GOOGLE_CLIENT_ID;
  const redirectUri = googleEnv.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return {
      configured: false as const,
      message:
        "Login com Google preparado. Configure GOOGLE_CLIENT_ID e GOOGLE_REDIRECT_URI no ambiente para ativar o OAuth real.",
    };
  }

  const state = base64UrlString(
    JSON.stringify({
      slug,
      mode,
      next: new URL(requestUrl).origin,
      nonce: createToken().slice(0, 18),
    }),
  );
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state,
  });

  return {
    configured: true as const,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}

export async function logout(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    await getDb()
      .prepare("delete from auth_sessions where token_hash = ?")
      .bind(await sha256Hex(token))
      .run();
  }
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  await ensureSeedData();
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const user = await getDb()
    .prepare(
      `select u.id, u.barber_shop_id, u.name, u.email, u.phone, u.role,
              b.slug as barber_shop_slug, b.name as barber_shop_name
       from auth_sessions s
       join users u on u.id = s.user_id
       join barber_shops b on b.id = u.barber_shop_id
       where s.token_hash = ? and s.expires_at > ? and u.active = 1 and b.active = 1
       limit 1`,
    )
    .bind(await sha256Hex(token), new Date().toISOString())
    .first<SessionUser & { barber_shop_id: string; barber_shop_slug: string; barber_shop_name: string }>();

  return user ? normalizeSessionUser(user) : null;
}

export async function getWorkspace(slug: string, user: SessionUser | null, date: string) {
  await ensureSeedData();
  const shop = await findShopBySlug(slug);
  if (!shop) throw new Error("Barbearia nao encontrada.");

  const services = await listServices(shop.id);
  const professionals = await listProfessionals(shop.id);

  if (!user) {
    return {
      shop: serializeShop(shop),
      user: null,
      services,
      professionals,
      clients: [],
      appointments: [],
      workingHours: [],
      metrics: null,
    };
  }

  assertSameShop(user, shop.slug);
  const appointments = await listAppointmentsForUser(user, date);
  const clients = canManageAgenda(user.role) ? await listClients(shop.id) : await listClientsForUser(user);
  const workingHours = canManageCatalog(user.role) ? await listWorkingHours(shop.id) : [];
  const metrics = canManageAgenda(user.role) ? await loadMetrics(shop.id, date) : null;

  return {
    shop: serializeShop(shop),
    user,
    services,
    professionals,
    clients,
    appointments,
    workingHours,
    metrics,
  };
}

export async function listAvailability(slug: string, serviceId: string, professionalId: string, date: string) {
  await ensureSeedData();
  const shop = await findShopBySlug(slug);
  if (!shop) throw new Error("Barbearia nao encontrada.");
  const service = await findService(shop.id, serviceId);
  if (!service) throw new Error("Servico nao encontrado.");
  const professionals =
    professionalId === "any"
      ? await listProfessionals(shop.id)
      : (await listProfessionals(shop.id)).filter((professional) => professional.id === professionalId);

  const slots: AvailabilitySlot[] = [];
  for (const professional of professionals) {
    slots.push(...(await buildProfessionalSlots(shop.id, professional, service, date)));
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 36);
}

export async function createAppointment(
  user: SessionUser,
  payload: {
    slug: string;
    startsAt: string;
    serviceId: string;
    professionalId: string;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    notes?: string;
  },
) {
  const shop = await findShopBySlug(payload.slug);
  if (!shop) throw new Error("Barbearia nao encontrada.");
  assertSameShop(user, shop.slug);

  const service = await findService(shop.id, payload.serviceId);
  const professional = await findProfessional(shop.id, payload.professionalId);
  if (!service || !professional) throw new Error("Servico ou profissional invalido.");

  const startsAt = payload.startsAt;
  const endsAt = addMinutesIso(startsAt, service.duration_minutes);

  let clientId = payload.clientId ?? "";
  if (user.role === "client") {
    const client = await findClientByUser(shop.id, user.id);
    if (!client) throw new Error("Perfil de cliente nao encontrado.");
    clientId = client.id;
  } else if (!clientId) {
    if (!payload.clientName?.trim() || !payload.clientPhone?.trim()) {
      throw new Error("Informe cliente ou nome e WhatsApp para o encaixe.");
    }
    clientId = createId("client");
    await getDb()
      .prepare(
        `insert into clients (id, barber_shop_id, name, phone, email, notes, preferences, active)
         values (?, ?, ?, ?, null, ?, null, 1)`,
      )
      .bind(clientId, shop.id, payload.clientName.trim(), payload.clientPhone.trim(), "Criado no agendamento.")
      .run();
  }

  if (!canManageAgenda(user.role) && user.role !== "client") {
    throw new Error("Seu perfil nao pode criar agendamentos.");
  }

  if (user.role === "barber") {
    const ownProfessional = await findProfessionalByUser(shop.id, user.id);
    if (ownProfessional && ownProfessional.id !== professional.id) {
      throw new Error("Barbeiro so agenda na propria cadeira.");
    }
  }

  const available = await isSlotAvailable(shop.id, professional.id, startsAt, endsAt, null);
  if (!available) throw new Error("Horario indisponivel. Escolha outro slot.");

  const appointmentId = createId("appt");
  try {
    await getDb()
      .prepare(
        `insert into appointments
         (id, barber_shop_id, client_id, professional_id, service_id, starts_at, ends_at, status, notes, source, created_by_user_id)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        appointmentId,
        shop.id,
        clientId,
        professional.id,
        service.id,
        startsAt,
        endsAt,
        "scheduled",
        payload.notes?.trim() || null,
        user.role === "client" ? "client" : "admin",
        user.id,
      )
      .run();
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw new Error("Outro cliente pegou esse horario agora. Atualize a agenda.");
    }
    throw error;
  }

  return appointmentId;
}

export async function updateAppointmentStatus(user: SessionUser, id: string, status: AppointmentStatus) {
  const allowed: AppointmentStatus[] = ["scheduled", "confirmed", "in_service", "completed", "no_show", "cancelled"];
  if (!allowed.includes(status)) throw new Error("Status invalido.");

  const appointment = await getDb()
    .prepare("select id, barber_shop_id, client_id, professional_id from appointments where id = ? limit 1")
    .bind(id)
    .first<{ id: string; barber_shop_id: string; client_id: string; professional_id: string }>();

  if (!appointment || appointment.barber_shop_id !== user.barberShopId) {
    throw new Error("Agendamento nao encontrado.");
  }

  if (user.role === "client") {
    const client = await findClientByUser(user.barberShopId, user.id);
    if (!client || client.id !== appointment.client_id || status !== "cancelled") {
      throw new Error("Cliente so pode cancelar o proprio horario.");
    }
  } else if (!canManageAgenda(user.role)) {
    throw new Error("Seu perfil nao pode alterar status.");
  }

  await getDb()
    .prepare("update appointments set status = ?, updated_at = CURRENT_TIMESTAMP where id = ?")
    .bind(status, id)
    .run();

  return id;
}

export async function createClient(user: SessionUser, payload: { name: string; phone: string; email?: string; preferences?: string }) {
  if (!canManageAgenda(user.role)) throw new Error("Seu perfil nao pode cadastrar clientes.");
  const id = createId("client");
  await getDb()
    .prepare(
      `insert into clients (id, barber_shop_id, name, phone, email, preferences, notes, active)
       values (?, ?, ?, ?, ?, ?, null, 1)`,
    )
    .bind(id, user.barberShopId, payload.name.trim(), payload.phone.trim(), payload.email?.trim() || null, payload.preferences?.trim() || null)
    .run();
  return id;
}

export async function createService(
  user: SessionUser,
  payload: { name: string; description?: string; durationMinutes: number; bufferMinutes: number; priceCents: number },
) {
  if (!canManageCatalog(user.role)) throw new Error("Seu perfil nao pode cadastrar servicos.");
  const id = createId("svc");
  await getDb()
    .prepare(
      `insert into services (id, barber_shop_id, name, description, duration_minutes, buffer_minutes, price_cents, active)
       values (?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    .bind(
      id,
      user.barberShopId,
      payload.name.trim(),
      payload.description?.trim() || null,
      payload.durationMinutes,
      payload.bufferMinutes,
      payload.priceCents,
    )
    .run();
  return id;
}

export async function createProfessional(user: SessionUser, payload: { name: string; publicName: string; color?: string }) {
  if (!canManageCatalog(user.role)) throw new Error("Seu perfil nao pode cadastrar profissionais.");
  const id = createId("pro");
  await getDb()
    .prepare(
      `insert into professionals (id, barber_shop_id, user_id, name, public_name, color, active)
       values (?, ?, null, ?, ?, ?, 1)`,
    )
    .bind(id, user.barberShopId, payload.name.trim(), payload.publicName.trim(), payload.color || "#8f2638")
    .run();
  return id;
}

export async function createWorkingHour(
  user: SessionUser,
  payload: {
    professionalId: string;
    weekday: number;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
  },
) {
  if (!canManageCatalog(user.role)) throw new Error("Seu perfil nao pode cadastrar horarios.");
  const professional = await findProfessional(user.barberShopId, payload.professionalId);
  if (!professional) throw new Error("Profissional invalido.");
  const id = createId("wh");
  await getDb()
    .prepare(
      `insert into working_hours (id, barber_shop_id, professional_id, weekday, start_time, end_time, break_start, break_end, active)
       values (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    .bind(
      id,
      user.barberShopId,
      professional.id,
      payload.weekday,
      payload.startTime,
      payload.endTime,
      payload.breakStart || null,
      payload.breakEnd || null,
    )
    .run();
  return id;
}

async function findShopBySlug(slug: string) {
  return getDb()
    .prepare("select * from barber_shops where slug = ? and active = 1 limit 1")
    .bind(slug.trim())
    .first<BarberShop>();
}

async function listServices(shopId: string) {
  const result = await getDb()
    .prepare("select * from services where barber_shop_id = ? and active = 1 order by name")
    .bind(shopId)
    .all<Service>();
  return result.results ?? [];
}

async function listProfessionals(shopId: string) {
  const result = await getDb()
    .prepare("select * from professionals where barber_shop_id = ? and active = 1 order by public_name")
    .bind(shopId)
    .all<Professional>();
  return result.results ?? [];
}

async function listClients(shopId: string) {
  const result = await getDb()
    .prepare("select * from clients where barber_shop_id = ? and active = 1 order by name")
    .bind(shopId)
    .all<Client>();
  return result.results ?? [];
}

async function listClientsForUser(user: SessionUser) {
  const result = await getDb()
    .prepare("select * from clients where barber_shop_id = ? and user_id = ? and active = 1 order by name")
    .bind(user.barberShopId, user.id)
    .all<Client>();
  return result.results ?? [];
}

async function listWorkingHours(shopId: string) {
  const result = await getDb()
    .prepare("select * from working_hours where barber_shop_id = ? and active = 1 order by professional_id, weekday, start_time")
    .bind(shopId)
    .all<WorkingHour>();
  return result.results ?? [];
}

async function findService(shopId: string, id: string) {
  return getDb()
    .prepare("select * from services where barber_shop_id = ? and id = ? and active = 1 limit 1")
    .bind(shopId, id)
    .first<Service>();
}

async function findProfessional(shopId: string, id: string) {
  return getDb()
    .prepare("select * from professionals where barber_shop_id = ? and id = ? and active = 1 limit 1")
    .bind(shopId, id)
    .first<Professional>();
}

async function findProfessionalByUser(shopId: string, userId: string) {
  return getDb()
    .prepare("select * from professionals where barber_shop_id = ? and user_id = ? and active = 1 limit 1")
    .bind(shopId, userId)
    .first<Professional>();
}

async function findClientByUser(shopId: string, userId: string) {
  return getDb()
    .prepare("select * from clients where barber_shop_id = ? and user_id = ? and active = 1 limit 1")
    .bind(shopId, userId)
    .first<Client>();
}

async function listAppointmentsForUser(user: SessionUser, date: string) {
  const start = localDateTimeToUtcIso(date, "00:00");
  const end = addDaysUtcIso(date, 1);
  let query = appointmentsBaseQuery() + " where a.barber_shop_id = ? and a.starts_at >= ? and a.starts_at < ?";
  const values: Array<string | number> = [user.barberShopId, start, end];

  if (user.role === "client") {
    const client = await findClientByUser(user.barberShopId, user.id);
    query += " and a.client_id = ?";
    values.push(client?.id ?? "__none__");
  }

  if (user.role === "barber") {
    const professional = await findProfessionalByUser(user.barberShopId, user.id);
    query += " and a.professional_id = ?";
    values.push(professional?.id ?? "__none__");
  }

  query += " order by a.starts_at asc";
  const result = await getDb().prepare(query).bind(...values).all<Appointment>();
  return result.results ?? [];
}

async function loadMetrics(shopId: string, date: string) {
  const start = localDateTimeToUtcIso(date, "00:00");
  const end = addDaysUtcIso(date, 1);
  const [clientsCount, servicesCount, professionalsCount, todayCount, completedCount, noShowCount] = await Promise.all([
    countWhere("clients", "barber_shop_id = ? and active = 1", [shopId]),
    countWhere("services", "barber_shop_id = ? and active = 1", [shopId]),
    countWhere("professionals", "barber_shop_id = ? and active = 1", [shopId]),
    countWhere("appointments", "barber_shop_id = ? and starts_at >= ? and starts_at < ? and status != 'cancelled'", [shopId, start, end]),
    countWhere("appointments", "barber_shop_id = ? and starts_at >= ? and starts_at < ? and status = 'completed'", [shopId, start, end]),
    countWhere("appointments", "barber_shop_id = ? and starts_at >= ? and starts_at < ? and status = 'no_show'", [shopId, start, end]),
  ]);

  return {
    clientsCount,
    servicesCount,
    professionalsCount,
    todayCount,
    completedCount,
    noShowCount,
  };
}

async function countWhere(table: string, where: string, values: Array<string | number>) {
  const row = await getDb()
    .prepare(`select count(*) as total from ${table} where ${where}`)
    .bind(...values)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

async function buildProfessionalSlots(shopId: string, professional: Professional, service: Service, date: string) {
  const weekday = weekdayInSaoPaulo(date);
  const workingHours = await getDb()
    .prepare(
      "select * from working_hours where barber_shop_id = ? and professional_id = ? and weekday = ? and active = 1 order by start_time",
    )
    .bind(shopId, professional.id, weekday)
    .all<WorkingHour>();

  const busy = await getBusyRanges(shopId, professional.id, date);
  const slots: AvailabilitySlot[] = [];
  const now = Date.now();

  for (const window of workingHours.results ?? []) {
    let cursor = minutesFromTime(window.start_time);
    const endMinute = minutesFromTime(window.end_time);
    const step = Math.max(15, service.duration_minutes + service.buffer_minutes);

    while (cursor + service.duration_minutes <= endMinute) {
      const slotStartTime = timeFromMinutes(cursor);
      const slotStartIso = localDateTimeToUtcIso(date, slotStartTime);
      const slotEndIso = addMinutesIso(slotStartIso, service.duration_minutes);
      const crossesBreak =
        window.break_start &&
        window.break_end &&
        rangesOverlap(cursor, cursor + service.duration_minutes, minutesFromTime(window.break_start), minutesFromTime(window.break_end));

      if (!crossesBreak && Date.parse(slotStartIso) > now && !busy.some((range) => isoRangesOverlap(slotStartIso, slotEndIso, range.startsAt, range.endsAt))) {
        slots.push({
          professionalId: professional.id,
          professionalName: professional.public_name,
          startsAt: slotStartIso,
          endsAt: slotEndIso,
          label: slotStartTime,
        });
      }

      cursor += step;
    }
  }

  return slots;
}

async function getBusyRanges(shopId: string, professionalId: string, date: string) {
  const start = localDateTimeToUtcIso(date, "00:00");
  const end = addDaysUtcIso(date, 1);
  const appointments = await getDb()
    .prepare(
      `select starts_at as startsAt, ends_at as endsAt
       from appointments
       where barber_shop_id = ? and professional_id = ? and starts_at >= ? and starts_at < ?
         and status in ('scheduled', 'confirmed', 'in_service')`,
    )
    .bind(shopId, professionalId, start, end)
    .all<{ startsAt: string; endsAt: string }>();
  const blocks = await getDb()
    .prepare(
      `select starts_at as startsAt, ends_at as endsAt
       from time_blocks
       where barber_shop_id = ? and professional_id = ? and starts_at >= ? and starts_at < ?`,
    )
    .bind(shopId, professionalId, start, end)
    .all<{ startsAt: string; endsAt: string }>();
  return [...(appointments.results ?? []), ...(blocks.results ?? [])];
}

async function isSlotAvailable(shopId: string, professionalId: string, startsAt: string, endsAt: string, excludeAppointmentId: string | null) {
  const busy = await getDb()
    .prepare(
      `select id, starts_at, ends_at
       from appointments
       where barber_shop_id = ? and professional_id = ?
         and status in ('scheduled', 'confirmed', 'in_service')
         and starts_at < ? and ends_at > ?`,
    )
    .bind(shopId, professionalId, endsAt, startsAt)
    .all<{ id: string; starts_at: string; ends_at: string }>();
  return (busy.results ?? []).every((row) => row.id === excludeAppointmentId);
}

function appointmentsBaseQuery() {
  return `select a.*, c.name as client_name, c.phone as client_phone,
                 p.public_name as professional_name, s.name as service_name,
                 s.duration_minutes, s.price_cents
          from appointments a
          join clients c on c.id = a.client_id
          join professionals p on p.id = a.professional_id
          join services s on s.id = a.service_id`;
}

function serializeShop(shop: BarberShop) {
  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    logoUrl: shop.logo_url,
    phone: shop.phone,
    address: shop.address,
    timezone: shop.timezone,
    theme: safeJson(shop.theme_json),
  };
}

function normalizeSessionUser(
  row: SessionUser & { barber_shop_id?: string; barber_shop_slug?: string; barber_shop_name?: string },
): SessionUser {
  return {
    id: row.id,
    barberShopId: row.barberShopId ?? row.barber_shop_id ?? "",
    barberShopSlug: row.barberShopSlug ?? row.barber_shop_slug ?? "",
    barberShopName: row.barberShopName ?? row.barber_shop_name ?? "",
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
  };
}

function assertSameShop(user: SessionUser, slug: string) {
  if (user.barberShopSlug !== slug) {
    throw new Error("Acesso negado para esta barbearia.");
  }
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  return header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function sessionCookie(token: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secure}`;
}

async function issueSession(userId: string, requestUrl: string) {
  const user = await getDb()
    .prepare(
      `select u.id, u.barber_shop_id, u.name, u.email, u.phone, u.role,
              b.slug as barber_shop_slug, b.name as barber_shop_name
       from users u
       join barber_shops b on b.id = u.barber_shop_id
       where u.id = ? and u.active = 1 and b.active = 1
       limit 1`,
    )
    .bind(userId)
    .first<SessionUser & { barber_shop_id: string; barber_shop_slug: string; barber_shop_name: string }>();
  if (!user) throw new Error("Conta indisponivel.");

  const token = createToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  await getDb()
    .prepare("insert into auth_sessions (id, user_id, token_hash, expires_at) values (?, ?, ?, ?)")
    .bind(createId("session"), user.id, tokenHash, expiresAt)
    .run();

  return {
    user: normalizeSessionUser(user),
    cookie: sessionCookie(token, requestUrl),
  };
}

async function createTwoFactorChallenge(
  userId: string,
  barberShopId: string,
  email: string,
  purpose: "login" | "register" | "google",
): Promise<TwoFactorChallenge> {
  const challengeId = createId("2fa");
  const code = createSixDigitCode();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();

  await getDb()
    .prepare(
      `update auth_challenges
       set consumed_at = ?
       where user_id = ? and consumed_at is null`,
    )
    .bind(new Date().toISOString(), userId)
    .run();

  await getDb()
    .prepare(
      `insert into auth_challenges
       (id, barber_shop_id, user_id, purpose, code_hash, expires_at, consumed_at)
       values (?, ?, ?, ?, ?, ?, null)`,
    )
    .bind(challengeId, barberShopId, userId, purpose, await sha256Hex(`${challengeId}:${code}`), expiresAt)
    .run();

  return {
    challengeId,
    expiresAt,
    channel: "email",
    deliveryTarget: maskEmail(email),
    devCode: code,
  };
}

function createSixDigitCode() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return String(value[0] % 1_000_000).padStart(6, "0");
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function createToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 120000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return hex(new Uint8Array(digest));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function hex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlString(value: string) {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function localDateTimeToUtcIso(date: string, time: string) {
  return new Date(`${date}T${time}:00${SAO_PAULO_OFFSET}`).toISOString();
}

function addDaysUtcIso(date: string, days: number) {
  const localMidnight = new Date(`${date}T00:00:00${SAO_PAULO_OFFSET}`);
  localMidnight.setUTCDate(localMidnight.getUTCDate() + days);
  return localMidnight.toISOString();
}

function addMinutesIso(iso: string, minutes: number) {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

function weekdayInSaoPaulo(date: string) {
  return new Date(`${date}T12:00:00${SAO_PAULO_OFFSET}`).getUTCDay();
}

function minutesFromTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function timeFromMinutes(total: number) {
  const hour = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const minute = (total % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function isoRangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return Date.parse(startA) < Date.parse(endB) && Date.parse(endA) > Date.parse(startB);
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}
