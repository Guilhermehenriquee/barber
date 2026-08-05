"use client";

import { FormEvent, useMemo, useState } from "react";

type SectionId = "login" | "inicio" | "agenda" | "clube" | "planos" | "perfil";

const navItems: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: "login", label: "Login", icon: "IN" },
  { id: "inicio", label: "Inicio", icon: "HO" },
  { id: "agenda", label: "Agenda", icon: "AG" },
  { id: "clube", label: "Clube", icon: "CB" },
  { id: "planos", label: "Planos", icon: "PL" },
  { id: "perfil", label: "Perfil", icon: "PF" },
];

const appointments = [
  {
    time: "09:00",
    client: "Marcos Vinicius",
    service: "Corte degrade + sobrancelha",
    barber: "Rosa",
    status: "Confirmado",
  },
  {
    time: "10:20",
    client: "Daniel Souza",
    service: "Barba premium com toalha quente",
    barber: "Rafa",
    status: "Chegou",
  },
  {
    time: "13:40",
    client: "Joao Pedro",
    service: "Corte social",
    barber: "Rosa",
    status: "Aguardando",
  },
  {
    time: "16:10",
    client: "Igor Martins",
    service: "Combo corte + barba",
    barber: "PH",
    status: "Confirmado",
  },
];

const services = [
  { name: "Corte assinatura", duration: "45 min", price: "R$ 0 no plano" },
  { name: "Barba premium", duration: "35 min", price: "R$ 39" },
  { name: "Combo completo", duration: "70 min", price: "R$ 79" },
  { name: "Pigmentacao", duration: "25 min", price: "R$ 35" },
];

const plans = [
  {
    name: "Essencial",
    price: "R$ 69",
    cadence: "/mes",
    tag: "Entrada",
    features: ["2 cortes por mes", "Agenda antecipada", "Historico de visitas"],
  },
  {
    name: "Rosa Club",
    price: "R$ 99",
    cadence: "/mes",
    tag: "Mais vendido",
    features: ["4 cortes por mes", "1 barba inclusa", "10% em produtos", "Fila expressa"],
  },
  {
    name: "Patrao",
    price: "R$ 149",
    cadence: "/mes",
    tag: "Completo",
    features: ["Cortes ilimitados", "2 barbas premium", "Convidado do mes", "Prioridade total"],
  },
];

const clubBenefits = [
  "Check-in por QR Code",
  "Carteira de creditos",
  "Mensagens de renovacao",
  "Pontuacao por indicacao",
  "Bloqueio automatico por inadimplencia",
  "Relatorio de assinantes ativos",
];

