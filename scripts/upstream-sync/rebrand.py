#!/usr/bin/env python3
"""Mechanical upstream -> cc rebrand of a git worktree (tracked files only).

Usage:
  rebrand.py <worktree>          rename paths and rewrite text in place; run on
                                 a clean upstream checkout, then `git add -A`
  rebrand.py --audit <worktree>  list remaining upstream-brand and telemetry
                                 references for review (does not modify files)

See docs/releasing-cc.md#syncing-with-upstream.
"""
import os
import re
import subprocess
import sys

# Substrings that must never be rewritten: third-party names, external repos
# that keep their upstream names, and regex character classes.
PROTECT = [
    "BBEdit",
    "[Bb]",
    "get-bb/marketplace",
    "brsbl/bb-plugins",
]
BASE64_RUN = re.compile(r"[A-Za-z0-9+/]{80,}={0,2}")

# Ordered replacements applied before the generic token rule.
SPECIFIC = [
    (re.compile(r"https://getbb\.app/schemas/"),
     "https://raw.githubusercontent.com/codythatsme/cc/main/apps/web/public/schemas/"),
    (re.compile(r"x\.com/get_bb_app"), "github.com/codythatsme/cc"),
    (re.compile(r"dev\.bb\.desktop"), "io.github.codythatsme.cc"),
    # regexes that match both package scopes, e.g. /^@(?:get-)?bb\/plugin-sdk/
    (re.compile(r"@\(\?:get-\)\?bb\\/"), r"@(?:codythatsme|cc)\\/"),
    (re.compile(r"get-bb/bb"), "codythatsme/cc"),
    (re.compile(r"get-bb"), "codythatsme"),
    (re.compile(r"app\.getbb"), "io.github.codythatsme.cc"),
    (re.compile(r"getbb-app"), "cc-example-invalid"),
    (re.compile(r"getbb\\\.app"), r"cc\\.example\\.invalid"),
    (re.compile(r"getbb\.app"), "cc.example.invalid"),
    (re.compile(r"GETBB\.APP"), "CC.EXAMPLE.INVALID"),
    (re.compile(r"GetBB\.app"), "CC.Example.Invalid"),
    (re.compile(r"getbb\.(test|localhost)\b"), r"cc.\1"),
    (re.compile(r"(?:plugins\.)?getbb\.dev"), "cc.example.invalid"),
    (re.compile(r"Getbb"), "CcService"),
    (re.compile(r"getbb"), "cc-service"),
    (re.compile(r"vibecodethis\\\.site"), r"cc-staging\\.example\\.invalid"),
    (re.compile(r"vibecodethis\.site"), "cc-staging.example.invalid"),
]

# Case-preserving bb token rules. A "bb" token is bounded by non-alphanumerics,
# camelCase transitions, or a preceding string escape such as \n.
TOKEN_RULES = [
    (re.compile(r"(?:(?<![A-Za-z0-9])|(?<=\\[a-z])|(?<=\\u[0-9a-fA-F]{4})|(?<=\\x[0-9a-fA-F]{2})|(?<=%[0-9A-Fa-f]{2}))bb(?![a-z0-9])"), "cc"),
    (re.compile(r"(?:(?<![A-Z0-9])|(?<=\\[a-z])|(?<=\\u[0-9a-fA-F]{4})|(?<=\\x[0-9a-fA-F]{2})|(?<=%[0-9A-Fa-f]{2}))Bb(?![a-z0-9])"), "Cc"),
    (re.compile(r"(?:(?<![A-Za-z0-9])|(?<=\\[a-z])|(?<=\\u[0-9a-fA-F]{4})|(?<=\\x[0-9a-fA-F]{2})|(?<=%[0-9A-Fa-f]{2})|(?<=[a-z]))BB(?![A-Za-z0-9])"), "CC"),
    # BB prefix of a PascalCase identifier, e.g. BBSdk, isBBReady
    (re.compile(r"(?:(?<![A-Za-z0-9])|(?<=[a-z]))BB(?=[A-Z][a-z])"), "CC"),
]


