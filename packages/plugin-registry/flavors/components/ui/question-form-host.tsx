import {
  experimental_useQuestionFormHost,
  type ExperimentalQuestionFormHost,
  type ExperimentalQuestionShortcut,
} from "@codythatsme/plugin-sdk/app";

export type QuestionFormHost = ExperimentalQuestionFormHost;
export type QuestionShortcut = ExperimentalQuestionShortcut;
export const useQuestionFormHost = experimental_useQuestionFormHost;
