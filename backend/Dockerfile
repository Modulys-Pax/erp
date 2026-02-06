# ============================================
# Dockerfile - Backend NestJS
# Otimizado para produção com multi-stage build
# ============================================

# Stage 1: Builder
FROM node:20-slim AS builder
WORKDIR /app

# Instalar dependências do sistema para sharp e bcrypt
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar package.json e instalar todas as dependências
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS production
WORKDIR /app

# Criar usuário não-root para segurança
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nestjs

# Instalar dependências de runtime e dumb-init
RUN apt-get update && apt-get install -y \
    dumb-init \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copiar package.json e instalar apenas dependências de produção
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

# Gerar Prisma Client
RUN npx prisma generate

# Copiar arquivos do build
COPY --from=builder /app/dist ./dist

# Criar diretório de uploads com permissões corretas
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3001

# Mudar para usuário não-root
USER nestjs

# Expor porta
EXPOSE 3001

# Usar dumb-init para gerenciamento de processos
ENTRYPOINT ["dumb-init", "--"]

# Rodar migrations e depois iniciar a aplicação (DATABASE_URL deve estar definida)
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/main.js"]
