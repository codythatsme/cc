import type {
  EditMessageRequest,
  SendMessageRequest,
} from "@cc/server-contract";

export interface SendThreadMessageMutationRequest extends SendMessageRequest {
  id: string;
}

export interface EditMessageMutationRequest extends EditMessageRequest {
  id: string;
}
