import type { Comparison } from "../compare-types";
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
  ANYWHERE_COPY,
  anywhereSection,
  SPAWN_COPY,
  spawnSection,
} from "../compare-sections";
import { AgentSplit, UsageVisual } from "../compare-visuals";
import { meta } from "./cursor.meta";

const PLANS_SECTION = {
  title: "Every agent on its own subscription",
  wide: false,
  visual: <UsageVisual />,
  body: (
    <>
      <p>Each agent runs on the plan you already pay for.</p>
      <p>
        When an agent hits a usage limit, cc picks the work back up once the
        limit resets.
      </p>
    </>
  ),
};

export const comparison: Comparison = {
  ...meta,
  title:
    "Cursor Alternative for Your Claude and ChatGPT Subscriptions: cc, Free and Open Source",
  description:
    "cc is a free, open-source Cursor alternative. Run Claude Code and Codex directly on your Claude and ChatGPT subscriptions, next to Cursor’s agent, and change anything with plugins.",
  headline: "The Cursor alternative for your Claude and ChatGPT subscriptions",
  sub: "Run Claude Code and Codex on the subscriptions you already have. Cursor’s agent works too. Free and open source.",
  heroVisual: <AgentSplit />,
  tailored: PLANS_SECTION,
  sections: [spawnSection(SPAWN_COPY), anywhereSection(ANYWHERE_COPY)],
  tableNote:
    "marks features that need a paid Cursor plan: Premium, from $30 a month.",
  table: [
    {
      title: "Agents",
      rows: [
        {
          feature: "Use your Claude or ChatGPT subscription",
          cc: cell("yes", "Claude Code and Codex, signed in as usual"),
          competitor: cell("no"),
        },
        {
          feature: "Claude Code and Codex agents",
          cc: cell("yes"),
          competitor: cell("partial", "As editor extensions"),
        },
        {
          ...CC_ROWS.handoff,
          competitor: cell("partial", "Only between Cursor’s own agents"),
        },
        {
          ...CC_ROWS.accountSwitch,
          competitor: cell("no"),
        },
      ],
    },
    {
      title: "Price and license",
      rows: [
        {
          ...CC_ROWS.pricing,
          cc: price("$0", "You pay agent providers directly"),
          competitor: {
            ...price(
              "$0 Free",
              "Plus $8, Premium $30, Super $100, Ultra $200 / mo; Teams from $30 per user / month",
            ),
            href: "https://cursor.com/pricing",
          },
        },
        { ...CC_ROWS.license, competitor: cell("no", "Closed source") },
      ],
    },
    {
      title: "Away from your desk",
      rows: [
        {
          ...CC_ROWS.otherMachines,
          competitor: cell("yes", "Self-hosted cloud agents", true),
        },
        {
          ...CC_ROWS.cloud,
          feature: "Cloud agents",
          competitor: cell("yes", "Hosted VMs", true),
        },
        {
          ...CC_ROWS.mobile,
          competitor: linkedCell(
            "partial",
            "iPhone and iPad only, local and cloud agents",
            "https://cursor.com/changelog/remote-control-local-agents",
          ),
        },
        {
          ...CC_ROWS.automations,
          competitor: cell("yes", "Run as cloud agents", true),
        },
      ],
    },
    {
      title: "Workspace",
      rows: [
        {
          feature: "Parallel agents in Git worktrees",
          cc: cell("yes"),
          competitor: cell("yes"),
        },
        { ...CC_ROWS.diffReview, competitor: cell("yes") },
        {
          ...CC_ROWS.marketplace,
          competitor: cell(
            "yes",
            "Skills, MCP servers, hooks, and automations",
          ),
        },
        {
          feature: "Code editor",
          cc: cell("yes", "Via plugins, no Tab completion"),
          competitor: cell("yes", "Full editor with Tab"),
        },
      ],
    },
  ],
  faqTitle: "FAQ",
  faq: [
    {
      title: "Switching from Cursor",
      items: [
        {
          question: "What’s the difference between cc and Cursor?",
          answer: (
            <p>
              Cursor,{" "}
              <a href="https://cursor.com/blog/joining-spacex">
                now owned by SpaceX
              </a>
              , is sold as part of The X Subscription with Grok and X. It is a
              code editor and agents app built around its own agent.{" "}
              <a href="https://cursor.com/docs/models-and-pricing">
                Plans include usage of Cursor’s own Grok and Composer models;
                Claude, GPT, and Gemini cost extra at API rates, from Premium up
              </a>
              . cc is a free, open-source app for running coding agents: Claude
              Code and Codex run directly on your Claude and ChatGPT
              subscriptions, next to Cursor’s agent and others, on your own
              machines, and they can start and message each other. Plugins let
              you change almost anything, including adding a code editor.
            </p>
          ),
        },
        {
          question: "Is there a free, open-source Cursor alternative?",
          answer: (
            <p>
              Yes, for running coding agents: cc. It’s free for any team size
              and MIT-licensed, so you can use and change it for anything,
              including at work, and Claude Code and Codex run directly on the
              Claude and ChatGPT subscriptions you already have.{" "}
              <a href="/download/macos">Download cc</a>.
            </p>
          ),
        },
        {
          question: "Can I use Cursor with cc?",
          answer: (
            <p>
              Yes. Pick Cursor as the agent for any cc thread: cc runs Cursor’s
              agent CLI with your own sign-in and plan, so your rules and MCP
              servers come along. You can also open any thread’s worktree in
              Cursor with one click.
            </p>
          ),
        },
        {
          question: "How do I move my agent work to cc?",
          answer: (
            <p>
              Ask cc to do it. Cursor’s local worktrees are plain Git on your
              machine, and its cloud agents push their work to branches, so a cc
              agent can add your repo and open each unfinished worktree or
              branch as a thread. Your AGENTS.md, CLAUDE.md, skills, and MCP
              servers come along, and Cursor keeps working while you try cc.{" "}
              <a href="/guides/switch-from-cursor">Copy the prompt</a>.
            </p>
          ),
        },
        {
          question: "What’s different day to day?",
          answer: (
            <ul>
              <li>
                Claude and GPT usage comes out of your Claude and ChatGPT
                subscriptions instead of usage-based billing.
              </li>
              <li>
                Each agent task is a thread you can open from your computer,
                phone, or any browser.
              </li>
              <li>
                You pick the agent per thread, and agents start and message each
                other across providers.
              </li>
              <li>
                Setup commands from <code>.cursor/worktrees.json</code> move to{" "}
                <code>.cc-env-setup.sh</code>, and untracked files like{" "}
                <code>.env</code> go in <code>.worktreeinclude</code>.
              </li>
              <li>
                Long runs keep going on whichever of your computers you pick.
              </li>
            </ul>
          ),
        },
        FAQ_GET_STARTED,
      ],
    },
    {
      title: "Agents and plans",
      items: [
        FAQ_SUBSCRIPTIONS,
        faqUsageLimit(null),
        FAQ_CODEX_TOGETHER,
        faqTalk(""),
        FAQ_AGENTS,
        FAQ_PERMISSIONS,
      ],
    },
    {
      title: "Your Cursor workflow in cc",
      items: [
        {
          question: "Does cc have background agents?",
          answer: (
            <p>
              Yes. Every cc thread runs in the background on the machine you
              pick: your laptop, an always-on desktop, or a server you own. You
              can also start threads in on-demand cloud sandboxes in your own
              Modal account with the built-in Modal Sandbox plugin. Either way,
              you pay nothing extra to cc.
            </p>
          ),
        },
        FAQ_PARALLEL,
        {
          question: "Does cc have setup scripts for new worktrees?",
          answer: (
            <p>
              Yes. Commit a <code>.cc-env-setup.sh</code> at your repo root and
              cc runs it in every new worktree. List untracked files like{" "}
              <code>.env</code> in <code>.worktreeinclude</code> and cc copies
              them in first, and <code>.cc-env-teardown.sh</code> cleans up when
              a worktree goes away.
            </p>
          ),
        },
        FAQ_REVIEW,
        {
          question: "Does cc have a code editor?",
          answer: (
            <p>
              Yes. The built-in File Editor plugin edits files inside cc with
              Monaco, the editor from VS Code. cc also opens any thread’s
              worktree in Cursor, VS Code, or another editor you have installed.
            </p>
          ),
        },
        faqPhone(null),
        faqSchedule(null),
        FAQ_LAPTOP,
        FAQ_CUSTOMIZE,
        faqScript(null),
      ],
    },
    {
      title: "Price, platforms, and privacy",
      items: [
        faqFree(
          ", while Cursor puts cloud agents, Projects, and frontier models on its paid plans",
        ),
        faqPlatforms(null),
        FAQ_PRIVACY,
        faqTeam(""),
      ],
    },
  ],
  closer: CLOSER,
};
