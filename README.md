# AI Learning Assistant MVP

一个基于 Next.js App Router 的 AI 学习助手 MVP。当前 v0 只支持单一路径 `python_for_ai_workflows`，覆盖 onboarding、roadmap、today lesson、lesson regeneration 和基础进度流转。

## Stack

- Next.js 15 + React 19
- TypeScript
- Tailwind CSS
- Prisma + SQLite
- Zod
- Vitest + React Testing Library
- Playwright

## Setup

1. 使用 Node 22。
2. 安装依赖：

   ```bash
   pnpm install
   ```

3. 生成 Prisma Client：

   ```bash
   pnpm prisma generate
   ```

4. 初始化本地数据库：

   ```bash
   pnpm prisma db push
   ```

5. 安装 Playwright Chromium：

   ```bash
   pnpm exec playwright install chromium
   ```

## Environment Variables

在项目根目录创建 `.env`：

```bash
DATABASE_URL="file:./prisma/dev.db"
OPENAI_API_KEY=""
```

- `DATABASE_URL`: 本地 SQLite 数据库地址。
- `OPENAI_API_KEY`: 目前为可选，预留给后续真实 AI 调用。

## Run Commands

开发服务器：

```bash
pnpm dev
```

单元测试：

```bash
pnpm vitest run
```

E2E 冒烟测试：

```bash
pnpm playwright test
```

生产构建：

```bash
pnpm build
```

Lint：

```bash
pnpm lint
```
