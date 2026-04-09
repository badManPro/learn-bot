# AI Learning Assistant MVP

一个桌面优先的 Electron AI 学习助手实验项目。当前 `python_for_ai_workflows` 与 `piano_foundations` 已支持 roadmap、lesson、replan 的真实 structured-output AI runtime；`drawing_foundations` 仍保持 roadmap-only。旧的 Next.js web 路径仍在仓库里，但已经降级为显式 legacy 入口，不再占默认启动位。

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
OPENAI_API_KEY="sk-..."
```

- `DATABASE_URL`: 本地 SQLite 数据库地址。
- `OPENAI_API_KEY`: web 与 desktop 的真实 AI runtime 都需要它；未配置时只会返回显式错误，不再回退到旧的 deterministic preview。

## Run Commands

默认开发启动：

```bash
pnpm dev
```

这会直接启动 Electron 桌面壳，而不是 web dev server。

桌面构建：

```bash
pnpm build
```

桌面 lint：

```bash
pnpm lint
```

Legacy web 开发：

```bash
pnpm dev:legacy-web
```

Legacy web 单元测试：

```bash
pnpm test:web
```

Legacy web E2E 冒烟测试：

```bash
pnpm test:e2e
```

如果只想生成 Prisma Client 或推本地 SQLite schema，继续使用 `pnpm prisma:generate` 和 `pnpm prisma:push`。
