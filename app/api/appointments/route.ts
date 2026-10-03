import {
  AppointmentStatus,
  createAppointment,
  getSessionUser,
  jsonError,
  updateAppointmentStatus,
} from "@/app/lib/backend";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return jsonError("Entre para agendar.", 401);
    const payload = (await request.json()) as Parameters<typeof createAppointment>[1];
    const id = await createAppointment(user, payload);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar agendamento.";
    return jsonError(message, 400);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return jsonError("Entre para alterar status.", 401);
    const payload = (await request.json()) as {
      id?: string;
      status?: AppointmentStatus;
    };
    if (!payload.id || !payload.status) return jsonError("Informe agendamento e status.", 400);
    const id = await updateAppointmentStatus(user, payload.id, payload.status);
    return Response.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao alterar status.";
    return jsonError(message, 400);
  }
}
