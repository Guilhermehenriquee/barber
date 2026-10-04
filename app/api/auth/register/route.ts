import { jsonError, registerClientAccount } from "@/app/lib/backend";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      slug?: string;
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    if (!payload.slug || !payload.name || !payload.email || !payload.phone || !payload.password) {
      return jsonError("Informe barbearia, nome, e-mail, WhatsApp e senha.", 400);
    }

    const pending = await registerClientAccount({
      slug: payload.slug,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
    });
    return Response.json(pending, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar.";
    return jsonError(message, 400);
  }
}
