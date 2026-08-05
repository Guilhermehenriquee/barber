import type { Metadata } from "next";
import "./globals.css";

const title = "Rosa do Corte | Clube & Agenda";
const description =
  "Sistema web para barbearia por assinatura com login, planos, agenda, clube da barba e perfil do cliente.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://rosa-do-corte.sites.openai.com"),
  openGraph: {
    title,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
