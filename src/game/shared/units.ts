/** Spin is stored in RPM; the HUD shows it rounded to tens. */
export function formatRpm(spin: number): string {
  return `${Math.max(0, Math.round(spin / 10) * 10)} RPM`;
}

export function fillTemplate(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}
