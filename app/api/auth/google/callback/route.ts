import { completeGoogleAuth, jsonError } from "@/app/lib/backend";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return jsonError("Retorno do Google incompleto.", 400);
    }

    const result = await completeGoogleAuth(code, state, request.url);
    return Response.redirect(result.redirectTo, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao concluir Google.";
    return jsonError(message, 400);
  }
}
