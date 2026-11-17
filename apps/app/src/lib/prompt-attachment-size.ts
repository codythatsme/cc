import { PROMPT_ATTACHMENT_MAX_BYTES } from "@cc/domain";
import { CcHttpError } from "@/lib/sdk";

export class PromptAttachmentSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptAttachmentSizeError";
  }
}

function formatMegabytes(bytes: number): string {
  return String(Math.ceil((bytes / (1024 * 1024)) * 10) / 10);
}

export async function uploadWithinPromptAttachmentLimit<T>(
  file: File,
  upload: () => Promise<T>,
): Promise<T> {
  if (file.size > PROMPT_ATTACHMENT_MAX_BYTES) {
    throw new PromptAttachmentSizeError(
      `${file.name} is ${formatMegabytes(file.size)}MB, over the ${formatMegabytes(
        PROMPT_ATTACHMENT_MAX_BYTES,
      )}MB attachment limit`,
    );
  }
  try {
    return await upload();
  } catch (error) {
    if (
      error instanceof CcHttpError &&
      error.status === 413 &&
      error.body === null
    ) {
      throw new PromptAttachmentSizeError(
        `${file.name} (${formatMegabytes(file.size)}MB) is too large to upload over this connection`,
      );
    }
    throw error;
  }
}
