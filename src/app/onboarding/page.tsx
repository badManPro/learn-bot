import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">AI Learning Assistant</p>
        <h1 className="text-4xl font-semibold text-stone-900">先告诉我你的目标，我来拆出 30 天路线。</h1>
        <p className="max-w-2xl text-base text-stone-600">
          只填最少的信息。首版只支持 Python for AI / AI 自动化方向，但会把今天该做什么拆到足够具体。
        </p>
      </div>

      <div className="mt-10 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <OnboardingForm />
      </div>
    </main>
  );
}
