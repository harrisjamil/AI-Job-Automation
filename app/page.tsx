export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          AI Job Automation
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Find and apply to jobs faster
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-zinc-600">
          Automate your job search with AI — discover roles, tailor applications,
          and track progress in one place.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Get started
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            Learn more
          </button>
        </div>
      </main>
    </div>
  );
}
