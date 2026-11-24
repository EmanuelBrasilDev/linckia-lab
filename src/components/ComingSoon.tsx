export default function ComingSoon({ title }: { title: string }) {
  return (
    <section className="grid min-h-[70vh] place-items-center px-5 pt-24 text-center">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-muted">Esta página está em preparação.</p>
      </div>
    </section>
  );
}
