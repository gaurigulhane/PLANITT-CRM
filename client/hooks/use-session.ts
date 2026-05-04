"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { normalizeErrorMessage } from "@/lib/error-message";
import type { CRMUser, UserRole } from "@/types/crm";

type UseSessionOptions = {
  redirectTo?: string;
  allowedRoles?: UserRole[];
};

export function useSession(options: UseSessionOptions = {}) {
  const router = useRouter();
  const { allowedRoles, redirectTo = "/login" } = options;
  const rolesKey = allowedRoles?.join(",") ?? "";
  const [user, setUser] = useState<CRMUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setError("");
    setLoading(true);
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        setError("");
        const currentUser = await apiGet<CRMUser>("/auth/me");

        if (!isMounted) {
          return;
        }

        if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
          router.replace("/dashboard");
          return;
        }

        setUser(currentUser);
      } catch (err) {
        const status =
          err && typeof err === "object" && "status" in err
            ? Number((err as { status?: number }).status)
            : undefined;
        const isNetworkFailure = status === 0;
        /** Only these mean the session cookie / token is no longer valid; everything else is transient or server-side. */
        const shouldInvalidateSession =
          status === 401 || status === 403 || status === 404;

        if (isNetworkFailure) {
          if (isMounted) {
            setUser(null);
            setError(
              normalizeErrorMessage(
                err,
                "Cannot reach the server. Check your connection and that the API is running."
              )
            );
          }
        } else if (shouldInvalidateSession) {
          clearToken();
          if (isMounted) {
            router.replace(redirectTo);
          }
        } else if (isMounted) {
          setUser(null);
          const fallback =
            status === 429
              ? "Too many requests. Please wait a moment, then use Try again."
              : status != null && status >= 500
                ? "The server had a problem loading your session. Try again in a moment."
                : "The server could not verify your session right now. Try again in a moment.";
          setError(normalizeErrorMessage(err, fallback));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [rolesKey, redirectTo, router, reloadKey]);

  return {
    user,
    loading,
    error,
    retry,
  };
}
