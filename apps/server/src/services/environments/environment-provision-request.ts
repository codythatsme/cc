import type { EnvironmentProvisionCommand } from "@cc/host-daemon-contract";

export interface EnvironmentProvisionRequest {
  command: EnvironmentProvisionCommand;
}
