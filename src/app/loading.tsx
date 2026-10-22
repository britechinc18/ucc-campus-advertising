export default function LoadingPage() {
  return (
    <main id="main" className="container route-skeleton" aria-busy="true">
      <p className="sr-only" role="status">
        Loading the marketplace…
      </p>
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-search" />
      <div className="listing-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="skeleton skeleton-photo" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        ))}
      </div>
    </main>
  );
}
