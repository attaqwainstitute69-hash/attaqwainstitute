import type { ReactNode } from "react";

// Navy gradient page header with the sunrise strip, as on /reviews and /courses.
export function PageHero({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <section className="bg-hero text-white">
      <div className="hero-rise mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 py-12 md:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
          <p className="mt-3 text-white/80">{intro}</p>
        </div>
        {children}
      </div>
      <div aria-hidden="true" className="h-1 bg-sunrise" />
    </section>
  );
}
