import { Navigate, useParams } from "react-router-dom";

/**
 * Redirect that carries route params across, which a bare `<Navigate>` cannot.
 *
 * `to` is a template containing `:param` placeholders, e.g.
 * "/workouts/edit/:code". Each is substituted from the matched route.
 * Values are re-encoded, so an exercise name with a space survives the hop.
 */
export function LegacyRedirect({ to }: { to: string }) {
  const params = useParams();

  const target = to.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) => {
    const value = params[key];
    return value ? encodeURIComponent(value) : "";
  });

  return <Navigate to={target} replace />;
}
