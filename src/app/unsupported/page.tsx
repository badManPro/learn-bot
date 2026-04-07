import Link from "next/link";

import { ROUTES } from "@/lib/routes";

export default function UnsupportedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Unsupported Goal</p>
        <h1 className="mt-4 text-4xl font-semibold text-stone-900">当前目标暂时不在首版支持范围内。</h1>
        <p className="mt-4 text-base text-stone-600">
          现在只支持 Python for AI、AI 自动化和工作流方向，不会为其它目标假装生成一条路线。
        </p>
        <Link
          className="mt-8 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white"
          href={ROUTES.onboarding}
        >
          返回重新填写
        </Link>
      </div>
    </main>
  );
}
