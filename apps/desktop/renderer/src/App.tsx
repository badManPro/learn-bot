import { useEffect, useState } from "react";

type SessionState = {
  status: string;
  workspaceId: string | null;
  accountLabel: string | null;
  loginHint: string;
};

type PlanPreview = {
  status: string;
  message: string;
  supportedDomainIds: string[];
};

export default function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanPreview | null>(null);

  useEffect(() => {
    void window.desktopApi.auth.session.get().then((value) => setSession(value as SessionState));
    void window.desktopApi.plan.generate().then((value) => setPlanPreview(value as PlanPreview));
  }, []);

  return (
    <main className="min-h-screen bg-stone-950 px-8 py-10 text-stone-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Learn Bot Desktop</p>
          <h1 className="text-4xl font-semibold">Phase 1 desktop shell</h1>
          <p className="max-w-2xl text-sm leading-6 text-stone-300">
            This window proves the Electron shell, preload API, and mocked orchestration boundaries are wired.
          </p>
        </header>

        <section className="rounded-[1.75rem] border border-stone-800 bg-stone-900/70 p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-lg font-medium">Auth boundary</h2>
              <p className="text-sm text-stone-300">
                Status: <span className="font-medium text-white">{session?.status ?? "loading"}</span>
              </p>
              <p className="text-sm text-stone-400">{session?.loginHint ?? "Loading desktop session..."}</p>
            </div>
            <button
              className="rounded-full border border-stone-700 bg-stone-100 px-5 py-3 text-sm font-medium text-stone-950"
              onClick={() => void window.desktopApi.auth.login().then((value) => setSession(value as SessionState))}
              type="button"
            >
              Login with ChatGPT
            </button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-stone-800 bg-stone-900/70 p-6">
          <h2 className="text-lg font-medium">Phase 1 orchestration preview</h2>
          <p className="mt-3 text-sm text-stone-300">{planPreview?.message ?? "Loading plan preview..."}</p>
          <ul className="mt-4 flex flex-wrap gap-3 text-sm text-stone-200">
            {planPreview?.supportedDomainIds.map((domainId) => (
              <li className="rounded-full border border-stone-700 px-3 py-2" key={domainId}>
                {domainId}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
