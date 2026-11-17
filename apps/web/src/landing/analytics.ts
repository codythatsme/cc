// cc does not collect website analytics. This module keeps the upstream call
// sites compiling, but every export is inert: no analytics SDK is loaded, no
// identifiers are created or read, nothing is stored, and no network request
// is made. Keep it that way when merging upstream changes.
import type { ExperimentDevices, ExperimentKey } from "../experiments/flags";
import type { ArrivalSource } from "./arrival-source";
import type { CtaPlacement } from "./site";
import type { TestimonialSource } from "./testimonials";

type LandingEvent =
  | {
      name: "landing_github_clicked";
      properties: { placement: CtaPlacement };
    }
  | {
      name: "landing_marketplace_clicked";
      properties: { placement: CtaPlacement };
    }
  | {
      name: "landing_discord_clicked";
      properties: { placement: CtaPlacement };
    }
  | {
      name: "landing_x_clicked";
      properties: { placement: CtaPlacement };
    }
  | {
      name: "landing_cli_command_copied";
      properties: { placement: CtaPlacement; command: string };
    }
  | {
      name: "landing_section_viewed";
      properties: { section: string };
    }
  | {
      name: "landing_testimonial_clicked";
      properties: { source: TestimonialSource };
    }
  | {
      name: "landing_send_to_computer_clicked";
      properties: { placement: CtaPlacement };
    }
  | {
      name: "guide_prompt_copied";
      properties: {
        guide: string;
        placement: "hero" | "handoff" | "step";
      };
    }
  | {
      name: "landing_email_subscribed";
      properties: { placement: CtaPlacement };
    }
  | {
      name: "marketplace_page_viewed";
      properties: {
        category?: string;
        sort: "featured" | "recently-added" | "most-installed";
        author?: string;
      };
    }
  | {
      name: "marketplace_plugin_detail_viewed";
      properties: {
        plugin_id: string;
        entry_id: string;
        arrival_source: ArrivalSource;
      };
    }
  | {
      name: "marketplace_install_command_copied";
      properties: { plugin_id: string; entry_id: string };
    };

export function initAnalytics(): void {}

export function useInitAnalytics(): void {}

export function exposeExperiment(
  _key: ExperimentKey,
  _variant: string,
  _devices: ExperimentDevices,
): void {}

export type VisitIds = {
  distinctId: string;
  sessionId: string | null;
};

export function readVisitIds(): VisitIds | null {
  return null;
}

export function trackLandingEvent(_event: LandingEvent): void {}