def transform(text: str) -> str:
    saved = []

    def stash(value: str) -> str:
        saved.append(value)
        return f"\x00{len(saved) - 1}\x00"

    for literal in PROTECT:
        if literal in text:
            text = text.replace(literal, stash(literal))
    text = BASE64_RUN.sub(lambda m: stash(m.group(0)) if re.search(r"[0-9+/]", m.group(0)) else m.group(0), text)
    for pat, rep in SPECIFIC:
        text = pat.sub(rep, text)
    for pat, rep in TOKEN_RULES:
        text = pat.sub(rep, text)
    return re.sub(r"\x00(\d+)\x00", lambda m: saved[int(m.group(1))], text)


def transform_path(path: str) -> str:
    return "/".join(transform(seg) for seg in path.split("/"))


SKIP_CONTENT = re.compile(
    r"\.(png|jpe?g|gif|webp|ico|icns|mp4|mov|woff2?|ttf|otf|pdf|zip|gz|wasm|car)$", re.I
)


def main(root: str) -> None:
    files = subprocess.run(
        ["git", "-C", root, "ls-files", "-z"], capture_output=True, check=True
    ).stdout.decode().split("\0")
    changed = renamed = 0
    for rel in filter(None, files):
        src = os.path.join(root, rel)
        if os.path.islink(src) or not os.path.isfile(src):
            continue
        if not SKIP_CONTENT.search(rel):
            with open(src, "rb") as fh:
                raw = fh.read()
            if b"\0" not in raw:
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    text = None
                if text is not None:
                    new = transform(text)
                    if new != text:
                        with open(src, "wb") as fh:
                            fh.write(new.encode("utf-8"))
                        changed += 1
        new_rel = transform_path(rel)
        if new_rel != rel:
            dst = os.path.join(root, new_rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            os.rename(src, dst)
            renamed += 1
    for dirpath, _dirs, _files in os.walk(root, topdown=False):
        if ".git" in dirpath.split(os.sep):
            continue
        if dirpath != root and not os.listdir(dirpath):
            os.rmdir(dirpath)
    print(f"rewrote {changed} files, renamed {renamed} paths")


AUDIT_PATTERNS = [
    re.compile(r"(?:^|[^A-Za-z0-9])(?:bb|BB|Bb)(?:[^a-z0-9]|$)"),
    re.compile(r"getbb|get-bb|get_bb|vibecodethis", re.I),
    re.compile(r"posthog|telemetry|analytics|\bsentry\b|mixpanel", re.I),
]
AUDIT_SKIP = re.compile(
    r"(^|/)(pnpm-lock\.yaml|CHANGELOG\.md)$|/recordings/|/__fixtures__/|"
    r"^scripts/upstream-sync/"
)


def audit(root: str) -> None:
    files = subprocess.run(
        ["git", "-C", root, "ls-files", "-z"], capture_output=True, check=True
    ).stdout.decode().split("\0")
    hits = 0
    for rel in filter(None, files):
        if AUDIT_SKIP.search(rel) or SKIP_CONTENT.search(rel):
            continue
        path = os.path.join(root, rel)
        if os.path.islink(path) or not os.path.isfile(path):
            continue
        try:
            text = open(path, encoding="utf-8").read()
        except (UnicodeDecodeError, OSError):
            continue
        for number, line in enumerate(text.split("\n"), 1):
            cleaned = line
            for literal in PROTECT:
                cleaned = cleaned.replace(literal, "")
            if any(p.search(cleaned) for p in AUDIT_PATTERNS):
                print(f"{rel}:{number}: {line.strip()[:160]}")
                hits += 1
    print(f"{hits} references to review", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1] == "--audit":
        audit(sys.argv[2])
    else:
        main(sys.argv[1])
