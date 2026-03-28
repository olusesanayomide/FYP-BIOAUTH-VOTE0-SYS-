export interface StoredAdminUser {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  isRegistered?: boolean;
  permissions?: {
    isRegistered?: boolean;
    isSuperAdmin?: boolean;
  };
}

export const getStoredAdminUser = (): StoredAdminUser | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as StoredAdminUser;
  } catch {
    return null;
  }
};

export const isStoredSuperAdmin = (): boolean => {
  const user = getStoredAdminUser();
  if (!user) return false;

  const normalizedRole = String(user.role || "").trim().toLowerCase();
  return normalizedRole === "super_admin" || user.permissions?.isSuperAdmin === true;
};
