import { useState } from "react";
import type { PromptDraftAttachment, PromptDraftState } from "@cc/client-core";
import type { PromptTextMention } from "@cc/domain";
import {
  createComposerDraftStore,
  type ComposerDraftStore,
} from "@/components/plugin/plugin-composer-host";

export function composerDraft(
  text = "",
  mentions: PromptTextMention[] = [],
  attachments: PromptDraftAttachment[] = [],
): PromptDraftState {
  return { text, mentions, attachments };
}

export function composerDraftStore(
  text = "",
  mentions: PromptTextMention[] = [],
  attachments: PromptDraftAttachment[] = [],
): ComposerDraftStore {
  return createComposerDraftStore(composerDraft(text, mentions, attachments));
}

export function useComposerDraftFixture(
  text = "",
  mentions: PromptTextMention[] = [],
  attachments: PromptDraftAttachment[] = [],
): ComposerDraftStore {
  const [store] = useState(() =>
    composerDraftStore(text, mentions, attachments),
  );
  return store;
}
