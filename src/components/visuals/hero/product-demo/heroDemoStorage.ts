export type WebsiteStoredFile = {
  id: string;
  blob: Blob;
};

const DATABASE_NAME = 'beam-website-hero-demo-storage';
const STORE_NAME = 'files';

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local file storage is unavailable.'));
  });
}

export async function storeDemoFile(record: WebsiteStoredFile) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The file could not be saved.'));
  });
  database.close();
}

export async function getDemoFile(id: string) {
  const database = await openDatabase();
  const record = await new Promise<WebsiteStoredFile | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as WebsiteStoredFile | undefined);
    request.onerror = () => reject(request.error ?? new Error('The file could not be read.'));
  });
  database.close();
  return record;
}

export async function deleteDemoFile(id: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The file could not be deleted.'));
  });
  database.close();
}
