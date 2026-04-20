"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

export type AutoSaveStatus = "saved" | "saving" | "dirty";

type AutoSaveResult<T> = {
  nextValue?: T;
  savedAt?: string | null;
};

type UseAutoSaveOptions<T> = {
  value: T;
  enabled: boolean;
  resetKey: string;
  delay?: number;
  getSavedAt?: (value: T) => string | null;
  onSave: (value: T) => Promise<AutoSaveResult<T>> | AutoSaveResult<T>;
  onAfterSave?: (value: T) => void;
};

const serializeValue = <T,>(value: T) => JSON.stringify(value);

export function useAutoSave<T>({
  value,
  enabled,
  resetKey,
  delay = 1000,
  getSavedAt,
  onSave,
  onAfterSave,
}: UseAutoSaveOptions<T>) {
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const latestValueRef = useRef(value);
  const savedSnapshotRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);

  const clearPendingTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const performSave = useEffectEvent(async () => {
    clearPendingTimer();
    setSaveStatus("saving");

    try {
      const result = await onSave(latestValueRef.current);
      const savedValue = result.nextValue ?? latestValueRef.current;
      savedSnapshotRef.current = serializeValue(savedValue);
      latestValueRef.current = savedValue;
      onAfterSave?.(savedValue);
      setLastSavedAt(result.savedAt ?? getSavedAt?.(savedValue) ?? null);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("dirty");
    }
  });

  useEffect(() => {
    initializedRef.current = false;
    savedSnapshotRef.current = "";
    clearPendingTimer();
    setSaveStatus("saved");
    setLastSavedAt(null);
  }, [resetKey]);

  useEffect(() => {
    latestValueRef.current = value;

    if (!enabled) {
      return;
    }

    const nextSnapshot = serializeValue(value);

    if (!initializedRef.current) {
      initializedRef.current = true;
      savedSnapshotRef.current = nextSnapshot;
      setLastSavedAt(getSavedAt?.(value) ?? null);
      setSaveStatus("saved");
      return;
    }

    if (nextSnapshot === savedSnapshotRef.current) {
      return;
    }

    setSaveStatus("dirty");
    clearPendingTimer();
    timerRef.current = window.setTimeout(() => {
      void performSave();
    }, delay);
  }, [delay, enabled, getSavedAt, performSave, value]);

  useEffect(() => clearPendingTimer, []);

  return {
    hasUnsavedChanges: saveStatus !== "saved",
    lastSavedAt,
    saveNow: performSave,
    saveStatus,
  };
}
