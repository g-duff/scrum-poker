export function resolveDisplayName(
  name: string,
  existingNames: string[],
): string {
  const taken = new Set(existingNames.map((existing) => existing.toLowerCase()));
  if (!taken.has(name.toLowerCase())) {
    return name;
  }

  let suffix = 2;
  while (taken.has(`${name} (${suffix.toString()})`.toLowerCase())) {
    suffix += 1;
  }
  return `${name} (${suffix.toString()})`;
}
