import Link from "next/link";

import { ROUTES } from "@/lib/routes";

export default function HomePage() {
  return <Link href={ROUTES.onboarding}>开始</Link>;
}