export default function Home() {
  const [section, setSection] = useState<SectionId>("inicio");
  const [loggedIn, setLoggedIn] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Rosa Club");
  const [selectedBarber, setSelectedBarber] = useState("Rosa");
  const [selectedService, setSelectedService] = useState("Combo completo");
  const [selectedTime, setSelectedTime] = useState("16:10");

  const nextAppointment = useMemo(
    () => appointments.find((appointment) => appointment.status !== "Chegou") ?? appointments[0],
    [],
  );

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggedIn(true);
    setSection("inicio");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <button className="brand" type="button" onClick={() => setSection("inicio")}>
          <span className="brand-mark" aria-hidden="true">
            RC
          </span>
          <span>
            <strong>Rosa do Corte</strong>
            <small>Clube & Agenda</small>
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
          <span>{loggedIn ? "Sessao ativa" : "Modo demonstracao"}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sistema inspirado no Cashbarber</p>
            <h1>Barbearia por assinatura, agenda e relacionamento.</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" title="Notificacoes" aria-label="Notificacoes">
              !
            </button>
            <button className="primary-button" type="button" onClick={() => setSection("agenda")}>
              <span aria-hidden="true">+</span>
              Agendar
            </button>
          </div>
        </header>

        {section === "login" && (
          <section className="screen login-screen" aria-labelledby="login-title">
            <div className="login-copy">
              <p className="eyebrow">Acesso do cliente</p>
              <h2 id="login-title">Entre para ver plano, horarios e historico.</h2>
              <p>
                Fluxo pensado para o cliente final: login simples, recuperacao de senha,
                aceite de termos e entrada direta no painel do clube.
              </p>
              <div className="login-proof">
                <span>2026.08</span>
                <strong>Rosa Club</strong>
              </div>
            </div>
            <form className="login-form" onSubmit={handleLogin}>
              <label>
                E-mail
                <input defaultValue="cliente@rosadocorte.com.br" type="email" />
              </label>
              <label>
                Senha
                <input defaultValue="clubedabarba" type="password" />
              </label>
              <button className="primary-button wide" type="submit">
                Acessar
              </button>
              <button className="ghost-button" type="button">
                Esqueci minha senha
              </button>
            </form>
          </section>
        )}

        {section === "inicio" && (
          <section className="screen" aria-labelledby="home-title">
            <div className="hero-band">
              <div className="hero-content">
                <p className="eyebrow">Inicio</p>
                <h2 id="home-title">Ritual marcado, cliente fidelizado, caixa previsivel.</h2>
                <p>
                  Um painel para o Rosa do Corte vender assinatura, organizar agenda,
                  acompanhar barbeiros e manter o cliente voltando no tempo certo.
                </p>
                <div className="hero-actions">
                  <button className="primary-button" type="button" onClick={() => setSection("planos")}>
                    Ver planos
                  </button>
                  <button className="ghost-button" type="button" onClick={() => setSection("clube")}>
                    Clube da barba
                  </button>
                </div>
              </div>
              <div className="hero-visual" aria-label="Previa visual do painel Rosa do Corte">
                <div className="barber-pole" />
                <div className="phone-frame">
                  <img src="/og.png" alt="Identidade visual do Rosa do Corte" />
                </div>
              </div>
            </div>

            <div className="metrics-grid">
              <article className="metric-card">
                <span>Assinantes ativos</span>
                <strong>184</strong>
                <small>+18 este mes</small>
              </article>
              <article className="metric-card">
                <span>Agenda hoje</span>
                <strong>32</strong>
                <small>91% ocupada</small>
              </article>
              <article className="metric-card">
                <span>Receita recorrente</span>
                <strong>R$ 18,7k</strong>
                <small>planos + creditos</small>
              </article>
              <article className="metric-card">
                <span>Retencao</span>
                <strong>86%</strong>
                <small>ultimos 90 dias</small>
              </article>
            </div>

            <div className="split-grid">
              <article className="panel">
                <div className="panel-heading">
                  <span>Proximo horario</span>
                  <button className="icon-button small" type="button" title="Abrir agenda" onClick={() => setSection("agenda")}>
                    &gt;
                  </button>
                </div>
                <div className="appointment-highlight">
                  <strong>{nextAppointment.time}</strong>
                  <div>
                    <h3>{nextAppointment.client}</h3>
                    <p>{nextAppointment.service}</p>
                  </div>
                </div>
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <span>Alertas inteligentes</span>
                  <span className="pill">4 acoes</span>
                </div>
                <ul className="clean-list">
                  <li>7 clientes com corte vencendo em 3 dias</li>
                  <li>3 pagamentos recorrentes recusados</li>
                  <li>Campanha pronta para aniversariantes</li>
                </ul>
              </article>
            </div>
          </section>
        )}

        {section === "agenda" && (
          <section className="screen" aria-labelledby="agenda-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Agendamento</p>
                <h2 id="agenda-title">Marque horario sem perder o controle da cadeira.</h2>
              </div>
              <button className="primary-button" type="button">
                <span aria-hidden="true">+</span>
                Novo horario
              </button>
            </div>

            <div className="booking-grid">
              <article className="booking-builder">
                <label>
                  Barbeiro
                  <select value={selectedBarber} onChange={(event) => setSelectedBarber(event.target.value)}>
                    <option>Rosa</option>
                    <option>Rafa</option>
                    <option>PH</option>
                  </select>
                </label>
                <label>
                  Servico
                  <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>
                    {services.map((service) => (
                      <option key={service.name}>{service.name}</option>
                    ))}
                  </select>
                </label>
                <div className="time-grid" role="group" aria-label="Horarios disponiveis">
                  {["09:00", "10:20", "13:40", "16:10", "17:30", "18:20"].map((time) => (
                    <button
                      className={selectedTime === time ? "time-slot active" : "time-slot"}
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      type="button"
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <div className="booking-summary">
                  <span>Resumo</span>
                  <strong>
                    {selectedTime} com {selectedBarber}
                  </strong>
                  <p>{selectedService}</p>
                </div>
              </article>

              <div className="schedule-list">
                {appointments.map((appointment) => (
                  <article className="appointment-card" key={`${appointment.time}-${appointment.client}`}>
                    <time>{appointment.time}</time>
                    <div>
                      <h3>{appointment.client}</h3>
                      <p>{appointment.service}</p>
                    </div>
                    <span>{appointment.barber}</span>
                    <strong>{appointment.status}</strong>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {section === "clube" && (
          <section className="screen" aria-labelledby="club-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Clube da barba</p>
                <h2 id="club-title">Assinatura com beneficios claros e operacao automatizada.</h2>
              </div>
              <span className="pill strong">184 membros</span>
            </div>

            <div className="club-layout">
              <article className="club-card">
                <span className="stamp">Rosa Club</span>
                <h3>Cliente Gold</h3>
                <p>Proximo corte liberado em 08/08. 2 creditos ativos e fila expressa habilitada.</p>
                <div className="progress-bar" aria-label="Progresso do ciclo do plano">
                  <span style={{ width: "68%" }} />
                </div>
              </article>
              <div className="benefit-grid">
                {clubBenefits.map((benefit) => (
                  <article className="benefit-card" key={benefit}>
                    <span aria-hidden="true">+</span>
                    <strong>{benefit}</strong>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {section === "planos" && (
          <section className="screen" aria-labelledby="plans-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Planos</p>
                <h2 id="plans-title">Venda recorrencia sem confundir o cliente.</h2>
              </div>
              <button className="ghost-button" type="button">
                Comparar planos
              </button>
            </div>

            <div className="plans-grid">
              {plans.map((plan) => (
                <article className={selectedPlan === plan.name ? "plan-card selected" : "plan-card"} key={plan.name}>
                  <span className="pill">{plan.tag}</span>
                  <h3>{plan.name}</h3>
                  <p>
                    <strong>{plan.price}</strong>
                    <span>{plan.cadence}</span>
                  </p>
                  <ul className="clean-list">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <button className="primary-button wide" type="button" onClick={() => setSelectedPlan(plan.name)}>
                    Selecionar
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {section === "perfil" && (
          <section className="screen" aria-labelledby="profile-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Perfil</p>
                <h2 id="profile-title">Dados, preferencia de corte e assinatura em um lugar.</h2>
              </div>
              <span className="pill strong">{selectedPlan}</span>
            </div>

            <div className="profile-grid">
              <article className="profile-main">
                <div className="avatar">MV</div>
                <div>
                  <h3>Marcos Vinicius</h3>
                  <p>Cliente desde janeiro de 2025</p>
                </div>
                <dl>
                  <div>
                    <dt>Telefone</dt>
                    <dd>(11) 98888-2211</dd>
                  </div>
                  <div>
                    <dt>Preferencia</dt>
                    <dd>Degrade baixo, topo texturizado</dd>
                  </div>
                  <div>
                    <dt>Pagamento</dt>
                    <dd>Cartao final 4421, recorrente</dd>
                  </div>
                </dl>
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <span>Historico recente</span>
                  <button className="icon-button small" type="button" title="Exportar historico">
                    v
                  </button>
                </div>
                <ul className="timeline">
                  <li>
                    <strong>28/07</strong>
                    Corte assinatura com Rosa
                  </li>
                  <li>
                    <strong>14/07</strong>
                    Barba premium com Rafa
                  </li>
                  <li>
                    <strong>30/06</strong>
                    Indicou um amigo e ganhou 20 pontos
                  </li>
                </ul>
              </article>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
