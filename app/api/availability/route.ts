import { jsonError, listAvailability, todayInSaoPaulo } from "@/app/lib/backend";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "rosa-do-corte";
    const serviceId = url.searchParams.get("serviceId");
    const professionalId = url.searchParams.get("professionalId") || "any";
    const date = url.searchParams.get("date") || todayInSaoPaulo();

    if (!serviceId) return jsonError("Escolha um servico para ver horarios.", 400);

    const slots = await listAvailability(slug, serviceId, professionalId, date);
    return Response.json({ slots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao calcular horarios.";
    return jsonError(message, 500);
  }
}
