'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { APP_DISPLAY_NAME } from '@/lib/constants/branding.constants';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      const backendMessage = axiosErr?.response?.data?.message;
      const status = axiosErr?.response?.status;

      if (status === 401 && backendMessage) {
        setError(backendMessage);
      } else if (backendMessage) {
        setError(backendMessage);
      } else {
        setError('Erro ao conectar. Verifique sua conexão e tente novamente.');
      }
    }
  };

  return (
    <div className="login-page-bg relative min-h-screen w-full overflow-hidden">
      {/* Vinheta leve nas bordas — profundidade sem poluir */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.65)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.55)_100%)]"
        aria-hidden
      />
      {/* Reforço sutil de profundidade (blobs) */}
      <div
        className="pointer-events-none absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-primary/[0.07] blur-3xl dark:bg-primary/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-[360px] w-[360px] rounded-full bg-primary/[0.05] blur-3xl dark:bg-primary/10"
        aria-hidden
      />

      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary/80" aria-hidden />
          <p className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {APP_DISPLAY_NAME}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Acesso ao sistema</p>
        </div>

        <Card className="w-full max-w-[440px] border border-border/80 bg-card/90 shadow-xl shadow-black/5 backdrop-blur-md dark:bg-card/85 dark:shadow-black/25">
          <div className="h-1 rounded-t-xl bg-gradient-to-r from-primary/80 via-primary to-primary/80" />
          <CardHeader className="space-y-1 pb-4 pt-6">
            <CardTitle className="text-xl font-semibold tracking-tight">Entrar</CardTitle>
            <CardDescription>Informe suas credenciais para acessar o painel.</CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive dark:bg-destructive/15 dark:text-red-200"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="h-11 bg-background/60"
                  {...register('email')}
                  disabled={isSubmitting || isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 bg-background/60"
                  {...register('password')}
                  disabled={isSubmitting || isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full font-semibold" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-10 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
          Uso restrito a usuários autorizados.
        </p>
      </div>
    </div>
  );
}
