import type { DemoFile, DemoFolder } from './types';

export const initialFolders: DemoFolder[] = [
  { id: 'folder-001', name: 'Folder 001' },
  { id: 'product-resources', name: 'Product Resources' },
  { id: 'website-assets', name: 'Website Assets' },
];

const now = Date.now();
const day = 86_400_000;

export const initialFiles: DemoFile[] = [
  { id: 'backup-prompt', folderId: 'folder-001', name: 'backup-prompt.md', size: 869, modified: now - day * 4, mimeType: 'text/markdown', content: '# Back up a project\n\nCreate a reliable copy of the workspace before making structural changes.' },
  { id: 'folder-notes', folderId: 'folder-001', name: 'folder.md', size: 869, modified: now - day * 5, mimeType: 'text/markdown', content: '# Folder notes\n\nBeam keeps this folder available without downloading every file first.' },
  { id: 'getting-started', folderId: 'folder-001', name: 'getting-started.md', size: 278, modified: now - day * 5, mimeType: 'text/markdown', content: '# Getting started\n\nMount your Beam workspace, then open any file from your existing tools.' },
  { id: 'organize-thoughts', folderId: 'folder-001', name: 'organize-thoughts-prompt.md', size: 253, modified: now - day * 6, mimeType: 'text/markdown', content: '# Organize thoughts\n\nGroup related ideas and turn them into clear next steps.' },
  { id: 'brand-guidelines', folderId: 'product-resources', name: 'brand-guidelines.pdf', size: 42_000_000, modified: now - day * 2, mimeType: 'application/pdf', content: '# Beam brand guidelines\n\nUse the Beam mark with clear space around it and preserve the approved monochrome palette.\n\nHeadlines should feel direct, calm, and useful.' },
  { id: 'product-image', folderId: 'product-resources', name: 'product-overview.md', size: 1_680, modified: now - day * 3, mimeType: 'text/markdown', content: '# Product overview\n\nPrimary product notes prepared for launch materials and product documentation.' },
  { id: 'release-notes', folderId: 'product-resources', name: 'release-notes.md', size: 56_000, modified: now - day * 5, mimeType: 'text/markdown', content: '# Product release notes\n\nFaster mounting, clearer activity, and improved previews.' },
  { id: 'homepage-hero', folderId: 'website-assets', name: 'homepage-copy.md', size: 1_240, modified: now - day, mimeType: 'text/markdown', content: '# Homepage copy\n\nHero messaging for the Beam marketing website.' },
  { id: 'campaign-image', folderId: 'website-assets', name: 'campaign-brief.md', size: 980, modified: now - day * 4, mimeType: 'text/markdown', content: '# Campaign brief\n\nLaunch campaign notes for the current release.' },
  { id: 'logo-mark', folderId: 'website-assets', name: 'logo-guidelines.md', size: 640, modified: now - day * 6, mimeType: 'text/markdown', content: '# Logo guidelines\n\nApproved Beam logo guidance for product and marketing use.' },
];

export function formatBytes(bytes: number) {
  if (bytes < 1_000) return `${bytes}B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)}KB`;
  return `${Math.round(bytes / 1_000_000)}MB`;
}

export function formatModified(timestamp: number) {
  const days = Math.max(0, Math.round((Date.now() - timestamp) / day));
  if (days === 0) return 'Just now';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}
