import { jsonError, verifyTwoFactorChallenge } from "@/app/lib/backend";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      challengeId?: string;
      code?: string;
    };

    if (!payload.challengeId || !payload.code) {
      return jsonError("Informe o desafio e o codigo 2FA.", 400);
    }

    const session = await verifyTwoFactorChallenge(payload.challengeId, payload.code, request.url);
    return Response.json(
      { user: session.user },
      {
        status: 200,
        headers: {
          "Set-Cookie": session.cookie,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao verificar 2FA.";
    return jsonError(message, 401);
  }
}
