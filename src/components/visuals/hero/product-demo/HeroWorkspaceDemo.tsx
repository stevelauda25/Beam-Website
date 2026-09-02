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
import { deleteDemoFile, getDemoFile, storeDemoFile } from './heroDemoStorage';
import type { DemoFile, DemoFolder, PreviewState, UploadItem } from './types';
import styles from './HeroWorkspaceDemo.module.css';

const supportedExtensions = ['md', 'txt', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'];
const metadataKey = 'beam-website-hero-demo-metadata-v1';

function readMetadata() {
  try {
    const value = JSON.parse(window.localStorage.getItem(metadataKey) ?? 'null') as { folders?: DemoFolder[]; files?: DemoFile[] } | null;
    if (value?.folders?.length && Array.isArray(value.files)) {
      return {
        folders: value.folders,
        files: value.files.map((file) => ({
          ...initialFiles.find((initialFile) => initialFile.id === file.id),
          ...file,
        })),
      };
    }
  } catch {
    // A clean demo is preferable to blocking the Hero when local metadata is malformed.
  }
  return { folders: initialFolders, files: initialFiles };
}

function BeamMark() {
  return (
    <svg className={styles.beamMark} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.3 1.1c.8-.5 1.8-.7 2.8-.5L3.5 2.2a1.1 1.1 0 0 1-1.6 0l-.3-.3.7-.8Zm3.8.2A1.1 1.1 0 0 1 7.7 1l.7.7c.9 1 1.2 2.5.7 3.8L6 2.5a1.1 1.1 0 0 1 .1-1.2ZM1 2.9l.7.7c.4.4.4 1.1 0 1.6L.6 6.3A5 5 0 0 1 1 2.9Zm2.2 3.5c.4-.4 1.1-.4 1.6 0l3.1 3.1a5 5 0 0 1-6.5-.9l1.8-2.2Z" fill="currentColor" />
    </svg>
  );
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
  const initialMetadata = useMemo(readMetadata, []);
  const [folders, setFolders] = useState<DemoFolder[]>(initialMetadata.folders);
  const [files, setFiles] = useState<DemoFile[]>(initialMetadata.files);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [folderDialog, setFolderDialog] = useState<'create' | 'rename' | null>(null);
  const [folderDraft, setFolderDraft] = useState('');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' });
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const previewUrlRef = useRef<string>();

  const activeFolder = folders.find((folder) => folder.id === folderId);
  const visibleFolders = useMemo(() => folders.filter((folder) => folder.name.toLowerCase().includes(query.toLowerCase())), [folders, query]);
  const visibleFiles = useMemo(() => files.filter((file) => file.folderId === folderId && file.name.toLowerCase().includes(query.toLowerCase())), [files, folderId, query]);
  const storageUsed = files.reduce((total, file) => total + file.size, 0);
  const uploadTotalBytes = uploads.reduce((total, item) => total + Math.max(1, item.file.size), 0);
  const uploadTransferredBytes = uploads.reduce((total, item) => total + Math.max(1, item.file.size) * (item.progress / 100), 0);
  const uploadProgress = uploadTotalBytes ? Math.min(100, (uploadTransferredBytes / uploadTotalBytes) * 100) : 0;
  const uploadsComplete = uploads.length > 0 && uploads.every((item) => item.state === 'complete');
  const uploadsPaused = uploads.some((item) => item.state === 'paused' && item.progress < 100) && !uploads.some((item) => item.state === 'uploading');
  const uploadsFailed = uploads.some((item) => item.state === 'error');

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    try {
      window.localStorage.setItem(metadataKey, JSON.stringify({ folders, files }));
    } catch {
      // The current session remains functional if browser persistence is unavailable.
    }
  }, [folders, files]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuId(null);
        setFolderDialog(null);
        setPreview({ status: 'idle' });
      }
    }
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  useEffect(() => {
    if (!uploads.some((item) => item.state === 'uploading')) return;
    const interval = window.setInterval(() => {
      setUploads((current) => current.map((item) => item.state === 'uploading' ? { ...item, progress: Math.min(100, item.progress + 7) } : item));
    }, 120);
    return () => window.clearInterval(interval);
  }, [uploads]);

  useEffect(() => {
    const completed = uploads.filter((item) => item.state === 'uploading' && item.progress >= 100);
    completed.forEach((item) => {
      const storageId = `website-demo:${item.id}`;
      setUploads((current) => current.map((entry) => entry.id === item.id ? { ...entry, state: 'paused' } : entry));
      void storeDemoFile({ id: storageId, blob: item.file }).then(() => {
        const targetFolder = folderId ?? folders[0]?.id;
        if (!targetFolder) return;
        setFiles((current) => current.some((file) => file.id === item.id) ? current : [...current, {
          id: item.id,
          folderId: targetFolder,
          name: item.file.name,
          size: item.file.size,
          modified: Date.now(),
          mimeType: item.file.type || 'application/octet-stream',
          storageId,
        }]);
        setUploads((current) => current.map((entry) => entry.id === item.id ? { ...entry, state: 'complete' } : entry));
      }).catch(() => {
        setUploads((current) => current.map((entry) => entry.id === item.id ? { ...entry, state: 'error', error: 'Upload failed' } : entry));
      });
    });
  }, [uploads, folderId, folders]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function openFolder(id: string) {
    setFolderId(id);
    setMenuId(null);
    setQuery('');
  }

  function openMyBeam() {
    setFolderId(null);
    setQuery('');
    setMenuId(null);
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
    if (!file.storageId) {
      setPreview({ status: 'error', file, message: 'Preview unavailable in this website demo.' });
      return;
    }

    setPreview({ status: 'loading', file });
    try {
      const stored = await getDemoFile(file.storageId);
      if (!stored) throw new Error('The local file could not be found.');
      if (file.mimeType.startsWith('text/') || /\.(md|json)$/i.test(file.name)) {
        setPreview({ status: 'ready', file, text: await stored.blob.text() });
      } else if (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') {
        const url = URL.createObjectURL(stored.blob);
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
    if (file.storageId) {
      const stored = await getDemoFile(file.storageId);
      if (!stored) return setNotice('Download unavailable');
      blob = stored.blob;
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
    if (file.storageId) await deleteDemoFile(file.storageId).catch(() => undefined);
    setFiles((current) => current.filter((entry) => entry.id !== file.id));
    setNotice('File deleted');
  }

  function removeFolder(id: string) {
    setMenuId(null);
    files.filter((file) => file.folderId === id && file.storageId).forEach((file) => void deleteDemoFile(file.storageId as string).catch(() => undefined));
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

  function saveFolder() {
    const name = folderDraft.trim();
    if (!name) return;
    if (folderDialog === 'rename' && renameFolderId) {
      setFolders((current) => current.map((folder) => folder.id === renameFolderId ? { ...folder, name } : folder));
      setNotice('Folder renamed');
    } else {
      const id = `folder-${crypto.randomUUID()}`;
      setFolders((current) => [...current, { id, name }]);
      setFolderId(id);
      setNotice('Folder created');
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
      onClick={() => { if (menuId) setMenuId(null); }}
    >
      <aside className={styles.sidebar}>
        <div className={styles.workspaceControl}>
          <button className={styles.workspace} type="button" disabled aria-label="Personal workspace">
            <BeamMark />
            <span className={styles.workspaceLabel}>Personal</span>
            <ChevronDown className={styles.workspaceChevron} size={11} />
          </button>
        </div>
        <label className={styles.search} aria-disabled="true"><Search size={11} /><input value="" readOnly tabIndex={-1} placeholder="Search all files" aria-label="Search all files" aria-disabled="true" /><kbd>/</kbd></label>
        <button className={styles.newFolder} type="button" disabled><FolderPlus size={11} />New folder</button>
        <nav className={styles.folderList} aria-label="Folders">
          {folders.map((folder) => (
            <button className={folder.id === folderId ? styles.folderActive : styles.folderRow} type="button" onClick={() => openFolder(folder.id)} key={folder.id}>
              <span>{folder.name}</span><span>{files.filter((file) => file.folderId === folder.id).length}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>
        <header className={styles.contentHeader}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><button className={styles.crumb} type="button" aria-current={!activeFolder ? 'page' : undefined} onClick={openMyBeam}>My Beam</button>{activeFolder && <><span>/</span><button className={styles.currentCrumb} type="button" aria-current="page" onClick={() => setQuery('')}>{activeFolder.name}</button></>}</nav>
        </header>

        {!folderId ? (
          <div className={styles.homeGrid}>
            <div className={styles.table} role="table" aria-label="My Beam folders">
              <div className={`${styles.tableRow} ${styles.tableHeader}`} role="row"><span>Name</span><span>Size</span><span>Modified</span><span /></div>
              {visibleFolders.map((folder, index) => (
                <div className={styles.tableRow} role="row" tabIndex={0} onDoubleClick={() => openFolder(folder.id)} onKeyDown={(event) => event.key === 'Enter' && openFolder(folder.id)} key={folder.id}>
                  <button className={styles.nameButton} type="button" onClick={() => openFolder(folder.id)}><Folder size={11} />{folder.name}{index === 0 && <span className={styles.badge}>Starter</span>}</button>
                  <span>{index === 0 ? '2.4KB' : index === 1 ? '856MB' : '420MB'}</span><span>{index < 2 ? '5 days ago' : '6 days ago'}</span>
                  <button className={styles.moreButton} type="button" aria-label={`Actions for ${folder.name} unavailable`} disabled aria-disabled="true"><MoreHorizontal size={13} /></button>
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
                  <button className={styles.moreButton} type="button" aria-label={`Actions for ${file.name} unavailable`} disabled aria-disabled="true"><MoreHorizontal size={13} /></button>
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

      {folderDialog && <div className={styles.overlay} onMouseDown={() => setFolderDialog(null)}><form className={styles.dialog} onSubmit={(event) => { event.preventDefault(); saveFolder(); }} onMouseDown={(event) => event.stopPropagation()}><div className={styles.dialogIcon}><FolderPlus size={18} /></div><h3>{folderDialog === 'rename' ? 'Rename folder' : 'Create a new folder'}</h3><label>Folder name<input autoFocus value={folderDraft} onChange={(event) => setFolderDraft(event.target.value)} placeholder="Folder name" /></label><div className={styles.dialogActions}><button type="button" onClick={() => setFolderDialog(null)}>Cancel</button><button className={styles.primaryButton} type="submit">{folderDialog === 'rename' ? 'Save' : 'Create folder'}</button></div></form></div>}

      {preview.status !== 'idle' && <div className={styles.preview}>
        <div className={styles.previewBar}><div className={styles.previewBreadcrumb}><button type="button" aria-label="Back to files" title="Back to files" onClick={() => setPreview({ status: 'idle' })}><ChevronLeft size={12} /></button><strong>{preview.file.name}</strong></div><div>{preview.status === 'ready' && <><button type="button" aria-label="Share file" onClick={() => void shareFile(preview.file)}><Share2 size={12} /></button><button type="button" aria-label="Download file" onClick={() => void downloadFile(preview.file)}><Download size={12} /></button></>}<button type="button" aria-label="Close preview" onClick={() => setPreview({ status: 'idle' })}><X size={13} /></button></div></div>
        <div className={styles.previewBody}>{preview.status === 'loading' && <div className={styles.loading}><span /><span>Loading preview…</span></div>}{preview.status === 'error' && <div className={styles.previewMessage}><FileText size={28} /><strong>Preview unavailable</strong><span>{preview.message}</span></div>}{preview.status === 'ready' && preview.text && <pre>{preview.text}</pre>}{preview.status === 'ready' && preview.url && (preview.file.mimeType === 'application/pdf' ? <iframe src={preview.url} title={preview.file.name} /> : <img src={preview.url} alt={preview.file.name} />)}</div>
      </div>}

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
