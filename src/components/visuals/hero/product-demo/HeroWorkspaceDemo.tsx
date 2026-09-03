import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronDown,
  Download,
  File,
  FileText,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Search,
  Share2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { formatBytes, formatModified, initialFiles, initialFolders } from './heroDemoData';
import type { DemoFile, DemoFolder, PreviewState, UploadItem } from './types';
import personalLogo from '../../../../assets/brand/personal.svg';
import { PdfPreview } from './PdfPreview';
import styles from './HeroWorkspaceDemo.module.css';

const supportedExtensions = ['md', 'txt', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'];

type DemoWorkspace = {
  id: 'personal' | 'company-xyz' | 'company-abc';
  name: string;
  initials?: string;
};

type DemoWorkspaceContent = {
  folders: DemoFolder[];
  files: DemoFile[];
};

type SearchFilter = 'all' | 'folder' | 'file';

const demoWorkspaces: DemoWorkspace[] = [
  { id: 'personal', name: 'Personal' },
  { id: 'company-xyz', name: 'Company XYZ', initials: 'XY' },
  { id: 'company-abc', name: 'Company ABC', initials: 'AB' },
];

const companyWorkspaceSeeds: Record<Exclude<DemoWorkspace['id'], 'personal'>, DemoWorkspaceContent> = {
  'company-xyz': {
    folders: [
      { id: 'xyz-product', name: 'Product' },
      { id: 'xyz-engineering', name: 'Engineering' },
      { id: 'xyz-launch', name: 'Launch Assets' },
    ],
    files: [
      { id: 'xyz-roadmap', folderId: 'xyz-product', name: 'roadmap.md', size: 1840, modified: Date.now() - 86_400_000, mimeType: 'text/markdown', content: '# Product roadmap\n\nCurrent priorities, owners, and launch milestones for Company XYZ.' },
      { id: 'xyz-spec', folderId: 'xyz-product', name: 'workspace-spec.md', size: 2920, modified: Date.now() - 172_800_000, mimeType: 'text/markdown', content: '# Workspace specification\n\nShared product requirements available to every collaborator.' },
      { id: 'xyz-readme', folderId: 'xyz-engineering', name: 'README.md', size: 1260, modified: Date.now() - 259_200_000, mimeType: 'text/markdown', content: '# Company XYZ engineering\n\nDevelopment notes and setup instructions for the team.' },
      { id: 'xyz-checklist', folderId: 'xyz-launch', name: 'launch-checklist.md', size: 980, modified: Date.now() - 345_600_000, mimeType: 'text/markdown', content: '# Launch checklist\n\nFinal campaign, product, and deployment checks.' },
    ],
  },
  'company-abc': {
    folders: [
      { id: 'abc-client', name: 'Client Work' },
      { id: 'abc-design', name: 'Design System' },
      { id: 'abc-operations', name: 'Operations' },
    ],
    files: [
      { id: 'abc-brief', folderId: 'abc-client', name: 'project-brief.md', size: 2140, modified: Date.now() - 86_400_000, mimeType: 'text/markdown', content: '# Project brief\n\nGoals, deliverables, and working agreements for the client project.' },
      { id: 'abc-tokens', folderId: 'abc-design', name: 'design-tokens.md', size: 1740, modified: Date.now() - 172_800_000, mimeType: 'text/markdown', content: '# Design tokens\n\nShared color, type, spacing, and motion decisions.' },
      { id: 'abc-runbook', folderId: 'abc-operations', name: 'release-runbook.md', size: 2480, modified: Date.now() - 259_200_000, mimeType: 'text/markdown', content: '# Release runbook\n\nA reliable sequence for preparing and shipping each release.' },
    ],
  },
};

function initialWorkspaceContent(workspaceId: DemoWorkspace['id']): DemoWorkspaceContent {
  const seed = workspaceId === 'personal'
    ? { folders: initialFolders, files: initialFiles }
    : companyWorkspaceSeeds[workspaceId];
  return {
    folders: seed.folders.map((folder) => ({ ...folder })),
    files: seed.files.map((file) => ({ ...file })),
  };
}

function BeamMark() {
  return <img className={styles.beamMark} src={personalLogo} alt="" aria-hidden="true" />;
}

function WorkspaceAvatar({ workspace }: { workspace: DemoWorkspace }) {
  if (workspace.id === 'personal') return <span className={styles.workspaceAvatar}><BeamMark /></span>;
  return <span className={styles.workspaceAvatar}><img src={`/assets/hero/demo/workspace-menu-${workspace.id === 'company-xyz' ? 'xyz' : 'abc'}.svg`} alt="" /></span>;
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

function RowMenu({ onOpen, onRename, onShare, onDownload, onDelete }: {
  onOpen: () => void;
  onRename?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={styles.rowMenu} role="menu">
      <button type="button" onClick={onOpen}><FileText size={12} />Open</button>
      {onRename && <button type="button" onClick={onRename}><Pencil size={12} />Rename</button>}
      {onShare && <button type="button" onClick={onShare}><Share2 size={12} />Share</button>}
      {onDownload && <button type="button" onClick={onDownload}><Download size={12} />Download</button>}
      <button className={styles.dangerAction} type="button" onClick={onDelete}><Trash2 size={12} />Delete</button>
    </div>
  );
}

export function HeroWorkspaceDemo() {
  const [workspaceId, setWorkspaceId] = useState<DemoWorkspace['id']>('personal');
  const initialContent = initialWorkspaceContent('personal');
  const [folders, setFolders] = useState<DemoFolder[]>(initialContent.folders);
  const [files, setFiles] = useState<DemoFile[]>(initialContent.files);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [folderDialog, setFolderDialog] = useState<'rename' | null>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [folderCreateError, setFolderCreateError] = useState('');
  const [folderDraft, setFolderDraft] = useState('');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' });
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const previewUrlRef = useRef<string>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const newFolderRowRef = useRef<HTMLDivElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const workspaceCacheRef = useRef<Record<string, DemoWorkspaceContent>>({
    personal: initialContent,
  });

  const activeWorkspace = demoWorkspaces.find((workspace) => workspace.id === workspaceId) ?? demoWorkspaces[0];
  const activeFolder = folders.find((folder) => folder.id === folderId);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleFolders = useMemo(() => folders.filter((folder) => folder.name.toLowerCase().includes(normalizedQuery)), [folders, normalizedQuery]);
  const visibleFiles = useMemo(() => files.filter((file) => normalizedQuery
    ? file.name.toLowerCase().includes(normalizedQuery) || folders.find((folder) => folder.id === file.folderId)?.name.toLowerCase().includes(normalizedQuery)
    : file.folderId === folderId), [files, folderId, folders, normalizedQuery]);
  const searchedFolders = searchFilter === 'file' ? [] : visibleFolders;
  const searchedFiles = searchFilter === 'folder' ? [] : visibleFiles;
  const storageUsed = files.reduce((total, file) => total + file.size, 0);
  const uploadTotalBytes = uploads.reduce((total, item) => total + Math.max(1, item.file.size), 0);
  const uploadTransferredBytes = uploads.reduce((total, item) => total + Math.max(1, item.file.size) * (item.progress / 100), 0);
  const uploadProgress = uploadTotalBytes ? Math.min(100, (uploadTransferredBytes / uploadTotalBytes) * 100) : 0;
  const uploadsComplete = uploads.length > 0 && uploads.every((item) => item.state === 'complete');
  const uploadInProgress = uploads.some((item) => item.state === 'uploading' || (item.state === 'paused' && item.progress < 100));
  const uploadsPaused = uploads.some((item) => item.state === 'paused' && item.progress < 100) && !uploads.some((item) => item.state === 'uploading');
  const uploadsFailed = uploads.some((item) => item.state === 'error');

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuId(null);
        setIsWorkspaceMenuOpen(false);
        setIsNewFolderOpen(false);
        setFolderDraft('');
        setFolderCreateError('');
        setFolderDialog(null);
        setPreview({ status: 'idle' });
      }

      if (event.key === '/' && !(event.target instanceof HTMLInputElement)) {
        const bounds = searchInputRef.current?.getBoundingClientRect();
        if (bounds && bounds.bottom > 0 && bounds.top < window.innerHeight) {
          event.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    }
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  useEffect(() => {
    if (!isNewFolderOpen) return;
    newFolderInputRef.current?.focus();
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!newFolderRowRef.current?.contains(event.target as Node) && !folderDraft.trim()) {
        setIsNewFolderOpen(false);
        setFolderCreateError('');
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [folderDraft, isNewFolderOpen]);

  useEffect(() => {
    if (!uploads.some((item) => item.state === 'uploading')) return;
    const interval = window.setInterval(() => {
      setUploads((current) => current.map((item) => item.state === 'uploading' ? { ...item, progress: Math.min(100, item.progress + 7) } : item));
    }, 120);
    return () => window.clearInterval(interval);
  }, [uploads]);

  useEffect(() => {
    const completed = uploads.filter((item) => item.state === 'uploading' && item.progress >= 100);
    if (!completed.length) return;
    const targetFolder = folderId ?? folders[0]?.id;
    if (!targetFolder) return;
    setFiles((current) => {
      const additions = completed
        .filter((item) => !current.some((file) => file.id === item.id))
        .map((item) => ({
          id: item.id,
          folderId: targetFolder,
          name: item.file.name,
          size: item.file.size,
          modified: Date.now(),
          mimeType: item.file.type || 'application/octet-stream',
          blob: item.file,
        }));
      return additions.length ? [...current, ...additions] : current;
    });
    setUploads((current) => current.map((entry) => completed.some((item) => item.id === entry.id) ? { ...entry, state: 'complete' } : entry));
  }, [uploads, folderId, folders]);

  useEffect(() => {
    if (!uploadsComplete) return;
    const timeout = window.setTimeout(() => {
      setUploads([]);
      setIsUploadExpanded(false);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [uploadsComplete]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function openFolder(id: string) {
    setFolderId(id);
    setMenuId(null);
    setQuery('');
    setSearchFilter('all');
    setIsNewFolderOpen(false);
  }

  function openMyBeam() {
    setFolderId(null);
    setQuery('');
    setSearchFilter('all');
    setMenuId(null);
  }

  function switchWorkspace(nextWorkspaceId: DemoWorkspace['id']) {
    if (nextWorkspaceId === workspaceId) {
      setIsWorkspaceMenuOpen(false);
      return;
    }

    workspaceCacheRef.current[workspaceId] = { folders, files };
    const nextContent = workspaceCacheRef.current[nextWorkspaceId] ?? initialWorkspaceContent(nextWorkspaceId);
    workspaceCacheRef.current[nextWorkspaceId] = nextContent;
    setWorkspaceId(nextWorkspaceId);
    setFolders(nextContent.folders);
    setFiles(nextContent.files);
    setFolderId(null);
    setQuery('');
    setSearchFilter('all');
    setMenuId(null);
    setPreview({ status: 'idle' });
    setIsNewFolderOpen(false);
    setIsWorkspaceMenuOpen(false);
  }

  function openSearchFile(file: DemoFile) {
    setFolderId(file.folderId);
    setQuery('');
    setSearchFilter('all');
    void openFile(file);
  }

  async function openFile(file: DemoFile) {
    setMenuId(null);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = undefined;
    if (file.content) {
      setPreview({ status: 'ready', file, text: file.content });
      return;
    }
    if (file.previewUrl) {
      setPreview({ status: 'ready', file, url: file.previewUrl });
      return;
    }
    if (!file.blob) {
      setPreview({
        status: 'ready',
        file,
        text: `# ${file.name}\n\nThis sample file is available in the Beam workspace and ready to use.`,
      });
      return;
    }

    setPreview({ status: 'loading', file });
    try {
      if (file.mimeType.startsWith('text/') || /\.(md|json)$/i.test(file.name)) {
        setPreview({ status: 'ready', file, text: await file.blob.text() });
      } else if (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') {
        const url = URL.createObjectURL(file.blob);
        previewUrlRef.current = url;
        setPreview({ status: 'ready', file, url });
      } else {
        setPreview({ status: 'error', file, message: 'This file type does not support preview.' });
      }
    } catch (error) {
      setPreview({ status: 'error', file, message: error instanceof Error ? error.message : 'Preview failed.' });
    }
  }

  function queueFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const next = incoming.map((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const supported = supportedExtensions.includes(extension);
      return {
        id: crypto.randomUUID(),
        file,
        progress: 0,
        state: supported ? 'uploading' as const : 'error' as const,
        error: supported ? undefined : 'Unsupported file type',
      };
    });
    if (!next.length) return;
    if (!folderId && folders[0]) setFolderId(folders[0].id);
    setIsUploadExpanded(false);
    setUploads((current) => [...current.filter((item) => item.state !== 'complete'), ...next]);
  }

  function toggleUploads() {
    const shouldPause = uploads.some((item) => item.state === 'uploading');
    setUploads((current) => current.map((item) => {
      if (shouldPause && item.state === 'uploading') return { ...item, state: 'paused' };
      if (!shouldPause && item.state === 'paused' && item.progress < 100) return { ...item, state: 'uploading' };
      return item;
    }));
  }

  function closeUploads() {
    setUploads([]);
    setIsUploadExpanded(false);
  }

  async function downloadFile(file: DemoFile) {
    setMenuId(null);
    let blob: Blob;
    if (file.blob) {
      blob = file.blob;
    } else if (file.previewUrl) {
      blob = await fetch(file.previewUrl.split('#')[0]).then((response) => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
      });
    } else {
      blob = new Blob([file.content ?? `Beam demo file: ${file.name}`], { type: file.mimeType });
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Download started');
  }

  async function shareFile(file: DemoFile) {
    setMenuId(null);
    try {
      await writeClipboard(`${window.location.origin}/demo/shared/${encodeURIComponent(file.id)}`);
      setNotice('Share link copied');
    } catch {
      setNotice('Could not copy link');
    }
  }

  async function removeFile(file: DemoFile) {
    setMenuId(null);
    setFiles((current) => current.filter((entry) => entry.id !== file.id));
    setNotice('File deleted');
  }

  function removeFolder(id: string) {
    setMenuId(null);
    setFolders((current) => current.filter((folder) => folder.id !== id));
    setFiles((current) => current.filter((file) => file.folderId !== id));
    if (folderId === id) setFolderId(null);
    setNotice('Folder deleted');
  }

  function openRename(folder: DemoFolder) {
    setRenameFolderId(folder.id);
    setFolderDraft(folder.name);
    setFolderDialog('rename');
    setMenuId(null);
  }

  function openFolderEntry() {
    setQuery('');
    setMenuId(null);
    setIsWorkspaceMenuOpen(false);
    setFolderDraft('');
    setFolderCreateError('');
    setIsNewFolderOpen(true);
  }

  function closeFolderEntry() {
    setIsNewFolderOpen(false);
    setFolderDraft('');
    setFolderCreateError('');
  }

  function createFolder() {
    const name = folderDraft.trim();
    if (!name) return;
    if (folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) {
      setFolderCreateError('A folder with this name already exists.');
      return;
    }
    const id = `folder-${crypto.randomUUID()}`;
    setFolders((current) => [...current, { id, name }]);
    setFolderId(id);
    closeFolderEntry();
    setNotice('Folder created');
  }

  function saveFolder() {
    const name = folderDraft.trim();
    if (!name) return;
    if (folderDialog === 'rename' && renameFolderId) {
      setFolders((current) => current.map((folder) => folder.id === renameFolderId ? { ...folder, name } : folder));
      setNotice('Folder renamed');
    }
    setFolderDialog(null);
    setFolderDraft('');
  }

  return (
    <div
      className={`${styles.app} ${isDragging ? styles.dragging : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setIsDragging(false); queueFiles(event.dataTransfer.files); }}
      onClick={() => { if (menuId) setMenuId(null); if (isWorkspaceMenuOpen) setIsWorkspaceMenuOpen(false); }}
    >
      <aside className={styles.sidebar}>
        <div className={styles.workspaceControl}>
          <button
            className={styles.workspace}
            type="button"
            aria-label={`Switch workspace, current workspace ${activeWorkspace.name}`}
            aria-haspopup="menu"
            aria-expanded={isWorkspaceMenuOpen}
            onClick={(event) => { event.stopPropagation(); setMenuId(null); setIsWorkspaceMenuOpen((open) => !open); }}
          >
            {activeWorkspace.id === 'personal' ? <BeamMark /> : <WorkspaceAvatar workspace={activeWorkspace} />}
            <span className={styles.workspaceLabel}>{activeWorkspace.name}</span>
            <ChevronDown className={isWorkspaceMenuOpen ? `${styles.workspaceChevron} ${styles.workspaceChevronOpen}` : styles.workspaceChevron} size={11} />
          </button>
          <div className={`${styles.workspaceMenu} ${isWorkspaceMenuOpen ? styles.workspaceMenuOpen : ''}`} role="menu" aria-label="Workspaces" aria-hidden={!isWorkspaceMenuOpen} onClick={(event) => event.stopPropagation()}>
              <div className={styles.workspaceGroup}>
                {demoWorkspaces.map((workspace) => {
                  const isActive = workspace.id === workspaceId;
                  return (
                    <button
                      className={isActive ? styles.workspaceOptionActive : styles.workspaceOption}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => switchWorkspace(workspace.id)}
                      key={workspace.id}
                    >
                      <WorkspaceAvatar workspace={workspace} />
                      <span>{workspace.name}</span>
                      {isActive && <img className={styles.workspaceCheck} src="/assets/hero/demo/workspace-menu-check.svg" alt="" />}
                    </button>
                  );
                })}
              </div>
            </div>
        </div>
        <label className={`${styles.search} ${normalizedQuery ? styles.searching : ''}`}><Search size={11} /><input ref={searchInputRef} value={query} spellCheck={false} autoCapitalize="none" onFocus={() => { setMenuId(null); setIsWorkspaceMenuOpen(false); }} onChange={(event) => { if (event.target.value.trim()) closeFolderEntry(); setQuery(event.target.value); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setQuery(''); setSearchFilter('all'); } }} placeholder="Search all files" aria-label="Search all files" />{normalizedQuery ? <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setSearchFilter('all'); }}><img src="/assets/hero/demo/search-clear.svg" alt="" /></button> : null}</label>
        <button className={styles.newFolder} type="button" disabled={isNewFolderOpen} onClick={openFolderEntry}><img src="/assets/hero/demo/folder.svg" alt="" />New folder</button>
        <nav className={styles.folderList} aria-label="Folders" hidden={Boolean(normalizedQuery)}>
          {isNewFolderOpen && <div ref={newFolderRowRef} className={`${styles.folderCreateRow} ${folderCreateError ? styles.folderCreateInvalid : ''}`}><img src="/assets/hero/demo/folder-create.svg" alt="" /><input ref={newFolderInputRef} value={folderDraft} maxLength={64} placeholder="Enter your folder name" spellCheck={false} autoCapitalize="none" aria-label="Folder name" aria-invalid={Boolean(folderCreateError)} onChange={(event) => { setFolderDraft(event.target.value); setFolderCreateError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') createFolder(); else if (event.key === 'Escape') closeFolderEntry(); }} /><button type="button" aria-label="Create folder" onClick={createFolder}><img src="/assets/hero/demo/folder-create-enter.svg" alt="" /></button>{folderCreateError && <span role="alert">{folderCreateError}</span>}</div>}
          {folders.map((folder) => (
            <button className={folder.id === folderId ? styles.folderActive : styles.folderRow} type="button" onClick={() => openFolder(folder.id)} key={folder.id}>
              <span>{folder.name}</span><span>{files.filter((file) => file.folderId === folder.id).length}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>
        {!normalizedQuery && <header className={styles.contentHeader}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><button className={styles.crumb} type="button" aria-current={!activeFolder ? 'page' : undefined} onClick={openMyBeam}>My Beam</button>{activeFolder && <><span>/</span><button className={styles.currentCrumb} type="button" aria-current="page" onClick={() => setQuery('')}>{activeFolder.name}</button></>}</nav>
        </header>}

        {normalizedQuery ? (
          <>
          <div className={styles.searchFilters} aria-label="Search filters">
            {(['all', 'folder', 'file'] as const).map((filter) => <button className={searchFilter === filter ? styles.searchFilterActive : ''} type="button" aria-pressed={searchFilter === filter} onClick={() => setSearchFilter(filter)} key={filter}>{filter[0].toUpperCase() + filter.slice(1)}</button>)}
          </div>
          {searchedFolders.length || searchedFiles.length ? <div className={`${styles.folderView} ${styles.searchResults}`}>
            <div className={styles.table} role="table" aria-label={`Search results for ${query}`}>
              {searchedFolders.map((folder) => (
                <div className={styles.tableRow} role="row" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && openFolder(folder.id)} key={folder.id}>
                  <button className={styles.nameButton} type="button" onClick={() => openFolder(folder.id)}><Folder size={11} />{folder.name}</button>
                  <span>—</span><span>Folder</span>
                  <button className={styles.moreButton} type="button" aria-label={`Actions for ${folder.name}`} aria-haspopup="menu" aria-expanded={menuId === folder.id} onClick={(event) => { event.stopPropagation(); setMenuId((current) => current === folder.id ? null : folder.id); }}><MoreHorizontal size={13} /></button>
                  {menuId === folder.id && <RowMenu onOpen={() => openFolder(folder.id)} onRename={() => openRename(folder)} onDelete={() => removeFolder(folder.id)} />}
                </div>
              ))}
              {searchedFiles.map((file) => (
                <div className={styles.tableRow} role="row" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && openSearchFile(file)} key={file.id}>
                  <button className={styles.nameButton} type="button" onClick={() => openSearchFile(file)}><File size={11} /><span>{file.name}<small className={styles.searchPath}>{folders.find((folder) => folder.id === file.folderId)?.name}</small></span></button>
                  <span>{formatBytes(file.size)}</span><span>{formatModified(file.modified)}</span>
                  <button className={styles.moreButton} type="button" aria-label={`Actions for ${file.name}`} aria-haspopup="menu" aria-expanded={menuId === file.id} onClick={(event) => { event.stopPropagation(); setMenuId((current) => current === file.id ? null : file.id); }}><MoreHorizontal size={13} /></button>
                  {menuId === file.id && <RowMenu onOpen={() => openSearchFile(file)} onShare={() => void shareFile(file)} onDownload={() => void downloadFile(file)} onDelete={() => void removeFile(file)} />}
                </div>
              ))}
            </div>
          </div> : <section className={styles.searchEmpty} role="status"><strong>No results found</strong><span>Try a different search or filter.</span></section>}
          </>
        ) : !folderId ? (
          <div className={styles.homeGrid}>
            <div className={styles.table} role="table" aria-label="My Beam folders">
              <div className={`${styles.tableRow} ${styles.tableHeader}`} role="row"><span>Name</span><span>Size</span><span>Modified</span><span /></div>
              {visibleFolders.map((folder, index) => (
                <div className={styles.tableRow} role="row" tabIndex={0} onDoubleClick={() => openFolder(folder.id)} onKeyDown={(event) => event.key === 'Enter' && openFolder(folder.id)} key={folder.id}>
                  <button className={styles.nameButton} type="button" onClick={() => openFolder(folder.id)}><Folder size={11} />{folder.name}{index === 0 && <span className={styles.badge}>Starter</span>}</button>
                  <span>{index === 0 ? '2.4KB' : index === 1 ? '856MB' : '420MB'}</span><span>{index < 2 ? '5 days ago' : '6 days ago'}</span>
                  <button className={styles.moreButton} type="button" aria-label={`Actions for ${folder.name}`} aria-haspopup="menu" aria-expanded={menuId === folder.id} onClick={(event) => { event.stopPropagation(); setIsWorkspaceMenuOpen(false); setMenuId((current) => current === folder.id ? null : folder.id); }}><MoreHorizontal size={13} /></button>
                  {menuId === folder.id && <RowMenu onOpen={() => openFolder(folder.id)} onRename={() => openRename(folder)} onDelete={() => removeFolder(folder.id)} />}
                </div>
              ))}
            </div>
            <div className={styles.stats}>{[['Folders', folders.length], ['Files', files.length], ['Storage used', formatBytes(storageUsed)]].map(([label, value]) => <div key={label}><span>{label}</span><span>{value}</span></div>)}</div>
          </div>
        ) : (
          <div className={styles.folderView}>
            <div className={styles.table} role="table" aria-label={`${activeFolder?.name ?? 'Folder'} files`}>
              <div className={`${styles.tableRow} ${styles.tableHeader}`} role="row"><span>Name</span><span>Size</span><span>Modified</span><span /></div>
              {visibleFiles.map((file) => (
                <div className={styles.tableRow} role="row" tabIndex={0} onDoubleClick={() => void openFile(file)} onKeyDown={(event) => event.key === 'Enter' && void openFile(file)} key={file.id}>
                  <button className={styles.nameButton} type="button" onClick={() => void openFile(file)}><File size={11} />{file.name}</button>
                  <span>{formatBytes(file.size)}</span><span>{formatModified(file.modified)}</span>
                  <button className={styles.moreButton} type="button" aria-label={`Actions for ${file.name}`} aria-haspopup="menu" aria-expanded={menuId === file.id} onClick={(event) => { event.stopPropagation(); setIsWorkspaceMenuOpen(false); setMenuId((current) => current === file.id ? null : file.id); }}><MoreHorizontal size={13} /></button>
                  {menuId === file.id && <RowMenu onOpen={() => void openFile(file)} onShare={() => void shareFile(file)} onDownload={() => void downloadFile(file)} onDelete={() => void removeFile(file)} />}
                </div>
              ))}
              {!visibleFiles.length && <div className={styles.empty}><UploadCloud size={24} /><strong>No files here</strong><span>Drop files here or choose Upload.</span></div>}
            </div>
          </div>
        )}
      </main>

      {isDragging && (
        <div className={styles.dropZone}>
          <span className={styles.dropCopy}>
            Drop item to upload file to
            <span className={styles.dropDestination}>
              <Folder size={12} />
              {activeFolder?.name ?? 'My Beam'}
            </span>
          </span>
        </div>
      )}

      {folderDialog && <div className={styles.overlay} onMouseDown={() => setFolderDialog(null)}><form className={styles.dialog} onSubmit={(event) => { event.preventDefault(); saveFolder(); }} onMouseDown={(event) => event.stopPropagation()}><div className={styles.dialogIcon}><FolderPlus size={18} /></div><h3>Rename folder</h3><label>Folder name<input autoFocus value={folderDraft} onChange={(event) => setFolderDraft(event.target.value)} placeholder="Folder name" /></label><div className={styles.dialogActions}><button type="button" onClick={() => setFolderDialog(null)}>Cancel</button><button className={styles.primaryButton} type="submit">Save</button></div></form></div>}

      {preview.status !== 'idle' && <div className={styles.preview}>
        <div className={styles.previewBar}><div className={styles.previewBreadcrumb}><button type="button" aria-label="Back to files" title="Back to files" onClick={() => setPreview({ status: 'idle' })}><ChevronLeft size={12} /></button><strong>{preview.file.name}</strong></div><div>{preview.status === 'ready' && <><button type="button" aria-label="Share file" onClick={() => void shareFile(preview.file)}><Share2 size={12} /></button><button type="button" aria-label="Download file" onClick={() => void downloadFile(preview.file)}><Download size={12} /></button></>}<button type="button" aria-label="Close preview" onClick={() => setPreview({ status: 'idle' })}><X size={13} /></button></div></div>
        <div className={styles.previewBody}>{preview.status === 'loading' && <div className={styles.loading}><span /><span>Loading preview…</span></div>}{preview.status === 'error' && <div className={styles.previewMessage}><FileText size={28} /><strong>Preview unavailable</strong><span>{preview.message}</span></div>}{preview.status === 'ready' && preview.text && <pre>{preview.text}</pre>}{preview.status === 'ready' && preview.url && (preview.file.mimeType === 'application/pdf' ? <PdfPreview url={preview.url} title={preview.file.name} /> : <img src={preview.url} alt={preview.file.name} />)}</div>
      </div>}

      {uploadInProgress && <div className={styles.uploadBackdrop} aria-hidden="true" />}

      {!!uploads.length && (
        <section className={`${styles.uploadPanel} ${isUploadExpanded ? styles.uploadPanelExpanded : ''}`} aria-label="Upload progress">
          <span className={styles.srOnly} role="progressbar" aria-label={`Uploading ${uploads.length} ${uploads.length === 1 ? 'file' : 'files'}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(uploadProgress)} />
          <header className={styles.uploadHeader}>
            <span className={styles.uploadTitle}>
              <img src="/assets/hero/upload/progress-title.svg" alt="" />
              {uploadsComplete ? `Uploaded ${uploads.length} ${uploads.length === 1 ? 'file' : 'files'}` : `Uploading ${uploads.length} ${uploads.length === 1 ? 'file' : 'files'}`}
            </span>
            <span className={styles.uploadPercent}>{uploadsFailed ? 'Failed' : uploadsPaused ? 'Paused' : `${Math.floor(uploadProgress)}%`}</span>
            <span className={styles.uploadActions}>
              {uploadsComplete ? (
                <span className={styles.uploadComplete} aria-label="Upload complete"><img src="/assets/hero/upload/check.svg" alt="" /></span>
              ) : (
                <button type="button" aria-label={uploadsPaused ? 'Resume upload' : 'Pause upload'} onClick={toggleUploads}>
                  <img src={uploadsPaused ? '/assets/hero/upload/play.svg' : '/assets/hero/upload/pause.svg'} alt="" />
                </button>
              )}
              <button type="button" aria-label={isUploadExpanded ? 'Hide upload details' : 'Show upload details'} aria-expanded={isUploadExpanded} onClick={() => setIsUploadExpanded((expanded) => !expanded)}>
                <img className={isUploadExpanded ? styles.uploadChevronExpanded : ''} src="/assets/hero/upload/chevron.svg" alt="" />
              </button>
              <img className={styles.uploadSeparator} src="/assets/hero/upload/separator.svg" alt="" />
              <button type="button" aria-label={uploadsComplete ? 'Close upload progress' : 'Cancel upload'} onClick={closeUploads}>
                <img src="/assets/hero/upload/close.svg" alt="" />
              </button>
            </span>
          </header>
          {isUploadExpanded ? (
            <div className={styles.uploadDetails}>
              {uploads.map((item) => (
                <div className={styles.uploadItem} key={item.id}>
                  <span className={styles.uploadItemName}><File size={12} />{item.file.name}</span>
                  <span>{item.state === 'error' ? 'Failed' : item.state === 'complete' ? 'Complete' : `${Math.floor(item.progress)}%`}</span>
                  <span>{formatBytes(item.file.size)}</span>
                  <i><b style={{ width: `${item.progress}%` }} /></i>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.uploadProgressTrack}><span style={{ width: `${uploadProgress}%` }} /></div>
          )}
        </section>
      )}

      {notice && <div className={styles.toast}><Check size={12} />{notice}</div>}
    </div>
  );
}
