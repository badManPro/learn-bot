type RegenerationBannerProps = {
  message: string;
};

export function RegenerationBanner({ message }: RegenerationBannerProps) {
  return (
    <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
      <p className="font-medium">Lesson Regenerated</p>
      <p className="mt-2 leading-6">{message}</p>
    </section>
  );
}
