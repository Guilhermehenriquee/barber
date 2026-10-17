import { getSessionUser, getWorkspace, jsonError, todayInSaoPaulo } from "@/app/lib/backend";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || todayInSaoPaulo();
    const user = await getSessionUser(request);
    const slug = url.searchParams.get("slug") || user?.barberShopSlug;
    if (!slug) {
      return Response.json({ shop: null, user: null, services: [], professionals: [], clients: [], appointments: [], workingHours: [], metrics: null });
    }
    const workspace = await getWorkspace(slug, user, date);
    return Response.json(workspace);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar dados.";
    return jsonError(message, message.includes("Acesso negado") ? 403 : 500);
  }
}
