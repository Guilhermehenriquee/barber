import { jsonError, logout } from "@/app/lib/backend";

export async function POST(request: Request) {
  try {
    const cookie = await logout(request);
    return Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": cookie,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sair.";
    return jsonError(message, 500);
  }
}
