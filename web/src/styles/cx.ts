export function cx(
  ...classNames: (string | undefined | false | null)[]
): string {
  return classNames.filter((name): name is string => Boolean(name)).join(' ');
}
