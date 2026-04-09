type QuizCardProps = {
  question: string;
  options: string[];
};

export function QuizCard({ question, options }: QuizCardProps) {
  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Lesson Quiz</p>
      <h3 className="mt-3 text-xl font-semibold text-stone-900">{question}</h3>
      <ul className="mt-4 space-y-3 text-sm text-stone-600">
        {options.map((option) => (
          <li className="rounded-2xl border border-stone-200 px-4 py-3" key={option}>
            {option}
          </li>
        ))}
      </ul>
    </section>
  );
}
