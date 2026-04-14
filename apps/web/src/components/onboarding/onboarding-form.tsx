"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { RoadmapGenerationDialog } from "@/components/onboarding/roadmap-generation-dialog";

const generationStepCount = 3;

function readStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const { errors, message } = payload as {
    errors?: {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
    };
    message?: string;
  };

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  const formError = errors?.formErrors?.find((item) => typeof item === "string" && item.trim().length > 0);

  if (formError) {
    return formError;
  }

  const fieldError = Object.values(errors?.fieldErrors ?? {}).find((value) => Array.isArray(value) && value.length > 0)?.[0];

  return typeof fieldError === "string" && fieldError.trim().length > 0 ? fieldError : null;
}

export function OnboardingForm() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPreview, setGenerationPreview] = useState({
    goalText: "",
    targetDeadline: "",
    weeklyTimeBudgetMinutes: ""
  });

  useEffect(() => {
    if (!isGenerating) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveStep((current) => (current < generationStepCount - 1 ? current + 1 : current));
    }, 1200);

    return () => window.clearInterval(timer);
  }, [isGenerating]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isGenerating) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      currentLevel: readStringValue(formData.get("currentLevel")),
      goalText: readStringValue(formData.get("goalText")),
      mbti: readStringValue(formData.get("mbti")),
      targetDeadline: readStringValue(formData.get("targetDeadline")),
      weeklyTimeBudgetMinutes: readStringValue(formData.get("weeklyTimeBudgetMinutes"))
    };

    setErrorMessage(null);
    setActiveStep(0);
    setGenerationPreview({
      goalText: payload.goalText,
      targetDeadline: payload.targetDeadline,
      weeklyTimeBudgetMinutes: payload.weeklyTimeBudgetMinutes
    });
    setIsGenerating(true);

    try {
      const response = await fetch("/api/onboarding", {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });

      const responseBody = (await response.json().catch(() => null)) as { redirectTo?: string } | null;

      if (!response.ok || !responseBody?.redirectTo) {
        throw new Error(extractErrorMessage(responseBody) ?? "生成路线图失败，请稍后再试。");
      }

      router.push(responseBody.redirectTo);
    } catch (error) {
      setIsGenerating(false);
      setErrorMessage(error instanceof Error ? error.message : "生成路线图失败，请稍后再试。");
    }
  }

  return (
    <>
      <RoadmapGenerationDialog
        activeStep={activeStep}
        goalText={generationPreview.goalText}
        isOpen={isGenerating}
        targetDeadline={generationPreview.targetDeadline}
        weeklyTimeBudgetMinutes={generationPreview.weeklyTimeBudgetMinutes}
      />

      <form className="space-y-6" onSubmit={handleSubmit}>
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

        {errorMessage ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-wait disabled:bg-stone-700"
          disabled={isGenerating}
          type="submit"
        >
          {isGenerating ? <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" /> : null}
          <span>{isGenerating ? "路线图生成中..." : "开始生成我的学习路线"}</span>
        </button>
      </form>
    </>
  );
}
