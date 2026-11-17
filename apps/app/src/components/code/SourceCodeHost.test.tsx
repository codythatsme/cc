// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { getDefaultStore } from "jotai";
import { AUTOMATIC_REPLACEMENT_PROVIDER } from "@/lib/plugin-replacement-preference";
import { sourceCodeRendererProviderAtom } from "./codeRendererProvider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginSourceCodeRendererProps } from "@codythatsme/plugin-sdk";
import {
  resetPluginSlotStoreForTest,
  setPluginSlotRegistrations,
} from "@/lib/plugin-slots";
import { resetAllCrashedPluginSlotsForTest } from "@/components/plugin/PluginSlotMount";
import { PluginSourceCode } from "@/components/plugin/PluginSourceCode";
import { SelectionAddToChatContext } from "@/components/thread/SelectionAddToChatContext";
import { SourceCodeHost } from "./SourceCodeHost";
import { makePluginRegistrationSet } from "@/test/fixtures/plugins";

const ccSourceCode = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
}));

vi.mock("./CcSourceCode", async () => {
  const React = await import("react");
  return {
    default: (props: Record<string, unknown>) => {
      ccSourceCode.lastProps = props;
      return React.createElement(
        "div",
        { "data-testid": "cc-source-code" },
        "cc source",
      );
    },
  };
});

const CONTENT = "const a = 1;\nconst b = 2;\n";
const received: PluginSourceCodeRendererProps[] = [];

function registerSourceCodeRenderer(
  component: (props: PluginSourceCodeRendererProps) => React.ReactNode,
) {
  setPluginSlotRegistrations(
    "demo",
    makePluginRegistrationSet({
      sourceCodeRenderers: [{ id: "source", title: "Demo source", component }],
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  getDefaultStore().set(
    sourceCodeRendererProviderAtom,
    AUTOMATIC_REPLACEMENT_PROVIDER,
  );
  ccSourceCode.lastProps = null;
  received.length = 0;
  resetPluginSlotStoreForTest();
});

afterEach(() => {
  cleanup();
  resetAllCrashedPluginSlotsForTest();
  resetPluginSlotStoreForTest();
  vi.restoreAllMocks();
});

describe("SourceCodeHost", () => {
  it("hands the replacement resolved semantic props, not CC's host-only inputs", async () => {
    registerSourceCodeRenderer((props) => {
      received.push(props);
      return <div data-testid="plugin-source">plugin source</div>;
    });

    render(
      <SourceCodeHost
        content={CONTENT}
        path="src/app.ts"
        cacheKey="rev-2:src/app.ts"
        overflow="wrap"
        highlightedLines={{ start: 2, end: 2 }}
        scrollToHighlightedLines
        onSelectionAddToChat={() => {}}
      />,
    );

    await screen.findByTestId("plugin-source");
    const props = received.at(-1);
    expect(props?.content).toBe(CONTENT);
    expect(props?.path).toBe("src/app.ts");
    expect(props?.overflow).toBe("wrap");
    expect(props?.highlightedLines).toEqual({ start: 2, end: 2 });
    expect(Object.keys(props ?? {})).not.toContain("cacheKey");
    expect(Object.keys(props ?? {})).not.toContain("onSelectionAddToChat");
    expect(Object.keys(props ?? {})).not.toContain("scrollToHighlightedLines");
  });

  it("loads CC's renderer only when the replacement delegates", async () => {
    registerSourceCodeRenderer(({ path, Original }) =>
      path.endsWith(".md") ? <div>plugin source</div> : <Original />,
    );

    render(
      <SourceCodeHost
        content={CONTENT}
        path="src/app.ts"
        cacheKey="rev-2:src/app.ts"
        scrollToHighlightedLines
      />,
    );

    expect(await screen.findByTestId("cc-source-code")).toBeDefined();
    expect(ccSourceCode.lastProps?.cacheKey).toBe("rev-2:src/app.ts");
    expect(ccSourceCode.lastProps?.scrollToHighlightedLines).toBe(true);
  });

  it("resolves presentation defaults for CC's renderer", async () => {
    render(<SourceCodeHost content={CONTENT} path="src/app.ts" />);

    await screen.findByTestId("cc-source-code");
    expect(ccSourceCode.lastProps?.overflow).toBe("scroll");
    expect(ccSourceCode.lastProps?.highlightedLines).toBeNull();
  });
});

describe("experimental_SourceCode", () => {
  it("shares the replacement with CC's own surfaces", async () => {
    registerSourceCodeRenderer((props) => {
      received.push(props);
      return <div data-testid="plugin-source">plugin source</div>;
    });

    render(<PluginSourceCode content={CONTENT} path="src/app.ts" />);

    await screen.findByTestId("plugin-source");
    expect(received.at(-1)?.content).toBe(CONTENT);
    expect(received.at(-1)?.highlightedLines).toBeNull();
    expect(ccSourceCode.lastProps).toBeNull();
  });

  it("offers Add to chat only inside a thread", async () => {
    const addToChat = vi.fn();
    const { unmount } = render(
      <PluginSourceCode content={CONTENT} path="src/app.ts" />,
    );
    await screen.findByTestId("cc-source-code");
    expect(ccSourceCode.lastProps?.onSelectionAddToChat).toBeUndefined();
    unmount();

    render(
      <SelectionAddToChatContext.Provider value={addToChat}>
        <PluginSourceCode content={CONTENT} path="src/app.ts" />
      </SelectionAddToChatContext.Provider>,
    );
    await screen.findByTestId("cc-source-code");
    expect(ccSourceCode.lastProps?.onSelectionAddToChat).toBe(addToChat);
  });
});
