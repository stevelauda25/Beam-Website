import type { Plugin } from 'vite';

export const HERO_SNAPSHOT_ROUTE: string;
export const HERO_SNAPSHOT_FILE: string;

/** Dev-server-only snapshot endpoint for the Hero reveal tuning. See the .mjs. */
export function heroRevealSnapshotPlugin(): Plugin;
