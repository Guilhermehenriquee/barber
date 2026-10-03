import { getSessionUser, jsonError } from "@/app/lib/backend";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    return Response.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sessao indisponivel.";
    return jsonError(message, 500);
  }
}
