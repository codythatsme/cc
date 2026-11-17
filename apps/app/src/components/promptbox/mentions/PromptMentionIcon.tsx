import type { PromptMentionResource } from "@cc/domain";
import type { ComposerMentionTargetShape } from "@cc/client-core";
import { Icon } from "@cc/shared-ui/icon";
import { PluginItemIcon } from "@/components/plugin/PluginIcon";
import { promptMentionIconName } from "@cc/client-core";
import { composerMentionResource } from "./prompt-mention-pill";

export function PromptMentionIcon({
  className,
  resource,
}: {
  className?: string;
  resource: PromptMentionResource;
}) {
  if (resource.kind === "plugin") {
    return (
      <PluginItemIcon
        pluginId={resource.pluginId}
        icon={resource.icon ?? null}
        className={className}
      />
    );
  }
  return (
    <Icon
      name={promptMentionIconName(resource)}
      className={className}
      aria-hidden
    />
  );
}

export function ComposerMentionIcon({
  mention,
  className,
}: {
  mention: ComposerMentionTargetShape;
  className?: string;
}) {
  return (
    <PromptMentionIcon
      resource={composerMentionResource(mention)}
      {...(className === undefined ? {} : { className })}
    />
  );
}
