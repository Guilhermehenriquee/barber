import { getSessionUser, getWorkspace, jsonError, todayInSaoPaulo } from "@/app/lib/backend";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug") || "rosa-do-corte";
    const date = url.searchParams.get("date") || todayInSaoPaulo();
    const user = await getSessionUser(request);
    const workspace = await getWorkspace(slug, user, date);
    return Response.json(workspace);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar dados.";
    return jsonError(message, message.includes("Acesso negado") ? 403 : 500);
  }
}
