type TaskCardProps = {
  title: string;
  instructions: string;
  estimatedMinutes: number;
  state: "active" | "queued";
};

export function TaskCard({ title, instructions, estimatedMinutes, state }: TaskCardProps) {
  return (
    <article
      className={`rounded-[1.5rem] border p-5 shadow-sm ${
        state === "active" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-900"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className={`text-sm ${state === "active" ? "text-stone-200" : "text-stone-500"}`}>{estimatedMinutes} 分钟</span>
      </div>
      <p className={`mt-3 text-sm leading-6 ${state === "active" ? "text-stone-100" : "text-stone-600"}`}>
        {instructions}
      </p>
    </article>
  );
}
