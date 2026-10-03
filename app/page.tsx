"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SectionId = "login" | "inicio" | "agenda" | "cadastros" | "cliente";
type UserRole = "owner" | "admin" | "barber" | "reception" | "client";
type AppointmentStatus = "scheduled" | "confirmed" | "in_service" | "completed" | "no_show" | "cancelled";

type User = {
  id: string;
  barberShopId: string;
  barberShopSlug: string;
  barberShopName: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
};

type Shop = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  theme: Record<string, string>;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  price_cents: number;
};

type Professional = {
  id: string;
  name: string;
  public_name: string;
  color: string;
};

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferences: string | null;
};

type Appointment = {
  id: string;
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

type WorkingHour = {
  id: string;
  professional_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
};

type Slot = {
  professionalId: string;
  professionalName: string;
  startsAt: string;
  endsAt: string;
  label: string;
};

type Workspace = {
  shop: Shop | null;
  user: User | null;
  services: Service[];
  professionals: Professional[];
  clients: Client[];
  appointments: Appointment[];
  workingHours: WorkingHour[];
  metrics: null | {
    clientsCount: number;
    servicesCount: number;
    professionalsCount: number;
    todayCount: number;
    completedCount: number;
    noShowCount: number;
  };
};

const emptyWorkspace: Workspace = {
  shop: null,
  user: null,
  services: [],
  professionals: [],
  clients: [],
  appointments: [],
  workingHours: [],
  metrics: null,
};

const roleLabels: Record<UserRole, string> = {
  owner: "Dono",
  admin: "Admin",
  barber: "Barbeiro",
  reception: "Recepcao",
  client: "Cliente",
};

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_service: "Em atendimento",
  completed: "Concluido",
  no_show: "Faltou",
  cancelled: "Cancelado",
};

const navItems: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: "login", label: "Login", icon: "IN" },
  { id: "inicio", label: "Inicio", icon: "HO" },
  { id: "agenda", label: "Agenda", icon: "AG" },
  { id: "cadastros", label: "Cadastros", icon: "DB" },
  { id: "cliente", label: "Cliente", icon: "CL" },
];

const seedLogins = [
  ["Dono", "admin@rosadocorte.com.br", "rosa-admin"],
  ["Barbeiro", "rosa@rosadocorte.com.br", "rosa-barbeiro"],
  ["Recepcao", "recepcao@rosadocorte.com.br", "rosa-recepcao"],
  ["Cliente", "cliente@rosadocorte.com.br", "rosa-cliente"],
];

