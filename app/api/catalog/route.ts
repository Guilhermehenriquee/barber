import {
  createClient,
  createProfessional,
  createService,
  createWorkingHour,
  getSessionUser,
  jsonError,
} from "@/app/lib/backend";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return jsonError("Entre para cadastrar.", 401);

    const payload = (await request.json()) as {
      type?: "client" | "service" | "professional" | "workingHour";
      name?: string;
      phone?: string;
      email?: string;
      preferences?: string;
      description?: string;
      durationMinutes?: number;
      bufferMinutes?: number;
      priceCents?: number;
      publicName?: string;
      color?: string;
      professionalId?: string;
      weekday?: number;
      startTime?: string;
      endTime?: string;
      breakStart?: string;
      breakEnd?: string;
    };

    if (payload.type === "client") {
      if (!payload.name || !payload.phone) return jsonError("Informe nome e WhatsApp do cliente.", 400);
      const id = await createClient(user, {
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        preferences: payload.preferences,
      });
      return Response.json({ id }, { status: 201 });
    }

    if (payload.type === "service") {
      if (!payload.name || !payload.durationMinutes || payload.priceCents == null) {
        return jsonError("Informe nome, duracao e preco do servico.", 400);
      }
      const id = await createService(user, {
        name: payload.name,
        description: payload.description,
        durationMinutes: payload.durationMinutes,
        bufferMinutes: payload.bufferMinutes ?? 10,
        priceCents: payload.priceCents,
      });
      return Response.json({ id }, { status: 201 });
    }

    if (payload.type === "professional") {
      if (!payload.name || !payload.publicName) return jsonError("Informe nome do profissional.", 400);
      const id = await createProfessional(user, {
        name: payload.name,
        publicName: payload.publicName,
        color: payload.color,
      });
      return Response.json({ id }, { status: 201 });
    }

    if (payload.type === "workingHour") {
      if (!payload.professionalId || payload.weekday == null || !payload.startTime || !payload.endTime) {
        return jsonError("Informe profissional, dia e horario.", 400);
      }
      const id = await createWorkingHour(user, {
        professionalId: payload.professionalId,
        weekday: payload.weekday,
        startTime: payload.startTime,
        endTime: payload.endTime,
        breakStart: payload.breakStart,
        breakEnd: payload.breakEnd,
      });
      return Response.json({ id }, { status: 201 });
    }

    return jsonError("Tipo de cadastro invalido.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar.";
    return jsonError(message, 400);
  }
}
