export type DemoFolder = {
  id: string;
  name: string;
};

export type DemoFile = {
  id: string;
  folderId: string;
  name: string;
  size: number;
  modified: number;
  mimeType: string;
  storageId?: string;
  content?: string;
  previewUrl?: string;
};

export type UploadState = 'uploading' | 'paused' | 'complete' | 'error';

export type UploadItem = {
  id: string;
  file: File;
  progress: number;
  state: UploadState;
  error?: string;
};

export type PreviewState =
  | { status: 'idle' }
  | { status: 'loading'; file: DemoFile }
  | { status: 'ready'; file: DemoFile; url?: string; text?: string }
  | { status: 'error'; file: DemoFile; message: string };
