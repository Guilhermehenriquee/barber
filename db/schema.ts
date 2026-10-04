import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const barberShops = sqliteTable(
  "barber_shops",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    phone: text("phone"),
    address: text("address"),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    themeJson: text("theme_json").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugUnique: uniqueIndex("idx_barber_shops_slug_unique").on(table.slug),
  }),
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    barberShopId: text("barber_shop_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    role: text("role", { enum: ["owner", "admin", "barber", "reception", "client"] }).notNull(),
    passwordSalt: text("password_salt").notNull(),
    passwordHash: text("password_hash").notNull(),
    twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).notNull().default(true),
    twoFactorChannel: text("two_factor_channel", { enum: ["email", "totp"] }).notNull().default("totp"),
    twoFactorSecret: text("two_factor_secret"),
    twoFactorConfirmedAt: text("two_factor_confirmed_at"),
    googleSub: text("google_sub"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    shopEmailUnique: uniqueIndex("idx_users_shop_email_unique").on(table.barberShopId, table.email),
    shopRoleIdx: index("idx_users_shop_role").on(table.barberShopId, table.role),
  }),
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("idx_auth_sessions_token_hash_unique").on(table.tokenHash),
    userIdx: index("idx_auth_sessions_user").on(table.userId),
  }),
);

export const authChallenges = sqliteTable(
  "auth_challenges",
  {
    id: text("id").primaryKey(),
    barberShopId: text("barber_shop_id").notNull(),
    userId: text("user_id").notNull(),
    purpose: text("purpose", { enum: ["login", "register", "google"] }).notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdx: index("idx_auth_challenges_user").on(table.userId),
    expiresIdx: index("idx_auth_challenges_expires").on(table.expiresAt),
  }),
);

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    barberShopId: text("barber_shop_id").notNull(),
    userId: text("user_id"),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    notes: text("notes"),
    preferences: text("preferences"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    shopPhoneIdx: index("idx_clients_shop_phone").on(table.barberShopId, table.phone),
    userIdx: index("idx_clients_user").on(table.userId),
  }),
);

export const professionals = sqliteTable(
  "professionals",
  {
    id: text("id").primaryKey(),
    barberShopId: text("barber_shop_id").notNull(),
    userId: text("user_id"),
    name: text("name").notNull(),
    publicName: text("public_name").notNull(),
    color: text("color").notNull().default("#8f2638"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    shopActiveIdx: index("idx_professionals_shop_active").on(table.barberShopId, table.active),
    userIdx: index("idx_professionals_user").on(table.userId),
  }),
);

export const services = sqliteTable(
  "services",
  {
    id: text("id").primaryKey(),
    barberShopId: text("barber_shop_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferMinutes: integer("buffer_minutes").notNull().default(10),
    priceCents: integer("price_cents").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    shopActiveIdx: index("idx_services_shop_active").on(table.barberShopId, table.active),
  }),
);

export const workingHours = sqliteTable(
  "working_hours",
  {
    id: text("id").primaryKey(),
    barberShopId: text("barber_shop_id").notNull(),
    professionalId: text("professional_id").notNull(),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    breakStart: text("break_start"),
    breakEnd: text("break_end"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    professionalWeekdayIdx: index("idx_working_hours_professional_weekday").on(
      table.barberShopId,
      table.professionalId,
      table.weekday,
    ),
  }),
);

export const timeBlocks = sqliteTable(
  "time_blocks",
  {
    id: text("id").primaryKey(),
    barberShopId: text("barber_shop_id").notNull(),
    professionalId: text("professional_id").notNull(),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    professionalStartIdx: index("idx_time_blocks_professional_start").on(
      table.barberShopId,
      table.professionalId,
      table.startsAt,
    ),
  }),
);

export const appointments = sqliteTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    barberShopId: text("barber_shop_id").notNull(),
    clientId: text("client_id").notNull(),
    professionalId: text("professional_id").notNull(),
    serviceId: text("service_id").notNull(),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at").notNull(),
    status: text("status", {
      enum: ["scheduled", "confirmed", "in_service", "completed", "no_show", "cancelled"],
    }).notNull(),
    notes: text("notes"),
    source: text("source", { enum: ["client", "admin", "walk_in"] }).notNull().default("client"),
    createdByUserId: text("created_by_user_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    shopStartIdx: index("idx_appointments_shop_start").on(table.barberShopId, table.startsAt),
    clientStartIdx: index("idx_appointments_client_start").on(table.barberShopId, table.clientId, table.startsAt),
    professionalStartIdx: index("idx_appointments_professional_start").on(
      table.barberShopId,
      table.professionalId,
      table.startsAt,
    ),
    professionalStartActiveUnique: uniqueIndex("idx_appointments_professional_start_active_unique")
      .on(table.barberShopId, table.professionalId, table.startsAt)
      .where(sql`status in ('scheduled', 'confirmed', 'in_service')`),
  }),
);
