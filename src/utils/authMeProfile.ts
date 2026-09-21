export interface AuthMeBranch {
  id?: number | string;
  branch_id?: number | string;
  branch_code?: string;
  code?: string;
  name?: string;
  branch_name?: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  branch_type?: string;
  type?: string;
  logo_url?: string;
  logo?: string;
  image?: string;
  status?: string;
  is_active?: boolean;
  created_at?: string;
  created_on?: string;
  updated_at?: string;
  updated_on?: string;
  [k: string]: unknown;
}

export interface AuthMeResponse {
  success?: boolean;
  data?: Record<string, unknown>;
  result?: Record<string, unknown>;
  results?: Record<string, unknown>;
  user?: Record<string, unknown>;
  branch?: AuthMeBranch;
  id?: number | string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  [k: string]: unknown;
}

export function getBranchFromMe(payload: AuthMeResponse | null): AuthMeBranch {
  if (!payload) return {};
  if (payload.branch && typeof payload.branch === "object") return payload.branch;
  const data = payload.data as Record<string, unknown> | undefined;
  if (data?.branch && typeof data.branch === "object") return data.branch as AuthMeBranch;
  const inner = (payload.data ?? payload.results ?? payload.result ?? payload) as AuthMeBranch;
  if (inner && typeof inner === "object" && (inner.branch_name || inner.name || inner.id)) return inner;
  return {};
}

export function getUserFromMe(payload: AuthMeResponse | null): Record<string, unknown> {
  if (!payload) return {};
  if (payload.user && typeof payload.user === "object") return payload.user;
  const inner = (payload.data ?? payload.results ?? payload.result) as Record<string, unknown> | undefined;
  if (inner?.user && typeof inner.user === "object") return inner.user as Record<string, unknown>;
  return {
    id: payload.id,
    name: payload.name,
    username: payload.username,
    email: payload.email,
    phone: payload.phone,
  };
}

export function resolveProfileDisplay(payload: AuthMeResponse | null) {
  const branch = getBranchFromMe(payload);
  const user = getUserFromMe(payload);

  const branchName = String(branch.name ?? branch.branch_name ?? user.branch_name ?? "").trim();
  const ownerName = String(branch.owner_name ?? user.name ?? user.full_name ?? "").trim();
  const email = String(branch.email ?? user.email ?? "").trim();
  const profileImage = String(
    branch.logo_url ?? branch.logo ?? branch.image ?? user.avatar ?? user.profile_image ?? user.logo ?? "",
  ).trim();

  return {
    branchName,
    ownerName,
    displayName: branchName || ownerName || "Branch",
    email,
    profileImage,
    branch,
    user,
  };
}
