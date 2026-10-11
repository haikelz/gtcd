/**
 * GoatCounter path-filter grammar, shared by the server (which resolves a
 * filter to matching path IDs) and the client (which highlights matches in
 * path and title).
 *
 * Grammar, from GoatCounter's filter.go:
 *   at:start, at:end       match only at the start or end of path/title
 *   in:path, in:title      match only the path or only the title
 *   is:event, is:pageview  show only events or pageviews
 *   :not                   negate the whole match
 *
 * The remaining text is a case-insensitive substring matched against the path
 * and title.
 */

export interface ParsedFilter {
  /** Keyword-free search text (trimmed); empty when only keywords remain. */
  readonly term: string;
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly onlyEvent: boolean;
  readonly onlyPageview: boolean;
  readonly matchPath: boolean;
  readonly matchTitle: boolean;
  readonly negate: boolean;
}

export interface FilterTarget {
  readonly path: string;
  readonly title: string;
  readonly event: boolean;
}

export interface HighlightSegment {
  readonly text: string;
  readonly match: boolean;
}

const KEYWORDS = [
  "at:start",
  "at:end",
  "is:event",
  "is:pageview",
  "in:path",
  "in:title",
  ":not",
] as const;

export function parseFilter(query: string): ParsedFilter {
  let rest = query ?? "";
  let atStart = false;
  let atEnd = false;
  let onlyEvent = false;
  let onlyPageview = false;
  let inPath = false;
  let inTitle = false;
  let negate = false;

  for (const kw of KEYWORDS) {
    const i = rest.indexOf(kw);
    if (i < 0) continue;
    rest = (rest.slice(0, i) + rest.slice(i + kw.length)).trim();
    switch (kw) {
      case "at:start":
        atStart = true;
        break;
      case "at:end":
        atEnd = true;
        break;
      case "is:event":
        onlyEvent = true;
        break;
      case "is:pageview":
        onlyPageview = true;
        break;
      case "in:path":
        inPath = true;
        break;
      case "in:title":
        inTitle = true;
        break;
      case ":not":
        negate = true;
        break;
    }
  }

  return {
    term: rest.trim(),
    atStart,
    atEnd,
    onlyEvent,
    onlyPageview,
    matchPath: inPath || !inTitle,
    matchTitle: inTitle || !inPath,
    negate,
  };
}

/**
 * Does this path/title match the filter? Follows the documented behavior:
 * event keywords filter first, the keyword-free text is matched
 * case-insensitively against path and/or title, and `:not` negates the result.
 */
export function filterMatches(
  parsed: ParsedFilter,
  target: FilterTarget
): boolean {
  const matches = (): boolean => {
    if (parsed.onlyEvent && !target.event) return false;
    if (parsed.onlyPageview && target.event) return false;
    if (parsed.term === "") return true;

    const term = parsed.term.toLowerCase();
    const has = (value: string): boolean => {
      const v = (value ?? "").toLowerCase();
      if (parsed.atStart && parsed.atEnd) return v === term;
      if (parsed.atStart) return v.startsWith(term);
      if (parsed.atEnd) return v.endsWith(term);
      return v.includes(term);
    };

    let match = false;
    if (parsed.matchPath) match = has(target.path);
    if (parsed.matchTitle && !match) match = has(target.title);
    return match;
  };

  const result = matches();
  return parsed.negate ? !result : result;
}

/**
 * Split text into matched/unmatched segments for highlighting, mirroring
 * GoatCounter's dashboard: keywords are stripped, `:not` disables
 * highlighting, and at:start/at:end narrow where the term can match.
 */
export function highlightSegments(
  query: string,
  text: string,
  field: "path" | "title" = "path"
): HighlightSegment[] {
  const parsed = parseFilter(query ?? "");
  if (!parsed.term || parsed.negate) return [{ text, match: false }];
  if (field === "path" && !parsed.matchPath) return [{ text, match: false }];
  if (field === "title" && !parsed.matchTitle) return [{ text, match: false }];

  const lower = text.toLowerCase();
  const term = parsed.term.toLowerCase();
  const positions: number[] = [];

  if (parsed.atStart) {
    if (lower.startsWith(term)) positions.push(0);
  } else if (parsed.atEnd) {
    const i = text.length - term.length;
    if (i >= 0 && lower.endsWith(term)) positions.push(i);
  } else {
    let i = lower.indexOf(term);
    while (i >= 0) {
      positions.push(i);
      i = lower.indexOf(term, i + term.length);
    }
  }

  if (positions.length === 0) return [{ text, match: false }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const i of positions) {
    if (i > cursor)
      segments.push({ text: text.slice(cursor, i), match: false });
    segments.push({ text: text.slice(i, i + term.length), match: true });
    cursor = i + term.length;
  }
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), match: false });
  return segments;
}
