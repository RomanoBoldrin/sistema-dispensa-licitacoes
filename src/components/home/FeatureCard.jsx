export default function FeatureCard({ icon, title, description }) {
  return (
    <div className="flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-primary-container">
        <span aria-hidden="true" className="material-symbols-outlined">
          {icon}
        </span>
      </div>

      <h3 className="font-headline-sm text-on-surface">{title}</h3>

      <p className="font-body-sm text-on-surface-variant">{description}</p>
    </div>
  );
}
