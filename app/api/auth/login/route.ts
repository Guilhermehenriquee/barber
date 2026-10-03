import { jsonError, loginWithPassword } from "@/app/lib/backend";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      slug?: string;
      email?: string;
      password?: string;
    };

    if (!payload.slug || !payload.email || !payload.password) {
      return jsonError("Informe barbearia, e-mail e senha.", 400);
    }

    const session = await loginWithPassword(payload.slug, payload.email, payload.password, request.url);
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
    const message = error instanceof Error ? error.message : "Falha ao entrar.";
    return jsonError(message, 401);
  }
}
