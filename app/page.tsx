"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SectionId = "inicio" | "agenda" | "cadastros" | "cliente";
type UserRole = "owner" | "admin" | "barber" | "reception" | "client";
type AppointmentStatus = "scheduled" | "confirmed" | "in_service" | "completed" | "no_show" | "cancelled";
type Locale = "pt-BR" | "en-US";
type CatalogTab = "client" | "service" | "professional" | "hours";
type AuthMode = "login" | "register";

type PendingChallenge = {
  challengeId: string;
  expiresAt: string;
  channel: "authenticator";
  deliveryTarget: string;
  setupRequired: boolean;
  setupSecret?: string;
  setupUri?: string;
};

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

const copy = {
  "pt-BR": {
    nav: {
      login: "Acesso",
      inicio: "Início",
      agenda: "Agenda",
      cadastros: "Clientes",
      cliente: "Perfil",
    },
    roles: {
      owner: "Dono",
      admin: "Admin",
      barber: "Barbeiro",
      reception: "Recepção",
      client: "Cliente",
    },
    status: {
      scheduled: "Agendado",
      confirmed: "Confirmado",
      in_service: "Em atendimento",
      completed: "Concluído",
      no_show: "Faltou",
      cancelled: "Cancelado",
    },
    seedRoles: {
      owner: "Dono",
      barber: "Barbeiro",
      reception: "Recepção",
      client: "Cliente",
    },
    language: {
      label: "Idioma",
      aria: "Escolher idioma",
      pt: "Português",
      en: "English",
    },
    common: {
      enter: "Entrar",
      leave: "Sair",
      loading: "Carregando dados reais...",
      noLogin: "Sem login",
      roleLogged: "logado",
      waitingLogin: "Aguardando login",
      barberShop: "Barbearia",
      role: "Papel",
      phone: "Telefone",
      unavailable: "-",
      with: "com",
    },
    topbar: {
      eyebrow: "Painel do barbeiro",
      title: "Rosa do Corte no ritmo certo.",
    },
    login: {
      eyebrow: "Acesso seguro",
      title: "Entre ou crie sua conta.",
      description:
        "Todas as contas usam senha e verificação em duas etapas antes de abrir a agenda. O cadastro cria uma conta de cliente na barbearia escolhida.",
      tabLogin: "Fazer login",
      tabRegister: "Inscrever-se",
      slug: "Slug da barbearia",
      slugBadge: "Slug",
      name: "Nome completo",
      phone: "WhatsApp",
      email: "E-mail",
      password: "Senha",
      confirmPassword: "Confirmar senha",
      submit: "Acessar",
      registerSubmit: "Criar conta",
      googleSubmit: "Inscrever-se com Google",
      googleHint: "O Google OAuth fica disponível assim que as credenciais forem configuradas no ambiente.",
      demoAccess: "Acessos de demonstração",
    },
    twoFactor: {
      eyebrow: "Verificação 2FA",
      title: "Confirme o código do autenticador.",
      description: "Abra seu app autenticador para",
      setupTitle: "Configure seu app autenticador",
      setupDescription: "Adicione esta chave no Google Authenticator, Authy ou Microsoft Authenticator e digite o código gerado.",
      secretLabel: "Chave de configuração",
      uriLabel: "URI para importar",
      code: "Código de 6 dígitos",
      submit: "Verificar e entrar",
      back: "Trocar conta",
      sent: "2FA iniciado. Confirme o código do app autenticador para concluir o acesso.",
    },
    home: {
      newAppointment: "Novo agendamento",
      metrics: {
        subscribers: ["Assinantes ativos", "base da barbearia"],
        revenue: ["Receita recorrente", "previsão mensal"],
        retention: ["Retenção no mês", "clientes que voltam"],
        missed: ["Faltas no mês", "faltas registradas"],
      },
      agendaTitle: "Agenda de hoje",
      openAgenda: "Abrir agenda",
      noActive: "Nenhum horário ativo para esta data.",
      clubTitle: "Clube da barba",
      plans: "Planos",
      planNames: ["Essencial", "Rosa Club", "Patrão"],
      clientTitle: "Minha agenda",
      clientSubtitle: "Acompanhe seus próximos horários, histórico e serviços disponíveis.",
      clientNext: "Próximo horário",
      clientServices: "Serviços disponíveis",
      clientHistory: "Histórico da data",
      clientEmptyNext: "Você ainda não tem horário marcado para esta data.",
      clientProfile: "Minha conta",
    },
    agenda: {
      eyebrow: "Agendar horário",
      title: "Escolha serviço, barbeiro e horário livre.",
      recalculate: "Recalcular",
      service: "Serviço",
      professional: "Profissional",
      anyProfessional: "Qualquer disponível",
      client: "Cliente",
      quickClient: "Criar rápido pelo nome/WhatsApp",
      name: "Nome",
      whatsapp: "WhatsApp",
      availableTimes: "Horários disponíveis",
      noSlots: "Sem horários livres para esta combinação.",
      confirm: "Confirmar horário",
      ok: "OK",
      done: "Fim",
      cancel: "Cancelar",
      noAppointments: "Nenhum agendamento nesta data.",
    },
    catalog: {
      eyebrow: "Clientes e equipe",
      title: "Cadastre clientes, profissionais, serviços e expedientes.",
      readOnly: "Este papel não pode cadastrar dados operacionais.",
      tabs: {
        client: "Cliente",
        service: "Serviço",
        professional: "Profissional",
        hours: "Horários",
      },
      summary: "Resumo cadastral",
      readRole: "Leitura",
      summaryItems: {
        clients: "clientes carregados nesta sessão.",
        professionals: "profissionais ativos.",
        services: "serviços com duração e preço.",
        hours: "janelas de expediente.",
      },
      form: {
        name: "Nome",
        phone: "WhatsApp",
        email: "E-mail",
        preferences: "Preferência de corte",
        serviceName: "Nome do serviço",
        description: "Descrição",
        duration: "Duração min",
        buffer: "Folga min",
        price: "Preço R$",
        internalName: "Nome interno",
        publicName: "Nome público",
        color: "Cor",
        professional: "Profissional",
        weekday: "Dia da semana",
        weekdays: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
        start: "Início",
        end: "Fim",
        breakStart: "Pausa início",
        breakEnd: "Pausa fim",
        submit: "Salvar cadastro",
      },
    },
    profile: {
      eyebrow: "Perfil",
      title: "Próximos horários, contato e histórico.",
      notLogged: "Cliente não logado",
      loginHint: "Entre para ver dados e histórico.",
      history: "Histórico da data",
      empty: "Nenhum horário encontrado.",
    },
    messages: {
      loadFail: "Falha ao carregar dados.",
      availabilityFail: "Falha ao calcular horários.",
      invalidLogin: "Login inválido.",
      passwordMismatch: "As senhas não conferem.",
      registerFail: "Falha ao criar conta.",
      googleStartFail: "Falha ao iniciar Google.",
      chooseSlot: "Escolha um horário livre.",
      appointmentFail: "Falha ao agendar.",
      appointmentOk: "Horário agendado com sucesso.",
      statusFail: "Falha ao alterar status.",
      catalogFail: "Falha ao cadastrar.",
      catalogOk: "Cadastro salvo.",
    },
  },
  "en-US": {
    nav: {
      login: "Access",
      inicio: "Home",
      agenda: "Schedule",
      cadastros: "Clients",
      cliente: "Profile",
    },
    roles: {
      owner: "Owner",
      admin: "Admin",
      barber: "Barber",
      reception: "Front desk",
      client: "Client",
    },
    status: {
      scheduled: "Scheduled",
      confirmed: "Confirmed",
      in_service: "In service",
      completed: "Completed",
      no_show: "No-show",
      cancelled: "Cancelled",
    },
    seedRoles: {
      owner: "Owner",
      barber: "Barber",
      reception: "Front desk",
      client: "Client",
    },
    language: {
      label: "Language",
      aria: "Choose language",
      pt: "Português",
      en: "English",
    },
    common: {
      enter: "Sign in",
      leave: "Sign out",
      loading: "Loading live data...",
      noLogin: "Signed out",
      roleLogged: "signed in",
      waitingLogin: "Waiting for sign-in",
      barberShop: "Barbershop",
      role: "Role",
      phone: "Phone",
      unavailable: "-",
      with: "with",
    },
    topbar: {
      eyebrow: "Barber dashboard",
      title: "Rosa do Corte, running on schedule.",
    },
    login: {
      eyebrow: "Secure access",
      title: "Sign in or create an account.",
      description:
        "Every account uses a password and two-step verification before opening the schedule. Registration creates a client account in the selected barbershop.",
      tabLogin: "Sign in",
      tabRegister: "Sign up",
      slug: "Barbershop slug",
      slugBadge: "Slug",
      name: "Full name",
      phone: "WhatsApp",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      submit: "Sign in",
      registerSubmit: "Create account",
      googleSubmit: "Sign up with Google",
      googleHint: "Google OAuth becomes available as soon as credentials are configured in the environment.",
      demoAccess: "Demo access",
    },
    twoFactor: {
      eyebrow: "2FA verification",
      title: "Confirm your authenticator code.",
      description: "Open your authenticator app for",
      setupTitle: "Set up your authenticator app",
      setupDescription: "Add this key to Google Authenticator, Authy, or Microsoft Authenticator, then enter the generated code.",
      secretLabel: "Setup key",
      uriLabel: "Import URI",
      code: "6-digit code",
      submit: "Verify and enter",
      back: "Use another account",
      sent: "2FA started. Confirm the authenticator code to finish access.",
    },
    home: {
      newAppointment: "New appointment",
      metrics: {
        subscribers: ["Active members", "shop client base"],
        revenue: ["Recurring revenue", "monthly forecast"],
        retention: ["Monthly retention", "returning clients"],
        missed: ["Monthly no-shows", "missed visits logged"],
      },
      agendaTitle: "Today's schedule",
      openAgenda: "Open schedule",
      noActive: "No active appointments for this date.",
      clubTitle: "Beard club",
      plans: "Plans",
      planNames: ["Essential", "Rosa Club", "Patron"],
      clientTitle: "My schedule",
      clientSubtitle: "Follow your upcoming appointments, history and available services.",
      clientNext: "Next appointment",
      clientServices: "Available services",
      clientHistory: "Date history",
      clientEmptyNext: "You do not have an appointment for this date yet.",
      clientProfile: "My account",
    },
    agenda: {
      eyebrow: "Book a time",
      title: "Choose service, barber and an open slot.",
      recalculate: "Recalculate",
      service: "Service",
      professional: "Professional",
      anyProfessional: "Any available",
      client: "Client",
      quickClient: "Create quickly by name/WhatsApp",
      name: "Name",
      whatsapp: "WhatsApp",
      availableTimes: "Available times",
      noSlots: "No open slots for this combination.",
      confirm: "Confirm time",
      ok: "OK",
      done: "Done",
      cancel: "Cancel",
      noAppointments: "No appointments for this date.",
    },
    catalog: {
      eyebrow: "Clients and team",
      title: "Register clients, professionals, services and working hours.",
      readOnly: "This role cannot register operational data.",
      tabs: {
        client: "Client",
        service: "Service",
        professional: "Professional",
        hours: "Hours",
      },
      summary: "Registration summary",
      readRole: "Read only",
      summaryItems: {
        clients: "clients loaded in this session.",
        professionals: "active professionals.",
        services: "services with duration and price.",
        hours: "working-hour windows.",
      },
      form: {
        name: "Name",
        phone: "WhatsApp",
        email: "Email",
        preferences: "Cut preference",
        serviceName: "Service name",
        description: "Description",
        duration: "Duration min",
        buffer: "Buffer min",
        price: "Price R$",
        internalName: "Internal name",
        publicName: "Public name",
        color: "Color",
        professional: "Professional",
        weekday: "Weekday",
        weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        start: "Start",
        end: "End",
        breakStart: "Break start",
        breakEnd: "Break end",
        submit: "Save record",
      },
    },
    profile: {
      eyebrow: "Profile",
      title: "Upcoming times, contact and history.",
      notLogged: "Client signed out",
      loginHint: "Sign in to see details and history.",
      history: "Date history",
      empty: "No times found.",
    },
    messages: {
      loadFail: "Could not load data.",
      availabilityFail: "Could not calculate available times.",
      invalidLogin: "Invalid login.",
      passwordMismatch: "Passwords do not match.",
      registerFail: "Could not create account.",
      googleStartFail: "Could not start Google.",
      chooseSlot: "Choose an open time.",
      appointmentFail: "Could not book.",
      appointmentOk: "Appointment booked successfully.",
      statusFail: "Could not update status.",
      catalogFail: "Could not save the record.",
      catalogOk: "Record saved.",
    },
  },
} as const;

