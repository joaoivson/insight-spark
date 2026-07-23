import { Navigate } from "react-router-dom";
import { tokenStorage, userStorage } from "@/shared/lib/storage";
import NotFound from "@/shared/pages/NotFound";

/** Gate do painel /admin — não-admin vê 404 (não 403). */
export function RequireAdmin({ element }: { element: JSX.Element }) {
  const token = tokenStorage.get();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const user = userStorage.get() as { is_admin?: boolean } | null;
  if (!user?.is_admin) {
    return <NotFound />;
  }

  return element;
}
