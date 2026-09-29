import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const releaseDirectory = resolve(process.argv[2] ?? "apps/desktop/release");
const { version } = JSON.parse(
  await readFile(
    new URL("../apps/desktop/package.json", import.meta.url),
    "utf8",
  ),
);
if (!/^\d+\.\d+\.\d+$/.test(version))
  throw new Error("Homebrew requires a stable desktop version");
const archive = resolve(releaseDirectory, `cc-${version}-arm64.zip`);
const hash = createHash("sha256");
for await (const chunk of createReadStream(archive)) hash.update(chunk);
const cask = `cask "cc" do
  version "${version}"
  sha256 "${hash.digest("hex")}"

  url "https://github.com/codythatsme/cc/releases/download/v#{version}/cc-#{version}-arm64.zip"
  name "cc"
  desc "Agentic IDE without usage telemetry"
  homepage "https://github.com/codythatsme/cc"

  depends_on arch: :arm64
  depends_on macos: ">= :ventura"

  app "cc.app"

  zap trash: [
    "~/.cc",
    "~/Library/Application Support/cc",
    "~/Library/Caches/io.github.codythatsme.cc",
    "~/Library/Preferences/io.github.codythatsme.cc.plist",
    "~/Library/Saved Application State/io.github.codythatsme.cc.savedState",
  ]

  caveats <<~EOS
    This personal build is not Apple-notarized. If macOS blocks the first launch,
    approve cc in System Settings > Privacy & Security > Open Anyway.
    Launch with: open -a cc
  EOS
end
`;
await writeFile(resolve(releaseDirectory, "cc.rb"), cask);
process.stdout.write(`Generated cc.rb for ${version}\n`);
