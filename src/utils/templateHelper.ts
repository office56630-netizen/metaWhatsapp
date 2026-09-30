import { WhatsAppTemplate } from '../types';

/**
 * Accurately and strictly extracts all variable placeholders from a Meta WhatsApp template.
 * Only parses placeholders standard and present in the active template body_text,
 * header_content, footer_text, and dynamic button URLs (e.g. {{1}}, {{2}}, or {{var_name}}).
 * Fallback to template.variables is only used if text contains no placeholders.
 */
export function getTemplateVariables(template: WhatsAppTemplate | null | undefined): string[] {
  if (!template) return [];

  const foundVars = new Set<string>();

  // 1. Scan body_text, header_content, and footer_text for {{variable}} patterns
  const allText = `${template.header_content || ''} ${template.body_text || ''} ${template.footer_text || ''}`;
  const regexMatches = allText.match(/\{\{([0-9a-zA-Z_]+)\}\}/g);
  if (regexMatches) {
    regexMatches.forEach((m) => {
      const cleanVar = m.replace(/[\{\}]/g, '').trim();
      if (cleanVar) {
        foundVars.add(cleanVar);
      }
    });
  }

  // 2. Scan dynamic button URLs (e.g. https://example.com/order/{{1}})
  if (Array.isArray(template.buttons)) {
    template.buttons.forEach((btn) => {
      if (btn.url) {
        const btnMatches = btn.url.match(/\{\{([0-9a-zA-Z_]+)\}\}/g);
        if (btnMatches) {
          btnMatches.forEach((m) => {
            const cleanVar = m.replace(/[\{\}]/g, '').trim();
            if (cleanVar) foundVars.add(cleanVar);
          });
        }
      }
    });
  }

  // 3. Fallback: only if template text has no placeholders, check template.variables
  if (foundVars.size === 0 && Array.isArray(template.variables) && template.variables.length > 0) {
    template.variables.forEach((v) => {
      if (v !== undefined && v !== null && String(v).trim()) {
        foundVars.add(String(v).trim());
      }
    });
  }

  const list = Array.from(foundVars);

  // Sort numerically if numeric keys (1, 2, 3...) or alphabetically
  return list.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
}

/**
 * Returns where a variable placeholder is positioned in the template
 */
export function getVariableContext(template: WhatsAppTemplate | null | undefined, varKey: string): string {
  if (!template) return 'Template Field';
  const tag = `{{${varKey}}}`;
  const locations: string[] = [];

  if (template.header_content && template.header_content.includes(tag)) {
    locations.push('Header');
  }
  if (template.body_text && template.body_text.includes(tag)) {
    locations.push('Message Body');
  }
  if (template.footer_text && template.footer_text.includes(tag)) {
    locations.push('Footer');
  }
  if (template.buttons && template.buttons.some((b) => b.url && b.url.includes(tag))) {
    locations.push('Button Link');
  }

  return locations.length > 0 ? locations.join(' & ') : 'Message Body';
}

/**
 * Substitute variables into template text for live visual preview
 */
export function renderTemplatePreview(
  bodyText: string,
  variables: Record<string, string> = {}
): string {
  if (!bodyText) return '';
  let rendered = bodyText;

  Object.entries(variables).forEach(([key, val]) => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\{\\{${escaped}\\}\\}`, 'g');
    rendered = rendered.replace(regex, val || `{{${key}}}`);
  });

  return rendered;
}
