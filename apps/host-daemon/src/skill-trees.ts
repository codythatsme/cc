import type { HostDaemonSkillTree } from "@cc/host-daemon-contract";

export type FetchSkillTree = (treeHash: string) => Promise<HostDaemonSkillTree>;
