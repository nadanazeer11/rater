export type TemplateVars = Record<string, string>;

export const TEMPLATE_TOKENS = [
  'name',
  'location',
  'business',
  'rate_link',
] as const;

export type TemplateToken = (typeof TEMPLATE_TOKENS)[number];

const TOKEN_RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

export function renderTemplate(tpl: string, vars: TemplateVars): string {
  return tpl.replace(TOKEN_RE, (_m, key: string) => vars[key] ?? `{{${key}}}`);
}