type Copy = (typeof copy)["pt-BR"];

const navItems: Array<{ id: SectionId; icon: string }> = [
  { id: "inicio", icon: "IN" },
  { id: "agenda", icon: "AG" },
  { id: "cadastros", icon: "CL" },
  { id: "cliente", icon: "PF" },
];

const seedLogins = [
  { role: "owner" as const, email: "admin@rosadocorte.com.br", password: "rosa-admin" },
  { role: "barber" as const, email: "rosa@rosadocorte.com.br", password: "rosa-barbeiro" },
  { role: "reception" as const, email: "recepcao@rosadocorte.com.br", password: "rosa-recepcao" },
  { role: "client" as const, email: "cliente@rosadocorte.com.br", password: "rosa-cliente" },
];

function canAccessSection(id: SectionId, user: User) {
  if (id === "cadastros") return ["owner", "admin", "reception", "barber"].includes(user.role);
  return true;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("pt-BR");
  const [section, setSection] = useState<SectionId>("inicio");
  const [slug, setSlug] = useState("rosa-do-corte");
  const [date, setDate] = useState(todayInputValue());
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("admin@rosadocorte.com.br");
  const [loginPassword, setLoginPassword] = useState("rosa-admin");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("any");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("client");

  const t = copy[locale];
  const user = workspace.user;
  const canManageAgenda = Boolean(user && ["owner", "admin", "reception", "barber"].includes(user.role));
  const canManageCatalog = Boolean(user && ["owner", "admin"].includes(user.role));
  const isClient = user?.role === "client";
  const visibleNavItems = useMemo(() => (user ? navItems.filter((item) => canAccessSection(item.id, user)) : []), [user]);
  const activeSection = user && canAccessSection(section, user) ? section : "inicio";

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, slug]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeId = params.get("authChallenge");
    if (!challengeId) return;

    void Promise.resolve().then(() => {
      setAuthBusy(true);
      void fetch(`/api/auth/2fa/challenge?id=${encodeURIComponent(challengeId)}`)
        .then(async (response) => {
          const data = (await response.json()) as { challenge?: PendingChallenge; error?: string };
          if (!response.ok || !data.challenge) throw new Error(data.error || "Falha ao carregar 2FA.");
          setPendingChallenge(data.challenge);
          setTwoFactorCode("");
          window.history.replaceState(null, "", window.location.pathname);
        })
        .catch((error) => {
          setMessage(error instanceof Error ? error.message : "Falha ao carregar 2FA.");
        })
        .finally(() => setAuthBusy(false));
    });
  }, []);

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
  const activeSubscribers = workspace.metrics?.clientsCount ?? workspace.clients.length;
  const monthlyRevenueCents = activeSubscribers * 7900 + (workspace.metrics?.completedCount ?? 0) * 5500;
  const retentionRate = activeSubscribers
    ? Math.min(98, 88 + Math.round(((workspace.metrics?.completedCount ?? 0) / Math.max(activeSubscribers, 1)) * 4))
    : 94;
  const noShowCount = workspace.metrics?.noShowCount ?? 0;

  async function loadWorkspace() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/workspace?slug=${encodeURIComponent(slug)}&date=${date}`);
      const data = (await response.json()) as Workspace | { error: string };
      if (!response.ok || "error" in data) throw new Error("error" in data ? data.error : t.messages.loadFail);
      setWorkspace(data);
      setSelectedServiceId((current) =>
        data.services.some((service) => service.id === current) ? current : data.services[0]?.id ?? "",
      );
      setSelectedClientId((current) =>
        data.clients.some((client) => client.id === current) ? current : data.clients[0]?.id ?? "",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.messages.loadFail);
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
      if (!response.ok) throw new Error(data.error || t.messages.availabilityFail);
      setSlots(data.slots ?? []);
      setSelectedSlot("");
    } catch (error) {
      setSlots([]);
      setMessage(error instanceof Error ? error.message : t.messages.availabilityFail);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setAuthBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: loginEmail, password: loginPassword }),
      });
      const data = (await response.json()) as { challenge?: PendingChallenge; error?: string };
      if (!response.ok || !data.challenge) {
        setMessage(data.error || t.messages.invalidLogin);
        return;
      }
      setPendingChallenge(data.challenge);
      setTwoFactorCode("");
      setMessage(t.twoFactor.sent);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (registerPassword !== registerConfirmPassword) {
      setMessage(t.messages.passwordMismatch);
      return;
    }

    setAuthBusy(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: registerName,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword,
        }),
      });
      const data = (await response.json()) as { challenge?: PendingChallenge; error?: string };
      if (!response.ok || !data.challenge) {
        setMessage(data.error || t.messages.registerFail);
        return;
      }
      setPendingChallenge(data.challenge);
      setTwoFactorCode("");
      setMessage(t.twoFactor.sent);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifyTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingChallenge) return;

    setMessage("");
    setAuthBusy(true);
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: pendingChallenge.challengeId, code: twoFactorCode }),
      });
      const data = (await response.json()) as { user?: User; error?: string };
      if (!response.ok || !data.user) {
        setMessage(data.error || t.messages.invalidLogin);
        return;
      }
      setWorkspace((current) => ({ ...current, user: data.user ?? null }));
      setPendingChallenge(null);
      setTwoFactorCode("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setSection("inicio");
      await loadWorkspace();
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleStart() {
    setMessage("");
    setAuthBusy(true);
    try {
      const response = await fetch("/api/auth/google/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, mode: authMode }),
      });
      const data = (await response.json()) as { configured?: boolean; url?: string; message?: string; error?: string };
      if (!response.ok) {
        setMessage(data.error || t.messages.googleStartFail);
        return;
      }
      if (data.configured && data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage(data.message || t.login.googleHint);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setWorkspace(emptyWorkspace);
    setSection("inicio");
    await loadWorkspace();
  }

  async function handleCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const slot = slots.find((item) => item.startsAt === selectedSlot);
    if (!slot) {
      setMessage(t.messages.chooseSlot);
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
      setMessage(data.error || t.messages.appointmentFail);
      return;
    }
    setMessage(t.messages.appointmentOk);
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
      setMessage(data.error || t.messages.statusFail);
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
      setMessage(data.error || t.messages.catalogFail);
      return;
    }
    event.currentTarget.reset();
    setMessage(t.messages.catalogOk);
    await loadWorkspace();
  }

  const authScreen = (
    <main className="auth-shell" lang={locale}>
      <header className="auth-topbar">
        <div className="brand auth-brand">
          <span className="brand-mark" aria-hidden="true">
            RC
          </span>
          <span>
            <strong>{workspace.shop?.name ?? "Rosa do Corte"}</strong>
            <small>{workspace.shop?.slug ?? slug}</small>
          </span>
        </div>
        <label className="locale-control">
          <span>{t.language.label}</span>
          <select aria-label={t.language.aria} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            <option value="pt-BR">{t.language.pt}</option>
            <option value="en-US">{t.language.en}</option>
          </select>
        </label>
      </header>

      <div className="auth-main">
        {message && <div className="notice">{message}</div>}
        {loading && <div className="notice muted">{t.common.loading}</div>}

        <section className="screen login-screen" aria-labelledby="login-title">
          <div className="login-copy">
            <p className="eyebrow">{t.login.eyebrow}</p>
            <h2 id="login-title">{t.login.title}</h2>
            <p>{t.login.description}</p>
            <div className="login-proof">
              <span>{t.login.slugBadge}</span>
              <strong>{slug}</strong>
            </div>
          </div>
          <div className="login-form">
            {!pendingChallenge && (
              <div className="auth-switch" role="tablist" aria-label={t.login.eyebrow}>
                <button
                  aria-selected={authMode === "login"}
                  className={authMode === "login" ? "active" : ""}
                  onClick={() => {
                    setAuthMode("login");
                    setPendingChallenge(null);
                    setMessage("");
                  }}
                  role="tab"
                  type="button"
                >
                  {t.login.tabLogin}
                </button>
                <button
                  aria-selected={authMode === "register"}
                  className={authMode === "register" ? "active" : ""}
                  onClick={() => {
                    setAuthMode("register");
                    setPendingChallenge(null);
                    setMessage("");
                  }}
                  role="tab"
                  type="button"
                >
                  {t.login.tabRegister}
                </button>
              </div>
            )}

            {pendingChallenge ? (
              <form className="two-factor-card" onSubmit={handleVerifyTwoFactor}>
                <div>
                  <p className="eyebrow">{t.twoFactor.eyebrow}</p>
                  <h3>{pendingChallenge.setupRequired ? t.twoFactor.setupTitle : t.twoFactor.title}</h3>
                  <p>
                    {pendingChallenge.setupRequired ? t.twoFactor.setupDescription : t.twoFactor.description}{" "}
                    {!pendingChallenge.setupRequired && <strong>{pendingChallenge.deliveryTarget}</strong>}
                  </p>
                </div>
                {pendingChallenge.setupRequired && pendingChallenge.setupSecret && (
                  <div className="setup-stack">
                    <div className="setup-secret">
                      <span>{t.twoFactor.secretLabel}</span>
                      <strong>{pendingChallenge.setupSecret}</strong>
                    </div>
                    {pendingChallenge.setupUri && (
                      <label>
                        {t.twoFactor.uriLabel}
                        <input readOnly value={pendingChallenge.setupUri} onFocus={(event) => event.currentTarget.select()} />
                      </label>
                    )}
                  </div>
                )}
                <label>
                  {t.twoFactor.code}
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </label>
                <button className="primary-button wide" type="submit" disabled={authBusy || twoFactorCode.length !== 6}>
                  {t.twoFactor.submit}
                </button>
                <button
                  className="ghost-button wide"
                  type="button"
                  onClick={() => {
                    setPendingChallenge(null);
                    setTwoFactorCode("");
                    setMessage("");
                  }}
                >
                  {t.twoFactor.back}
                </button>
              </form>
            ) : authMode === "login" ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <label>
                  {t.login.slug}
                  <input value={slug} onChange={(event) => setSlug(event.target.value)} />
                </label>
                <label>
                  {t.login.email}
                  <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" />
                </label>
                <label>
                  {t.login.password}
                  <input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" />
                </label>
                <button className="primary-button wide" type="submit" disabled={authBusy}>
                  {t.login.submit}
                </button>
                <div className="credential-grid" aria-label={t.login.demoAccess}>
                  {seedLogins.map(({ role, email, password }) => (
                    <button
                      className="credential-card"
                      key={email}
                      type="button"
                      onClick={() => {
                        setLoginEmail(email);
                        setLoginPassword(password);
                      }}
                    >
                      <strong>{t.seedRoles[role]}</strong>
                      <span>{email}</span>
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegister}>
                <button className="google-button" type="button" onClick={handleGoogleStart} disabled={authBusy}>
                  <span aria-hidden="true">G</span>
                  {t.login.googleSubmit}
                </button>
                <p className="auth-hint">{t.login.googleHint}</p>
                <label>
                  {t.login.slug}
                  <input value={slug} onChange={(event) => setSlug(event.target.value)} />
                </label>
                <label>
                  {t.login.name}
                  <input value={registerName} onChange={(event) => setRegisterName(event.target.value)} required />
                </label>
                <label>
                  {t.login.phone}
                  <input value={registerPhone} onChange={(event) => setRegisterPhone(event.target.value)} required />
                </label>
                <label>
                  {t.login.email}
                  <input value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} type="email" required />
                </label>
                <div className="inline-grid">
                  <label>
                    {t.login.password}
                    <input
                      value={registerPassword}
                      onChange={(event) => setRegisterPassword(event.target.value)}
                      type="password"
                      minLength={8}
                      required
                    />
                  </label>
                  <label>
                    {t.login.confirmPassword}
                    <input
                      value={registerConfirmPassword}
                      onChange={(event) => setRegisterConfirmPassword(event.target.value)}
                      type="password"
                      minLength={8}
                      required
                    />
                  </label>
                </div>
                <button className="primary-button wide" type="submit" disabled={authBusy}>
                  {t.login.registerSubmit}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );

  if (!user) return authScreen;

  return (
    <main className="app-shell" lang={locale}>
      <aside className="sidebar" aria-label={locale === "pt-BR" ? "Navegação principal" : "Main navigation"}>
        <button className="brand" type="button" onClick={() => setSection("inicio")}>
          <span className="brand-mark" aria-hidden="true">
            RC
          </span>
          <span>
            <strong>{workspace.shop?.name ?? "Rosa do Corte"}</strong>
            <small>{workspace.shop?.slug ?? slug}</small>
          </span>
        </button>

        <nav className="nav-list">
          {visibleNavItems.map((item) => (
            <button
              aria-current={activeSection === item.id ? "page" : undefined}
              className="nav-button"
              key={item.id}
              onClick={() => setSection(item.id)}
              title={t.nav[item.id]}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{t.nav[item.id]}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className="status-dot" />
          <span>{`${t.roles[user.role]} ${t.common.roleLogged}`}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t.topbar.eyebrow}</p>
            <h1>{t.topbar.title}</h1>
          </div>
          <div className="topbar-actions">
            <input className="compact-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <label className="locale-control">
              <span>{t.language.label}</span>
              <select
                aria-label={t.language.aria}
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
              >
                <option value="pt-BR">{t.language.pt}</option>
                <option value="en-US">{t.language.en}</option>
              </select>
            </label>
            <span className="pill strong">{t.roles[user.role]}</span>
            <button className="ghost-button" type="button" onClick={handleLogout}>
              {t.common.leave}
            </button>
          </div>
        </header>

        {message && <div className="notice">{message}</div>}
        {loading && <div className="notice muted">{t.common.loading}</div>}

        {activeSection === "inicio" && (
          <section className="screen" aria-labelledby="home-title">
            <div className="home-head">
              <div className="hero-content">
                <h2 id="home-title">{isClient ? t.home.clientTitle : t.nav.inicio}</h2>
                <p>{isClient ? t.home.clientSubtitle : formatLongDate(date, locale)}</p>
              </div>
              <button className="primary-button" type="button" onClick={() => setSection("agenda")}>
                {t.home.newAppointment}
              </button>
            </div>

            {isClient ? (
              <div className="client-home-grid">
                <article className="panel client-next-panel">
                  <div className="panel-heading">
                    <span>{t.home.clientNext}</span>
                    <button className="icon-button small" type="button" title={t.home.openAgenda} onClick={() => setSection("agenda")}>
                      AG
                    </button>
                  </div>
                  {nextAppointment ? (
                    <AppointmentHighlight appointment={nextAppointment} locale={locale} withLabel={t.common.with} />
                  ) : (
                    <p className="empty-state">{t.home.clientEmptyNext}</p>
                  )}
                </article>

                <article className="panel">
                  <div className="panel-heading">
                    <span>{t.home.clientHistory}</span>
                    <span className="pill">{date}</span>
                  </div>
                  <ul className="timeline">
                    {workspace.appointments.map((appointment) => (
                      <li key={appointment.id}>
                        <strong>{formatTime(appointment.starts_at, locale)}</strong>
                        {appointment.service_name} {t.common.with} {appointment.professional_name} - {t.status[appointment.status]}
                      </li>
                    ))}
                    {!workspace.appointments.length && <li>{t.profile.empty}</li>}
                  </ul>
                </article>

                <article className="panel">
                  <div className="panel-heading">
                    <span>{t.home.clientServices}</span>
                    <span className="pill">{workspace.services.length}</span>
                  </div>
                  <div className="service-mini-list">
                    {workspace.services.slice(0, 5).map((service) => (
                      <div className="service-mini-row" key={service.id}>
                        <div>
                          <strong>{service.name}</strong>
                          <span>{service.duration_minutes} min</span>
                        </div>
                        <strong>{formatMoney(service.price_cents, locale)}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel">
                  <div className="panel-heading">
                    <span>{t.home.clientProfile}</span>
                    <button className="icon-button small" type="button" title={t.nav.cliente} onClick={() => setSection("cliente")}>
                      PF
                    </button>
                  </div>
                  <div className="profile-mini">
                    <div className="avatar small">{initials(user.name)}</div>
                    <div>
                      <h3>{user.name}</h3>
                      <p>{user.email}</p>
                      <span className="pill strong">{t.roles[user.role]}</span>
                    </div>
                  </div>
                </article>
              </div>
            ) : (
              <>
                <div className="metrics-grid">
                  <Metric title={t.home.metrics.subscribers[0]} value={activeSubscribers} detail={t.home.metrics.subscribers[1]} />
                  <Metric title={t.home.metrics.revenue[0]} value={formatMoney(monthlyRevenueCents, locale)} detail={t.home.metrics.revenue[1]} />
                  <Metric title={t.home.metrics.retention[0]} value={`${retentionRate}%`} detail={t.home.metrics.retention[1]} />
                  <Metric title={t.home.metrics.missed[0]} value={noShowCount} detail={t.home.metrics.missed[1]} />
                </div>

                <div className="split-grid">
                  <article className="panel">
                    <div className="panel-heading">
                      <span>{t.home.agendaTitle}</span>
                      <button className="icon-button small" type="button" title={t.home.openAgenda} onClick={() => setSection("agenda")}>
                        AG
                      </button>
                    </div>
                    {workspace.appointments.length ? (
                      <div className="today-list">
                        {workspace.appointments.slice(0, 5).map((appointment) => (
                          <div className="today-row" key={appointment.id}>
                            <strong>{formatTime(appointment.starts_at, locale)}</strong>
                            <div>
                              <h3>{appointment.client_name}</h3>
                              <p>
                                {appointment.service_name} {t.common.with} {appointment.professional_name}
                              </p>
                            </div>
                            <span>{t.status[appointment.status]}</span>
                          </div>
                        ))}
                      </div>
                    ) : nextAppointment ? (
                      <AppointmentHighlight appointment={nextAppointment} locale={locale} withLabel={t.common.with} />
                    ) : (
                      <p className="empty-state">{t.home.noActive}</p>
                    )}
                  </article>
                  <article className="panel">
                    <div className="panel-heading">
                      <span>{t.home.clubTitle}</span>
                      <span className="pill">{t.home.plans}</span>
                    </div>
                    <div className="club-progress-list">
                      <PlanProgress label={t.home.planNames[0]} value={52} />
                      <PlanProgress label={t.home.planNames[1]} value={61} />
                      <PlanProgress label={t.home.planNames[2]} value={15} />
                    </div>
                  </article>
                </div>
              </>
            )}
          </section>
        )}

        {activeSection === "agenda" && (
          <section className="screen" aria-labelledby="agenda-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t.agenda.eyebrow}</p>
                <h2 id="agenda-title">{t.agenda.title}</h2>
              </div>
              <button className="primary-button" type="button" onClick={() => void loadAvailability()}>
                {t.agenda.recalculate}
              </button>
            </div>

            <div className="booking-grid">
              <form className="booking-builder" onSubmit={handleCreateAppointment}>
                <label>
                  {t.agenda.service}
                  <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)}>
                    {workspace.services.map((service) => (
                      <option value={service.id} key={service.id}>
                        {service.name} - {service.duration_minutes} min - {formatMoney(service.price_cents, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.agenda.professional}
                  <select value={selectedProfessionalId} onChange={(event) => setSelectedProfessionalId(event.target.value)}>
                    <option value="any">{t.agenda.anyProfessional}</option>
                    {workspace.professionals.map((professional) => (
                      <option value={professional.id} key={professional.id}>
                        {professional.public_name}
                      </option>
                    ))}
                  </select>
                </label>
                {user?.role !== "client" && (
                  <label>
                    {t.agenda.client}
                    <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                      <option value="">{t.agenda.quickClient}</option>
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
                      {t.agenda.name}
                      <input value={newClientName} onChange={(event) => setNewClientName(event.target.value)} />
                    </label>
                    <label>
                      {t.agenda.whatsapp}
                      <input value={newClientPhone} onChange={(event) => setNewClientPhone(event.target.value)} />
                    </label>
                  </div>
                )}
                <div className="time-grid" role="group" aria-label={t.agenda.availableTimes}>
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
                  {!slots.length && <p className="empty-state">{t.agenda.noSlots}</p>}
                </div>
                <button className="primary-button wide" type="submit" disabled={!user || !selectedSlot}>
                  {t.agenda.confirm}
                </button>
              </form>

              <div className="schedule-list">
                {workspace.appointments.map((appointment) => (
                  <article className="appointment-card" key={appointment.id}>
                    <time>{formatTime(appointment.starts_at, locale)}</time>
                    <div>
                      <h3>{appointment.client_name}</h3>
                      <p>
                        {appointment.service_name} {t.common.with} {appointment.professional_name}
                      </p>
                    </div>
                    <span>{t.status[appointment.status]}</span>
                    <div className="status-actions">
                      {canManageAgenda && appointment.status !== "completed" && (
                        <>
                          <button type="button" onClick={() => void handleStatus(appointment.id, "confirmed")}>
                            {t.agenda.ok}
                          </button>
                          <button type="button" onClick={() => void handleStatus(appointment.id, "completed")}>
                            {t.agenda.done}
                          </button>
                        </>
                      )}
                      {appointment.status !== "cancelled" && (
                        <button type="button" onClick={() => void handleStatus(appointment.id, "cancelled")}>
                          {t.agenda.cancel}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {!workspace.appointments.length && <p className="empty-state">{t.agenda.noAppointments}</p>}
              </div>
            </div>
          </section>
        )}

        {activeSection === "cadastros" && (
          <section className="screen" aria-labelledby="catalog-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t.catalog.eyebrow}</p>
                <h2 id="catalog-title">{t.catalog.title}</h2>
              </div>
              <span className="pill strong">{canManageCatalog ? "Admin" : canManageAgenda ? t.nav.agenda : t.catalog.readRole}</span>
            </div>

            {!canManageAgenda ? (
              <p className="notice">{t.catalog.readOnly}</p>
            ) : (
              <div className="catalog-layout">
                <div className="segmented">
                  <button className={catalogTab === "client" ? "active" : ""} onClick={() => setCatalogTab("client")} type="button">
                    {t.catalog.tabs.client}
                  </button>
                  <button className={catalogTab === "service" ? "active" : ""} onClick={() => setCatalogTab("service")} type="button" disabled={!canManageCatalog}>
                    {t.catalog.tabs.service}
                  </button>
                  <button className={catalogTab === "professional" ? "active" : ""} onClick={() => setCatalogTab("professional")} type="button" disabled={!canManageCatalog}>
                    {t.catalog.tabs.professional}
                  </button>
                  <button className={catalogTab === "hours" ? "active" : ""} onClick={() => setCatalogTab("hours")} type="button" disabled={!canManageCatalog}>
                    {t.catalog.tabs.hours}
                  </button>
                </div>

                <CatalogForm
                  tab={catalogTab}
                  labels={t.catalog.form}
                  professionals={workspace.professionals}
                  onSubmit={submitCatalog}
                />

                <article className="panel">
                  <div className="panel-heading">
                    <span>{t.catalog.summary}</span>
                    <span className="pill">{workspace.shop?.slug}</span>
                  </div>
                  <ul className="clean-list">
                    <li>{workspace.clients.length} {t.catalog.summaryItems.clients}</li>
                    <li>{workspace.professionals.length} {t.catalog.summaryItems.professionals}</li>
                    <li>{workspace.services.length} {t.catalog.summaryItems.services}</li>
                    <li>{workspace.workingHours.length} {t.catalog.summaryItems.hours}</li>
                  </ul>
                </article>
              </div>
            )}
          </section>
        )}

        {activeSection === "cliente" && (
          <section className="screen" aria-labelledby="client-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t.profile.eyebrow}</p>
                <h2 id="client-title">{t.profile.title}</h2>
              </div>
              <span className="pill strong">{user ? t.roles[user.role] : t.common.noLogin}</span>
            </div>

            <div className="profile-grid">
              <article className="profile-main">
                <div className="avatar">{initials(user?.name ?? "RC")}</div>
                <div>
                  <h3>{user?.name ?? t.profile.notLogged}</h3>
                  <p>{user?.email ?? t.profile.loginHint}</p>
                </div>
                <dl>
                  <div>
                    <dt>{t.common.barberShop}</dt>
                    <dd>{workspace.shop?.name ?? t.common.unavailable}</dd>
                  </div>
                  <div>
                    <dt>{t.common.role}</dt>
                    <dd>{user ? t.roles[user.role] : t.common.unavailable}</dd>
                  </div>
                  <div>
                    <dt>{t.common.phone}</dt>
                    <dd>{user?.phone ?? t.common.unavailable}</dd>
                  </div>
                </dl>
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <span>{t.profile.history}</span>
                  <span className="pill">{date}</span>
                </div>
                <ul className="timeline">
                  {workspace.appointments.map((appointment) => (
                    <li key={appointment.id}>
                      <strong>{formatTime(appointment.starts_at, locale)}</strong>
                      {appointment.service_name} {t.common.with} {appointment.professional_name} - {t.status[appointment.status]}
                    </li>
                  ))}
                  {!workspace.appointments.length && <li>{t.profile.empty}</li>}
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

function AppointmentHighlight({
  appointment,
  locale,
  withLabel,
}: {
  appointment: Appointment;
  locale: Locale;
  withLabel: string;
}) {
  return (
    <div className="appointment-highlight">
      <strong>{formatTime(appointment.starts_at, locale)}</strong>
      <div>
        <h3>{appointment.client_name}</h3>
        <p>
          {appointment.service_name} {withLabel} {appointment.professional_name}
        </p>
      </div>
    </div>
  );
}

function PlanProgress({ label, value }: { label: string; value: number }) {
  return (
    <div className="club-progress">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="club-progress-track">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function CatalogForm({
  tab,
  labels,
  professionals,
  onSubmit,
}: {
  tab: CatalogTab;
  labels: Copy["catalog"]["form"];
  professionals: Professional[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="booking-builder" onSubmit={onSubmit}>
      <input type="hidden" name="type" value={tab === "hours" ? "workingHour" : tab} />
      {tab === "client" && (
        <>
          <label>
            {labels.name}
            <input name="name" required />
          </label>
          <label>
            {labels.phone}
            <input name="phone" required />
          </label>
          <label>
            {labels.email}
            <input name="email" type="email" />
          </label>
          <label>
            {labels.preferences}
            <input name="preferences" />
          </label>
        </>
      )}
      {tab === "service" && (
        <>
          <label>
            {labels.serviceName}
            <input name="name" required />
          </label>
          <label>
            {labels.description}
            <input name="description" />
          </label>
          <div className="inline-grid">
            <label>
              {labels.duration}
              <input name="durationMinutes" type="number" min="10" defaultValue="45" required />
            </label>
            <label>
              {labels.buffer}
              <input name="bufferMinutes" type="number" min="0" defaultValue="10" />
            </label>
          </div>
          <label>
            {labels.price}
            <input name="priceReais" type="number" min="0" step="1" defaultValue="55" required />
          </label>
        </>
      )}
      {tab === "professional" && (
        <>
          <label>
            {labels.internalName}
            <input name="name" required />
          </label>
          <label>
            {labels.publicName}
            <input name="publicName" required />
          </label>
          <label>
            {labels.color}
            <input name="color" type="color" defaultValue="#8f2638" />
          </label>
        </>
      )}
      {tab === "hours" && (
        <>
          <label>
            {labels.professional}
            <select name="professionalId" required>
              {professionals.map((professional) => (
                <option value={professional.id} key={professional.id}>
                  {professional.public_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.weekday}
            <select name="weekday" defaultValue="1">
              <option value="1">{labels.weekdays[1]}</option>
              <option value="2">{labels.weekdays[2]}</option>
              <option value="3">{labels.weekdays[3]}</option>
              <option value="4">{labels.weekdays[4]}</option>
              <option value="5">{labels.weekdays[5]}</option>
              <option value="6">{labels.weekdays[6]}</option>
              <option value="0">{labels.weekdays[0]}</option>
            </select>
          </label>
          <div className="inline-grid">
            <label>
              {labels.start}
              <input name="startTime" type="time" defaultValue="09:00" required />
            </label>
            <label>
              {labels.end}
              <input name="endTime" type="time" defaultValue="19:00" required />
            </label>
          </div>
          <div className="inline-grid">
            <label>
              {labels.breakStart}
              <input name="breakStart" type="time" defaultValue="12:00" />
            </label>
            <label>
              {labels.breakEnd}
              <input name="breakEnd" type="time" defaultValue="13:00" />
            </label>
          </div>
        </>
      )}
      <button className="primary-button wide" type="submit">
        {labels.submit}
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

function formatMoney(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatTime(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatLongDate(value: string, locale: Locale) {
  const date = new Date(`${value}T12:00:00-03:00`);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