export default function Home() {
  const [section, setSection] = useState<SectionId>("login");
  const [slug, setSlug] = useState("rosa-do-corte");
  const [date, setDate] = useState(todayInputValue());
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [loginEmail, setLoginEmail] = useState("admin@rosadocorte.com.br");
  const [loginPassword, setLoginPassword] = useState("rosa-admin");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("any");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [catalogTab, setCatalogTab] = useState<"client" | "service" | "professional" | "hours">("client");

  const user = workspace.user;
  const canManageAgenda = user && ["owner", "admin", "reception", "barber"].includes(user.role);
  const canManageCatalog = user && ["owner", "admin"].includes(user.role);

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, slug]);

  useEffect(() => {
    if (!selectedServiceId && workspace.services[0]) {
      setSelectedServiceId(workspace.services[0].id);
    }
    if (!selectedClientId && workspace.clients[0]) {
      setSelectedClientId(workspace.clients[0].id);
    }
  }, [selectedClientId, selectedServiceId, workspace.clients, workspace.services]);

  useEffect(() => {
    if (selectedServiceId) {
      void loadAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId, selectedProfessionalId, date, slug, workspace.appointments.length]);

  const nextAppointment = useMemo(
    () =>
      workspace.appointments.find((appointment) =>
        ["scheduled", "confirmed", "in_service"].includes(appointment.status),
      ),
    [workspace.appointments],
  );

  async function loadWorkspace() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/workspace?slug=${encodeURIComponent(slug)}&date=${date}`);
      const data = (await response.json()) as Workspace | { error: string };
      if (!response.ok || "error" in data) throw new Error("error" in data ? data.error : "Falha ao carregar.");
      setWorkspace(data);
      if (data.user && section === "login") setSection("inicio");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailability() {
    try {
      const params = new URLSearchParams({
        slug,
        date,
        serviceId: selectedServiceId,
        professionalId: selectedProfessionalId,
      });
      const response = await fetch(`/api/availability?${params.toString()}`);
      const data = (await response.json()) as { slots?: Slot[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Falha ao calcular horarios.");
      setSlots(data.slots ?? []);
      setSelectedSlot("");
    } catch (error) {
      setSlots([]);
      setMessage(error instanceof Error ? error.message : "Falha ao calcular horarios.");
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, email: loginEmail, password: loginPassword }),
    });
    const data = (await response.json()) as { user?: User; error?: string };
    if (!response.ok) {
      setMessage(data.error || "Login invalido.");
      return;
    }
    setWorkspace((current) => ({ ...current, user: data.user ?? null }));
    setSection("inicio");
    await loadWorkspace();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setWorkspace(emptyWorkspace);
    setSection("login");
    await loadWorkspace();
  }

  async function handleCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const slot = slots.find((item) => item.startsAt === selectedSlot);
    if (!slot) {
      setMessage("Escolha um horario livre.");
      return;
    }
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        startsAt: slot.startsAt,
        serviceId: selectedServiceId,
        professionalId: slot.professionalId,
        clientId: user?.role === "client" ? undefined : selectedClientId || undefined,
        clientName: newClientName,
        clientPhone: newClientPhone,
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "Falha ao agendar.");
      return;
    }
    setMessage("Horario agendado com sucesso.");
    setNewClientName("");
    setNewClientPhone("");
    await loadWorkspace();
  }

  async function handleStatus(id: string, status: AppointmentStatus) {
    setMessage("");
    const response = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "Falha ao alterar status.");
      return;
    }
    await loadWorkspace();
  }

  async function submitCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const type = String(form.get("type"));
    const payload: Record<string, string | number | null> = { type };

    for (const [key, value] of form.entries()) {
      if (key === "type") continue;
      payload[key] = String(value);
    }

    if (type === "service") {
      payload.durationMinutes = Number(payload.durationMinutes);
      payload.bufferMinutes = Number(payload.bufferMinutes || 10);
      payload.priceCents = Math.round(Number(payload.priceReais || 0) * 100);
      delete payload.priceReais;
    }

    if (type === "workingHour") {
      payload.weekday = Number(payload.weekday);
    }

    const response = await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "Falha ao cadastrar.");
      return;
    }
    event.currentTarget.reset();
    setMessage("Cadastro salvo.");
    await loadWorkspace();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <button className="brand" type="button" onClick={() => setSection(user ? "inicio" : "login")}>
          <span className="brand-mark" aria-hidden="true">
            RC
          </span>
          <span>
            <strong>{workspace.shop?.name ?? "Rosa do Corte"}</strong>
            <small>{workspace.shop?.slug ?? slug}</small>
          </span>
        </button>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              aria-current={section === item.id ? "page" : undefined}
              className="nav-button"
              key={item.id}
              onClick={() => setSection(item.id)}
              title={item.label}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className="status-dot" />
          <span>{user ? `${roleLabels[user.role]} logado` : "Aguardando login"}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Rosa do Corte OS</p>
            <h1>Agenda, equipe e clientes em um painel simples de tocar.</h1>
          </div>
          <div className="topbar-actions">
            <input className="compact-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            {user ? (
              <button className="ghost-button" type="button" onClick={handleLogout}>
                Sair
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={() => setSection("login")}>
                Entrar
              </button>
            )}
          </div>
        </header>

        {message && <div className="notice">{message}</div>}
        {loading && <div className="notice muted">Carregando dados reais...</div>}

        {section === "login" && (
          <section className="screen login-screen" aria-labelledby="login-title">
            <div className="login-copy">
              <p className="eyebrow">Acesso seguro</p>
              <h2 id="login-title">Entre e assuma sua cadeira.</h2>
              <p>
                Cada pessoa entra no seu papel: dono, barbeiro, recepcao ou cliente. O painel abre
                direto na rotina certa para aquela barbearia.
              </p>
              <div className="login-proof">
                <span>Slug</span>
                <strong>{slug}</strong>
              </div>
            </div>
            <form className="login-form" onSubmit={handleLogin}>
              <label>
                Slug da barbearia
                <input value={slug} onChange={(event) => setSlug(event.target.value)} />
              </label>
              <label>
                E-mail
                <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" />
              </label>
              <label>
                Senha
                <input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" />
              </label>
              <button className="primary-button wide" type="submit">
                Acessar
              </button>
              <div className="credential-grid">
                {seedLogins.map(([role, email, password]) => (
                  <button
                    className="credential-card"
                    key={email}
                    type="button"
                    onClick={() => {
                      setLoginEmail(email);
                      setLoginPassword(password);
                    }}
                  >
                    <strong>{role}</strong>
                    <span>{email}</span>
                  </button>
                ))}
              </div>
            </form>
          </section>
        )}

        {section === "inicio" && (
          <section className="screen" aria-labelledby="home-title">
            <div className="hero-band compact-hero">
              <div className="hero-content">
                <p className="eyebrow">Hoje na barbearia</p>
                <h2 id="home-title">Tudo pronto para manter a casa girando.</h2>
                <p>
                  Veja os proximos atendimentos, acompanhe a equipe e abra horarios livres sem
                  perder o controle da agenda.
                </p>
              </div>
              <div className="system-card">
                <span>Usuario atual</span>
                <strong>{user ? user.name : "Sem sessao"}</strong>
                <small>{user ? `${roleLabels[user.role]} em ${user.barberShopName}` : "Entre para carregar agenda protegida"}</small>
              </div>
            </div>

            <div className="metrics-grid">
              <Metric title="Clientes" value={workspace.metrics?.clientsCount ?? workspace.clients.length} detail="base da barbearia" />
              <Metric title="Equipe" value={workspace.metrics?.professionalsCount ?? workspace.professionals.length} detail="profissionais ativos" />
              <Metric title="Servicos" value={workspace.metrics?.servicesCount ?? workspace.services.length} detail="catalogo ativo" />
              <Metric title="Agenda hoje" value={workspace.metrics?.todayCount ?? workspace.appointments.length} detail={`${workspace.metrics?.noShowCount ?? 0} faltas`} />
            </div>

            <div className="split-grid">
              <article className="panel">
                <div className="panel-heading">
                  <span>Proximo atendimento</span>
                  <button className="icon-button small" type="button" title="Abrir agenda" onClick={() => setSection("agenda")}>
                    AG
                  </button>
                </div>
                {nextAppointment ? (
                  <div className="appointment-highlight">
                    <strong>{formatTime(nextAppointment.starts_at)}</strong>
                    <div>
                      <h3>{nextAppointment.client_name}</h3>
                      <p>
                        {nextAppointment.service_name} com {nextAppointment.professional_name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="empty-state">Nenhum horario ativo para esta data.</p>
                )}
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <span>Conta da barbearia</span>
                  <span className="pill">{workspace.shop?.slug ?? slug}</span>
                </div>
                <ul className="clean-list">
                  <li>Dados, equipe e clientes ficam separados por unidade.</li>
                  <li>Cada papel enxerga somente o que precisa operar.</li>
                  <li>Horarios ocupados saem da lista automaticamente.</li>
                </ul>
              </article>
            </div>
          </section>
        )}

        {section === "agenda" && (
          <section className="screen" aria-labelledby="agenda-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Agenda inteligente</p>
                <h2 id="agenda-title">Escolha servico, profissional e confirme sem conflito.</h2>
              </div>
              <button className="primary-button" type="button" onClick={() => void loadAvailability()}>
                Recalcular
              </button>
            </div>

            <div className="booking-grid">
              <form className="booking-builder" onSubmit={handleCreateAppointment}>
                <label>
                  Servico
                  <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)}>
                    {workspace.services.map((service) => (
                      <option value={service.id} key={service.id}>
                        {service.name} - {service.duration_minutes} min - {formatMoney(service.price_cents)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Profissional
                  <select value={selectedProfessionalId} onChange={(event) => setSelectedProfessionalId(event.target.value)}>
                    <option value="any">Qualquer disponivel</option>
                    {workspace.professionals.map((professional) => (
                      <option value={professional.id} key={professional.id}>
                        {professional.public_name}
                      </option>
                    ))}
                  </select>
                </label>
                {user?.role !== "client" && (
                  <label>
                    Cliente
                    <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                      <option value="">Criar rapido pelo nome/WhatsApp</option>
                      {workspace.clients.map((client) => (
                        <option value={client.id} key={client.id}>
                          {client.name} - {client.phone}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {user?.role !== "client" && !selectedClientId && (
                  <div className="inline-grid">
                    <label>
                      Nome
                      <input value={newClientName} onChange={(event) => setNewClientName(event.target.value)} />
                    </label>
                    <label>
                      WhatsApp
                      <input value={newClientPhone} onChange={(event) => setNewClientPhone(event.target.value)} />
                    </label>
                  </div>
                )}
                <div className="time-grid" role="group" aria-label="Horarios disponiveis">
                  {slots.map((slot) => (
                    <button
                      className={selectedSlot === slot.startsAt ? "time-slot active" : "time-slot"}
                      key={`${slot.professionalId}-${slot.startsAt}`}
                      onClick={() => setSelectedSlot(slot.startsAt)}
                      type="button"
                    >
                      <span>{slot.label}</span>
                      <small>{slot.professionalName}</small>
                    </button>
                  ))}
                  {!slots.length && <p className="empty-state">Sem horarios livres para esta combinacao.</p>}
                </div>
                <button className="primary-button wide" type="submit" disabled={!user || !selectedSlot}>
                  Confirmar horario
                </button>
              </form>

              <div className="schedule-list">
                {workspace.appointments.map((appointment) => (
                  <article className="appointment-card" key={appointment.id}>
                    <time>{formatTime(appointment.starts_at)}</time>
                    <div>
                      <h3>{appointment.client_name}</h3>
                      <p>
                        {appointment.service_name} com {appointment.professional_name}
                      </p>
                    </div>
                    <span>{statusLabels[appointment.status]}</span>
                    <div className="status-actions">
                      {canManageAgenda && appointment.status !== "completed" && (
                        <>
                          <button type="button" onClick={() => void handleStatus(appointment.id, "confirmed")}>
                            OK
                          </button>
                          <button type="button" onClick={() => void handleStatus(appointment.id, "completed")}>
                            Fim
                          </button>
                        </>
                      )}
                      {appointment.status !== "cancelled" && (
                        <button type="button" onClick={() => void handleStatus(appointment.id, "cancelled")}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {!workspace.appointments.length && <p className="empty-state">Nenhum agendamento nesta data.</p>}
              </div>
            </div>
          </section>
        )}

        {section === "cadastros" && (
          <section className="screen" aria-labelledby="catalog-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Base da casa</p>
                <h2 id="catalog-title">Cadastre clientes, profissionais, servicos e expedientes.</h2>
              </div>
              <span className="pill strong">{canManageCatalog ? "Admin" : canManageAgenda ? "Agenda" : "Leitura"}</span>
            </div>

            {!canManageAgenda ? (
              <p className="notice">Este papel nao pode cadastrar dados operacionais.</p>
            ) : (
              <div className="catalog-layout">
                <div className="segmented">
                  <button className={catalogTab === "client" ? "active" : ""} onClick={() => setCatalogTab("client")} type="button">
                    Cliente
                  </button>
                  <button className={catalogTab === "service" ? "active" : ""} onClick={() => setCatalogTab("service")} type="button" disabled={!canManageCatalog}>
                    Servico
                  </button>
                  <button className={catalogTab === "professional" ? "active" : ""} onClick={() => setCatalogTab("professional")} type="button" disabled={!canManageCatalog}>
                    Profissional
                  </button>
                  <button className={catalogTab === "hours" ? "active" : ""} onClick={() => setCatalogTab("hours")} type="button" disabled={!canManageCatalog}>
                    Horarios
                  </button>
                </div>

                <CatalogForm
                  tab={catalogTab}
                  professionals={workspace.professionals}
                  onSubmit={submitCatalog}
                />

                <article className="panel">
                  <div className="panel-heading">
                    <span>Resumo cadastral</span>
                    <span className="pill">{workspace.shop?.slug}</span>
                  </div>
                  <ul className="clean-list">
                    <li>{workspace.clients.length} clientes carregados nesta sessao.</li>
                    <li>{workspace.professionals.length} profissionais ativos.</li>
                    <li>{workspace.services.length} servicos com duracao e preco.</li>
                    <li>{workspace.workingHours.length} janelas de expediente.</li>
                  </ul>
                </article>
              </div>
            )}
          </section>
        )}

        {section === "cliente" && (
          <section className="screen" aria-labelledby="client-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Minha barbearia</p>
                <h2 id="client-title">Proximos horarios, contato e historico em um lugar.</h2>
              </div>
              <span className="pill strong">{user ? roleLabels[user.role] : "Sem login"}</span>
            </div>

            <div className="profile-grid">
              <article className="profile-main">
                <div className="avatar">{initials(user?.name ?? "RC")}</div>
                <div>
                  <h3>{user?.name ?? "Cliente nao logado"}</h3>
                  <p>{user?.email ?? "Entre para ver dados e historico."}</p>
                </div>
                <dl>
                  <div>
                    <dt>Barbearia</dt>
                    <dd>{workspace.shop?.name ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>Papel</dt>
                    <dd>{user ? roleLabels[user.role] : "-"}</dd>
                  </div>
                  <div>
                    <dt>Telefone</dt>
                    <dd>{user?.phone ?? "-"}</dd>
                  </div>
                </dl>
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <span>Historico da data</span>
                  <span className="pill">{date}</span>
                </div>
                <ul className="timeline">
                  {workspace.appointments.map((appointment) => (
                    <li key={appointment.id}>
                      <strong>{formatTime(appointment.starts_at)}</strong>
                      {appointment.service_name} com {appointment.professional_name} - {statusLabels[appointment.status]}
                    </li>
                  ))}
                  {!workspace.appointments.length && <li>Nenhum horario encontrado.</li>}
                </ul>
              </article>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({ title, value, detail }: { title: string; value: number | string; detail: string }) {
  return (
    <article className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function CatalogForm({
  tab,
  professionals,
  onSubmit,
}: {
  tab: "client" | "service" | "professional" | "hours";
  professionals: Professional[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="booking-builder" onSubmit={onSubmit}>
      <input type="hidden" name="type" value={tab === "hours" ? "workingHour" : tab} />
      {tab === "client" && (
        <>
          <label>
            Nome
            <input name="name" required />
          </label>
          <label>
            WhatsApp
            <input name="phone" required />
          </label>
          <label>
            E-mail
            <input name="email" type="email" />
          </label>
          <label>
            Preferencia de corte
            <input name="preferences" />
          </label>
        </>
      )}
      {tab === "service" && (
        <>
          <label>
            Nome do servico
            <input name="name" required />
          </label>
          <label>
            Descricao
            <input name="description" />
          </label>
          <div className="inline-grid">
            <label>
              Duracao min
              <input name="durationMinutes" type="number" min="10" defaultValue="45" required />
            </label>
            <label>
              Folga min
              <input name="bufferMinutes" type="number" min="0" defaultValue="10" />
            </label>
          </div>
          <label>
            Preco R$
            <input name="priceReais" type="number" min="0" step="1" defaultValue="55" required />
          </label>
        </>
      )}
      {tab === "professional" && (
        <>
          <label>
            Nome interno
            <input name="name" required />
          </label>
          <label>
            Nome publico
            <input name="publicName" required />
          </label>
          <label>
            Cor
            <input name="color" type="color" defaultValue="#8f2638" />
          </label>
        </>
      )}
      {tab === "hours" && (
        <>
          <label>
            Profissional
            <select name="professionalId" required>
              {professionals.map((professional) => (
                <option value={professional.id} key={professional.id}>
                  {professional.public_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dia da semana
            <select name="weekday" defaultValue="1">
              <option value="1">Segunda</option>
              <option value="2">Terca</option>
              <option value="3">Quarta</option>
              <option value="4">Quinta</option>
              <option value="5">Sexta</option>
              <option value="6">Sabado</option>
              <option value="0">Domingo</option>
            </select>
          </label>
          <div className="inline-grid">
            <label>
              Inicio
              <input name="startTime" type="time" defaultValue="09:00" required />
            </label>
            <label>
              Fim
              <input name="endTime" type="time" defaultValue="19:00" required />
            </label>
          </div>
          <div className="inline-grid">
            <label>
              Pausa inicio
              <input name="breakStart" type="time" defaultValue="12:00" />
            </label>
            <label>
              Pausa fim
              <input name="breakEnd" type="time" defaultValue="13:00" />
            </label>
          </div>
        </>
      )}
      <button className="primary-button wide" type="submit">
        Salvar cadastro
      </button>
    </form>
  );
}

function todayInputValue() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
