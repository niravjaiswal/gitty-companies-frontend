export interface AssessmentBriefSections {
  overview: string;
  companyCodebase: string;
  parts: string[];
}

function getSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`## ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = markdown.match(pattern);
  return match?.[1]?.trim() ?? '';
}

export function partLabel(index: number): string {
  return `Part ${String.fromCharCode(65 + index)}`;
}

export function buildAssessmentBrief(input: {
  overview: string;
  companyCodebase: string;
  parts: string[];
}): string {
  const overview = input.overview.trim();
  const companyCodebase = input.companyCodebase.trim();
  const parts = input.parts.map((part) => part.trim());

  const lines: string[] = ['# Gitty Sprint', '', '## Overview', '', overview, '', '## Company codebase', '', companyCodebase];
  parts.forEach((part, index) => {
    lines.push('', `## ${partLabel(index)}`, '', part);
  });

  return lines.join('\n').trimEnd() + '\n';
}

export function parseAssessmentBrief(markdown: string): AssessmentBriefSections {
  const overview = getSection(markdown, 'Overview');
  const companyCodebase = getSection(markdown, 'Company codebase');

  const parts: string[] = [];
  for (let index = 0; index < 26; index += 1) {
    const content = getSection(markdown, partLabel(index));
    if (!content && index > 0) break;
    parts.push(content);
  }
  if (parts.length === 0) parts.push('');

  return { overview, companyCodebase, parts };
}
