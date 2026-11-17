import { FAQ_PLUGIN_TRUST } from "../plugin-trust";
import { WINDOWS_DOWNLOAD_URL } from "../../landing/site";
import {
  CC_ROWS,
  CLOSER,
  FAQ_AGENTS,
  FAQ_CODEX_TOGETHER,
  FAQ_CUSTOMIZE,
  FAQ_GET_STARTED,
  FAQ_LAPTOP,
  FAQ_PARALLEL,
  FAQ_PERMISSIONS,
  FAQ_PRIVACY,
  FAQ_REVIEW,
  FAQ_SUBSCRIPTIONS,
  cell,
  linkedCell,
  faqFree,
  faqPhone,
  faqPlatforms,
  faqSchedule,
  faqTalk,
  faqTeam,
  faqUsageLimit,
  price,
  faqScript,
} from "../compare-content";
import {
  AGENTS_COPY,
  agentsSection,
  ANYWHERE_COPY,
  anywhereSection,
  PRICING_COPY,
  pricingSection,
  LIMITS_COPY,
  limitsSection,
} from "../compare-sections";
import { FleetVisual } from "../compare-visuals";

import type { Comparison } from "../compare-types";
import { SUPERSET_LOGO, meta } from "./superset.meta";

export const comparison: Comparison = {
  ...meta,
  title: "cc vs Superset: The Free, Open-Source Alternative",
  description:
    "cc is a free, open-source Superset alternative. Run Claude Code and Codex in parallel, let agents hand off work, and check in from your phone. No Pro plan.",
  headline: "The free, open-source Superset alternative",
  sub: "Pay nothing per seat, with mobile, remote machines, and automations included. Run Claude Code, Codex, or any agent on the same task.",
  heroVisual: <FleetVisual />,
  tailored: pricingSection(PRICING_COPY, {
    plan: "Superset Pro",
    logo: SUPERSET_LOGO,
    yearlyPerSeatMonthly: 15,
    priceNote: "Superset Pro at $15 per user a month, billed yearly.",
  }),
  sections: [
    agentsSection(AGENTS_COPY),
    limitsSection(LIMITS_COPY),
    anywhereSection(ANYWHERE_COPY),
  ],
  tableNote:
    "marks features that need a paid Superset plan, from $15 per user / month, billed yearly.",
  table: [
    {
      title: "Price and license",
      rows: [
        {
          ...CC_ROWS.pricing,
          competitor: {
            ...price(
              "$0 solo",
              "Pro $20 per user / month, or $15 billed yearly",
            ),
            href: "https://superset.sh/pricing",
          },
        },
        { ...CC_ROWS.license, competitor: cell("no", "Elastic License 2.0") },
      ],
    },
    {
      title: "Away from your desk",
      rows: [
        {
          ...CC_ROWS.webAccess,
          competitor: cell("partial", "Desktop and iPhone only"),
        },
        {
          ...CC_ROWS.otherMachines,
          competitor: cell("partial", "Via Superset relay", true),
        },
        {
          feature: "Self-host on your own server",
          cc: cell("yes", "Home server or VM, your network"),
          competitor: cell("partial", "Hosts go through Superset relay", true),
        },
        {
          ...CC_ROWS.cloud,
          feature: "Cloud sandboxes",
          competitor: cell("partial", "Limited access"),
        },
        {
          ...CC_ROWS.automations,
          cc: cell("yes", "Cron, one-shot, scripts"),
          competitor: cell("partial", "Recurring only", true),
        },
      ],
    },
    {
      title: "Agents",
      rows: [
        { ...CC_ROWS.multiAgent, competitor: cell("yes", "Any CLI agent") },
        {
          ...CC_ROWS.handoff,
          competitor: cell("yes", "Via a coordinator skill"),
        },
        {
          ...CC_ROWS.accountSwitch,
          competitor: cell("partial", "Manual default switch"),
        },
      ],
    },
    {
      title: "Integrations",
      rows: [
        {
          ...CC_ROWS.marketplace,
          competitor: linkedCell(
            "partial",
            "Themes only; first-party plugins in limited access",
            "https://docs.superset.sh/plugins/overview",
          ),
        },
        {
          ...CC_ROWS.linear,
          competitor: cell("yes", "Two-way issue sync", true),
        },
        { ...CC_ROWS.github, competitor: cell("yes", "PR view with checks") },
        { ...CC_ROWS.gitlab, competitor: cell("no") },
        { ...CC_ROWS.gitea, competitor: cell("no") },
        {
          feature: "Slack integration",
          cc: cell("no"),
          competitor: cell("partial", "@superset agent bot", true),
        },
      ],
    },
    {
      title: "Platforms",
      rows: [
        { ...CC_ROWS.windows, competitor: cell("no") },
        {
          feature: "iOS app",
          cc: cell("yes", "TestFlight beta"),
          competitor: cell("partial", "iOS 26+", true),
        },
        {
          feature: "Android app",
          cc: cell("yes", "Alpha"),
          competitor: cell("no"),
        },
        {
          ...CC_ROWS.macos,
          competitor: cell("yes", "Apple Silicon and Intel"),
        },
        { ...CC_ROWS.linux, competitor: cell("yes", "Experimental") },
      ],
    },
    {
      title: "Workspace and teams",
      rows: [
        {
          ...CC_ROWS.worktrees,
          competitor: cell("yes", "Setup, teardown, run"),
        },
        { ...CC_ROWS.diffReview, competitor: cell("yes") },
        {
          feature: "Built-in terminal and browser",
          cc: cell("yes", "Browser on desktop"),
          competitor: cell("yes"),
        },
        {
          feature: "Code editor",
          cc: cell("yes"),
          competitor: cell("yes"),
        },
        {
          feature: "Port management",
          cc: cell("no"),
          competitor: cell("yes", "View, kill, group"),
        },
        {
          ...CC_ROWS.teamPlans,
          competitor: cell("partial", "SSO on Enterprise", true),
        },
      ],
    },
    {
      title: "Talking to your agents",
      rows: [
        {
          feature: "Side chats",
          cc: cell("yes"),
          competitor: cell("partial", "Fork a session"),
        },
        {
          feature: "Drafts",
          cc: cell("yes", "Save a message, send when ready"),
          competitor: cell("no"),
        },
        {
          feature: "Scheduled send",
          cc: cell("yes", "Send a message later"),
          competitor: cell("no"),
        },
        {
          feature: "Voice input",
          cc: cell("yes", "Dictate prompts"),
          competitor: cell("partial", "Dictation on iPhone", true),
        },
      ],
    },
  ],
  faqTitle: "FAQ",
  faq: [
    {
      title: "Switching from Superset",
      items: [
        {
          question: "What’s the difference between cc and Superset?",
          answer: (
            <p>
              Both run Claude Code, Codex, and other coding agents in parallel
              on your repo. cc is free for any team size and open source, while
              Superset charges $15 per user a month for teams, billed yearly. cc
              includes phone and browser access, remote machines, and
              automations at no cost, and runs on{" "}
              <a href={WINDOWS_DOWNLOAD_URL}>Windows (Alpha)</a>. When one agent
              starts another, the new agent gets its own thread (one
              conversation with one agent) that you can open and message.
            </p>
          ),
        },
        {
          question: "Who builds and maintains cc?",
          answer: (
            <>
              <p>
                A small, venture-backed team that most recently worked together
                at Figma, building Figma’s plugin platform. The team also
                includes alumni of Meta, Quora, and Mapbox.
              </p>
              <p>
                cc is developed in the open: the core team commits to it every
                day, dozens of community contributors send changes each month,
                and a new release ships every week. Follow along or reach the
                team on <a href="https://github.com/codythatsme/cc">GitHub</a> and{" "}
                <a href="https://discord.gg/kvBU6tJhcJ">Discord</a>.
              </p>
            </>
          ),
        },
        {
          question: "Is there a free, open-source Superset alternative?",
          answer: (
            <p>
              Yes: cc. It’s free for any team size and MIT-licensed, so you can
              use and change it for anything, including at work. Superset
              charges $15 per user a month for teams, billed yearly, and its
              Elastic License 2.0 makes the code public but isn’t an open-source
              license. <a href="/download/macos">Download cc</a>.
            </p>
          ),
        },
        FAQ_GET_STARTED,
        {
          question: "How do I switch from Superset to cc?",
          answer: (
            <p>
              Ask cc to do it. Your repo and Superset’s worktrees are plain Git
              on your machine, so a cc agent can add the repo and open each
              unfinished worktree as a thread. Superset keeps working while you
              try cc. <a href="/guides/switch-from-superset">Copy the prompt</a>
              .
            </p>
          ),
        },
      ],
    },
    {
      title: "Working in cc",
      items: [
        FAQ_CUSTOMIZE,
        FAQ_PLUGIN_TRUST,
        faqScript(null),
        FAQ_REVIEW,
        faqSchedule("Superset’s automations only repeat and need Pro."),
      ],
    },
    {
      title: "Price and license",
      items: [
        faqFree(
          ", while Superset puts its mobile app, remote machines, and automations on its Pro plan, from $15 per user a month billed yearly",
        ),
        FAQ_SUBSCRIPTIONS,
        faqUsageLimit(
          "Superset can hold several accounts, but you pick the default yourself, and a running agent keeps its account until you relaunch it.",
        ),
      ],
    },
    {
      title: "Agents",
      items: [
        FAQ_AGENTS,
        FAQ_CODEX_TOGETHER,
        faqTalk("; Superset does this through a coordinator skill"),
        FAQ_PARALLEL,
        FAQ_PERMISSIONS,
      ],
    },
    {
      title: "Mobile and remote",
      items: [
        faqPhone(
          "Superset’s iPhone app needs Pro and iOS 26, its Android app is a waitlist, and it has no browser access.",
        ),
        FAQ_LAPTOP,
      ],
    },
    {
      title: "Platforms, privacy, and teams",
      items: [
        faqPlatforms("Superset doesn’t run on Windows yet."),
        FAQ_PRIVACY,
        faqTeam(
          ", while Superset charges $15 per user a month for teams, billed yearly",
        ),
      ],
    },
  ],
  closer: CLOSER,
};
