"use client";

import { useSyncExternalStore } from "react";
import {
  emptyState,
  restoreState,
  STORAGE_KEY,
  type StudyState,
} from "./decisions";

interface Snapshot {
  state: StudyState;
  hydrated: boolean;
  storageMessage: string;
  storageError: boolean;
  invalidStorage: boolean;
  storageEnabled: boolean;
}

const initial: Snapshot = {
  state: emptyState(),
  hydrated: false,
  storageMessage: "Drafts stay in this browser",
  storageError: false,
  invalidStorage: false,
  storageEnabled: true,
};
let snapshot: Snapshot | undefined;
const listeners = new Set<() => void>();

function getSnapshot(): Snapshot {
  if (typeof window === "undefined") return initial;
  if (snapshot) return snapshot;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    snapshot = {
      ...initial,
      state: raw ? restoreState(raw) : emptyState(),
      hydrated: true,
      storageMessage: "Saved in this browser",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.state));
  } catch (error) {
    const invalid = !(error instanceof DOMException);
    snapshot = {
      ...(snapshot ?? initial),
      hydrated: true,
      storageEnabled: !invalid,
      storageError: true,
      invalidStorage: invalid,
      storageMessage: invalid
        ? "The saved draft could not be loaded. Current edits will stay in this tab."
        : "Browser storage is unavailable. Current edits remain in this tab; retry saving before leaving.",
    };
  }
  return snapshot;
}

function publish(next: Snapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function persist(next: Snapshot): Snapshot {
  if (!next.storageEnabled) return next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.state));
    return {
      ...next,
      storageError: false,
      invalidStorage: false,
      storageMessage: "Saved in this browser",
    };
  } catch {
    return {
      ...next,
      storageError: true,
      storageMessage:
        "Browser storage is unavailable. Current edits remain in this tab; retry saving before leaving.",
    };
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getServerSnapshot = () => initial;

export function useBrowserStudy() {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return {
    ...current,
    setState: (update: (state: StudyState) => StudyState) => {
      const previous = getSnapshot();
      publish(persist({ ...previous, state: update(previous.state) }));
    },
    retryStorage: () => {
      const previous = getSnapshot();
      publish(persist({ ...previous, storageEnabled: true }));
    },
  };
}
