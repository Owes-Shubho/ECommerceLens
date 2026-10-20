import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-line-strong bg-surface-raised p-space-12 text-center">
      <h2 className="text-heading text-ink">This page does not exist</h2>
      <p className="mt-space-1 text-body-sm text-ink-muted">
        Check the address, or go back to the <Link to="/" className="text-link underline">Executive overview</Link>.
      </p>
    </div>
  );
}
