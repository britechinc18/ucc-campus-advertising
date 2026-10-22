export default function CampusLoading() {
  return (
    <main id="main" className="container route-skeleton" aria-busy="true">
      <p className="sr-only" role="status">
        Loading Campus 360…
      </p>
      <div className="skeleton skeleton-heading" />
      <div className="campus-banners" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: 22 }} />
        ))}
      </div>
      <div className="skeleton skeleton-search" style={{ marginTop: 35 }} />
    </main>
  );
}
