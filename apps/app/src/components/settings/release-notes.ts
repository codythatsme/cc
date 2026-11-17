import { openUrlInExternalBrowser } from "@/lib/url-open-routing";
import type { SourceUpdateNotes } from "./release-notes-model";

const RELEASE_NOTES_BASE_URL =
  "https://github.com/codythatsme/cc/blob/main/CHANGELOG.md";
const SOURCE_REPOSITORY_URL = "https://github.com/codythatsme/cc";

export type ReleaseNotesView = "inline" | "web";

export function getReleaseNotesUrl(version: string): string {
  return `${RELEASE_NOTES_BASE_URL}#${version.replaceAll(".", "")}`;
}

export function getSourceCompareUrl(update: SourceUpdateNotes): string {
  return update.from === null
    ? `${SOURCE_REPOSITORY_URL}/commits/${update.to}`
    : `${SOURCE_REPOSITORY_URL}/compare/${update.from}...${update.to}`;
}

export function openReleaseNotesOnWeb(
  version: string,
  notesVersion: string,
): void {
  openUrlInExternalBrowser(getReleaseNotesUrl(notesVersion));
}

export function openSourceCompareOnWeb(
  version: string,
  update: SourceUpdateNotes,
): void {
  openUrlInExternalBrowser(getSourceCompareUrl(update));
}
