export interface AssessmentBriefSections {
  overview: string;
  companyCodebase: string;
  partA: string;
  partB: string;
}

function getSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`## ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = markdown.match(pattern);
  return match?.[1]?.trim() ?? '';
}

export function buildAssessmentBrief(input: {
  overview: string;
  companyCodebase: string;
  partA: string;
  partB: string;
}): string {
  const overview = input.overview.trim();
  const companyCodebase = input.companyCodebase.trim();
  const partA = input.partA.trim();
  const partB = input.partB.trim();

  return `# Gitty Sprint

## Overview

${overview}

## Company codebase

${companyCodebase}

## Part A

${partA}

## Part B

${partB}
`.trim();
}

export function parseAssessmentBrief(markdown: string): AssessmentBriefSections {
  return {
    overview: getSection(markdown, 'Overview'),
    companyCodebase: getSection(markdown, 'Company codebase'),
    partA: getSection(markdown, 'Part A'),
    partB: getSection(markdown, 'Part B'),
  };
}
