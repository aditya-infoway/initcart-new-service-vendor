export interface Group {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

export interface GroupFormValues {
  name: string;
  description: string;
}

export function mapApiGroup(raw: Record<string, any>): Group {
  return {
    id: Number(raw.id ?? 0),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    createdAt: String(raw.created_at ?? ""),
  };
}

export function buildGroupPayload(values: GroupFormValues) {
  return {
    name: values.name,
    description: values.description,
  };
}
