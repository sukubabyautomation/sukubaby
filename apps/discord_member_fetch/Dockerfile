FROM node:20

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/common/package.json packages/common/package.json
COPY apps/discord_member_fetch/package.json apps/discord_member_fetch/package.json

RUN pnpm install --frozen-lockfile

COPY packages/common packages/common
COPY apps/discord_member_fetch apps/discord_member_fetch

ENV PORT=8080

WORKDIR /app/apps/discord_member_fetch

CMD ["pnpm", "start"]
