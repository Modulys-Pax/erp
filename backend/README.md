# Backend - ERP Transporte & Logística

## Setup

1. Instalar dependências:
```bash
npm install
```

2. Configurar variáveis de ambiente:
```bash
cp .env.example .env
# Editar .env com suas configurações
```

3. Configurar banco de dados:
```bash
# Gerar Prisma Client
npm run prisma:generate

# Criar migrations (você executará manualmente)
# npm run prisma:migrate
```

4. Iniciar servidor:
```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## Endpoints

- Health Check: `GET /health`
- Swagger: `GET /docs` (somente fora de `NODE_ENV=production`, ou com `SWAGGER_ENABLED=true`)

## Segurança (produção)

- **JWT_SECRET**: obrigatório, mínimo 32 caracteres; valores padrão de exemplo fazem a aplicação **não subir**.
- **Helmet**: headers HTTP endurecidos (CSP desligado na API para compatibilidade com Swagger em dev).
- **Rate limit**: global por IP (~180 req/min, ajustável via `THROTTLE_GLOBAL_LIMIT`); login/refresh mais restritos; `/health` sem limite.
- **Body JSON**: limite padrão `2mb` (`JSON_BODY_LIMIT`); uploads grandes continuam via multipart/Multer.

Ver `.env.example` para variáveis relacionadas.

## Estrutura

```
src/
├── modules/          # Módulos de negócio
├── shared/           # Código compartilhado
│   ├── prisma/       # Prisma Service
│   ├── config/       # Configurações
│   ├── guards/       # Guards (JWT, etc)
│   ├── decorators/   # Decorators customizados
│   ├── interceptors/ # Interceptors
│   └── security/     # Validação de ambiente na subida
├── main.ts           # Entry point
└── app.module.ts     # Módulo raiz
```
