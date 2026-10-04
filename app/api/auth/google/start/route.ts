import { getGoogleAuthStart, jsonError } from "@/app/lib/backend";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      slug?: string;
      mode?: "login" | "register";
    };

    if (!payload.slug) {
      return jsonError("Informe o slug da barbearia.", 400);
    }

    return Response.json(getGoogleAuthStart(payload.slug, payload.mode ?? "register", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao iniciar Google.";
    return jsonError(message, 400);
  }
}
