import { getTwoFactorChallenge, jsonError } from "@/app/lib/backend";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return jsonError("Informe o desafio 2FA.", 400);
    }

    return Response.json({ challenge: await getTwoFactorChallenge(id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar 2FA.";
    return jsonError(message, 400);
  }
}
