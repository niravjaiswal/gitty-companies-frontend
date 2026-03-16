/**
 * Maps file extensions to VS Code codicon class names.
 * Used by both the file explorer tree and editor tabs.
 */

const extensionIconMap: Record<string, string> = {
  // TypeScript
  '.ts': 'codicon-symbol-method',
  '.tsx': 'codicon-symbol-method',
  // JavaScript
  '.js': 'codicon-symbol-event',
  '.jsx': 'codicon-symbol-event',
  // Web
  '.html': 'codicon-code',
  '.css': 'codicon-symbol-color',
  '.scss': 'codicon-symbol-color',
  // Data
  '.json': 'codicon-json',
  '.yaml': 'codicon-symbol-namespace',
  '.yml': 'codicon-symbol-namespace',
  '.xml': 'codicon-code',
  // Documentation
  '.md': 'codicon-markdown',
  '.txt': 'codicon-file-text',
  // Python
  '.py': 'codicon-symbol-misc',
  // Shell
  '.sh': 'codicon-terminal',
  '.bash': 'codicon-terminal',
  // Other languages
  '.rs': 'codicon-symbol-structure',
  '.go': 'codicon-symbol-structure',
  '.java': 'codicon-symbol-class',
  '.c': 'codicon-symbol-key',
  '.h': 'codicon-symbol-key',
  '.cpp': 'codicon-symbol-key',
  '.hpp': 'codicon-symbol-key',
  '.sql': 'codicon-database',
  // Config
  '.env': 'codicon-gear',
  '.gitignore': 'codicon-git-commit',
  '.lock': 'codicon-lock',
};

/** Special filenames that get their own icon */
const filenameIconMap: Record<string, string> = {
  'package.json': 'codicon-package',
  'tsconfig.json': 'codicon-settings-gear',
  '.gitignore': 'codicon-git-commit',
  'Dockerfile': 'codicon-server-environment',
  'docker-compose.yml': 'codicon-server-environment',
  'README.md': 'codicon-book',
};

/**
 * Returns the codicon CSS class for a given filename.
 * Checks special filenames first, then falls back to extension mapping.
 */
export function getFileIconClass(filename: string): string {
  if (filenameIconMap[filename]) {
    return filenameIconMap[filename];
  }
  const ext = filename.includes('.') ? '.' + filename.split('.').pop()! : '';
  return extensionIconMap[ext] || 'codicon-file';
}

/**
 * Returns the codicon CSS class for a folder (expanded or collapsed).
 */
export function getFolderIconClass(isExpanded: boolean): string {
  return isExpanded ? 'codicon-folder-opened' : 'codicon-folder';
}
