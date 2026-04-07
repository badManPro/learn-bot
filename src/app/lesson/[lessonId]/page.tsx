import { LessonShell } from "@/components/lesson/lesson-shell";
import { getLessonPreview } from "@/lib/ai/lesson-generator";

type LessonPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  const lesson = getLessonPreview();

  return <LessonShell key={lessonId} lesson={lesson} />;
}
