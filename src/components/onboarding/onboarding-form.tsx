export function OnboardingForm() {
  return (
    <form action="/api/onboarding" className="space-y-6" method="post">
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="goalText">
          学习目标
        </label>
        <textarea
          className="w-full rounded-xl border border-stone-300 px-4 py-3"
          id="goalText"
          name="goalText"
          placeholder="例如：我想学 Python 做 AI 应用"
          required
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="currentLevel">
          当前基础
        </label>
        <select
          className="w-full rounded-xl border border-stone-300 px-4 py-3"
          defaultValue="zero"
          id="currentLevel"
          name="currentLevel"
        >
          <option value="zero">零基础</option>
          <option value="some_programming">有一点编程基础</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="weeklyTimeBudgetMinutes">
          每周可投入时间
        </label>
        <input
          className="w-full rounded-xl border border-stone-300 px-4 py-3"
          id="weeklyTimeBudgetMinutes"
          min={30}
          name="weeklyTimeBudgetMinutes"
          required
          step={30}
          type="number"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="targetDeadline">
          目标截止时间
        </label>
        <input
          className="w-full rounded-xl border border-stone-300 px-4 py-3"
          id="targetDeadline"
          name="targetDeadline"
          required
          type="date"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="mbti">
          MBTI（可选）
        </label>
        <input
          className="w-full rounded-xl border border-stone-300 px-4 py-3"
          id="mbti"
          name="mbti"
          placeholder="例如：INFP"
          type="text"
        />
      </div>

      <button
        className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50"
        type="submit"
      >
        开始生成我的学习路线
      </button>
    </form>
  );
}
