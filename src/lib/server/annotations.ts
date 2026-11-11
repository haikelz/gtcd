import { randomUUID } from "node:crypto";
import {
  readDurableJson,
  updateDurableJson,
} from "$lib/server/durable-state.js";

/**
 * Chart notes ("deployed v2", "newsletter sent"), one list per site in Redis.
 * Durable state: reads and writes throw DurableStateUnavailable when Redis is
 * down and never fall back to process memory.
 */
export type Annotation = {
  readonly createdAt: string;
  /** Email of the admin who added it. */
  readonly createdBy: string;
  /** YYYY-MM-DD in the user's GoatCounter timezone. */
  readonly date: string;
  readonly id: string;
  readonly text: string;
};

// ponytail: one JSON list per site, rewritten on every change. 500 notes keep
// it near 100 KB; a sorted set per site would lift the cap if sites need more.
export const MAX_ANNOTATIONS = 500;
export const MAX_ANNOTATION_LENGTH = 140;

const ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function keyFor(siteId: number): string {
  return `annotations:site:${siteId}`;
}

/** A real calendar date written as YYYY-MM-DD. */
export function isAnnotationDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Note text with whitespace collapsed; null unless 1–140 characters. */
export function normalizeAnnotationText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const text = value.replace(/\s+/g, " ").trim();
  return text && text.length <= MAX_ANNOTATION_LENGTH ? text : null;
}

export function isAnnotationId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function parseAnnotations(value: unknown): Annotation[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry: unknown): Annotation[] => {
    if (typeof entry !== "object" || entry === null) return [];

    const { createdAt, createdBy, date, id, text } = entry as Record<
      string,
      unknown
    >;
    const normalized = normalizeAnnotationText(text);
    if (
      !isAnnotationId(id) ||
      !isAnnotationDate(date) ||
      !normalized ||
      typeof createdBy !== "string" ||
      typeof createdAt !== "string"
    ) {
      return [];
    }

    return [{ createdAt, createdBy, date, id, text: normalized }];
  });
}

/**
 * A site's notes dated within start…end (YYYY-MM-DD, inclusive; either may be
 * omitted), oldest date first. Throws DurableStateUnavailable without Redis.
 */
export async function listAnnotations(
  siteId: number,
  start?: string,
  end?: string
): Promise<Annotation[]> {
  const notes = parseAnnotations(await readDurableJson(keyFor(siteId)));

  return notes
    .filter(
      (note) =>
        (start === undefined || note.date >= start) &&
        (end === undefined || note.date <= end)
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
    );
}

/**
 * Add a note. Returns null when the site already holds MAX_ANNOTATIONS;
 * invalid input throws a RangeError.
 */
export async function addAnnotation(
  siteId: number,
  input: {
    readonly createdBy: string;
    readonly date: string;
    readonly text: string;
  }
): Promise<Annotation | null> {
  const text = normalizeAnnotationText(input.text);
  if (!isAnnotationDate(input.date) || !text) {
    throw new RangeError("Invalid annotation");
  }

  const note: Annotation = {
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    date: input.date,
    id: randomUUID(),
    text,
  };

  // Decided inside the atomic update, against the latest stored list.
  let full = false;
  await updateDurableJson(keyFor(siteId), (current) => {
    const notes = parseAnnotations(current);
    full = notes.length >= MAX_ANNOTATIONS;
    return full ? notes : [...notes, note];
  });

  return full ? null : note;
}

/** Remove a note; deleting one that is already gone is not an error. */
export async function deleteAnnotation(
  siteId: number,
  id: string
): Promise<void> {
  await updateDurableJson(keyFor(siteId), (current) =>
    parseAnnotations(current).filter((note) => note.id !== id)
  );
}
