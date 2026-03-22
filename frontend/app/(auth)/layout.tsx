export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /** Tela de auth controla o próprio layout (ex.: login em duas colunas em telas grandes). */
  return <div className="min-h-screen w-full">{children}</div>;
}
