"""Choosing which files belong to the app. The only module here that touches the disk."""
from __future__ import annotations

import fnmatch
import os
import re
import subprocess
from pathlib import Path
from typing import Iterable, Iterator, List, Optional, Sequence, Tuple

from .diff import ChangedLines, changed_lines

GIT_TIMEOUT_SECONDS = 60
SKIP_DIRS = frozenset({
    "node_modules", "dist", "build", "out", "coverage", "Pods", "DerivedData", "vendor", "venv", "__pycache__",
    "test-results", "playwright-report", "storybook-static", "generated",
})
TEST_DIRS = frozenset({"__tests__", "__mocks__", "tests", "test", "e2e", "spec", "androidTest", "__snapshots__"})
TEST_FILE = re.compile(r"\.(?:test|spec|stories)\.\w+$|Tests?\.(?:swift|kt)$|_test\.(?:dart|gd)$")
MINIFIED = (".min.js", ".min.css", ".map", ".d.ts")
# Larger files are bundles or generated output; hand-written UI code does not get this big.
MAX_FILE_BYTES = 400_000


def iter_sources(root: Path, extensions: Iterable[str]) -> Iterator[Tuple[Path, str]]:
    """Hand-written source files under `root` as (path, posix path relative to root). Hidden folders, build
    output, dependencies and tests are skipped, and so is anything git ignores: a build that writes into the
    app's folder (a bundled engine, hashed chunks) adds no styling anyone wrote, and counting it made a
    release's count rise while the build ran (MapStack 1.2.1: 130 against 124 at the same commit)."""
    wanted = tuple(extensions)
    for relative in _listed(root):
        folders, name = relative.split("/")[:-1], relative.rsplit("/", 1)[-1]
        if any(part.startswith(".") or part in SKIP_DIRS or part in TEST_DIRS for part in folders):
            continue
        if not name.lower().endswith(wanted) or name.endswith(MINIFIED) or TEST_FILE.search(name):
            continue
        path = root / relative
        try:
            if path.stat().st_size > MAX_FILE_BYTES:
                continue
        except OSError:
            continue  # listed by git but deleted on disk
        yield path, relative


def changed_since(root: Path, rev: str) -> Optional[ChangedLines]:
    """Files under root changed since `rev`, committed or not, each with the lines the change wrote, and new
    untracked files whole; None if git cannot tell. A renamed file counts as new: its path is part of it."""
    diff = _git(root, "-c", "core.quotePath=false", "diff", "-U0", "--no-renames", "--no-color", "--no-ext-diff",
                "--relative", rev, "--")
    untracked = _git(root, "ls-files", "-o", "--exclude-standard", "-z")
    if diff is None or untracked is None:
        return None
    found = changed_lines(diff)
    found.update((path, None) for path in untracked.split("\0") if path)
    return found


def _listed(root: Path) -> List[str]:
    """Every file under root, root-relative and sorted: git's view when root is in a repository (it leaves out
    what .gitignore names), else the disk's. An empty git view (root is a copy inside an ignored folder) falls
    back to the disk as well."""
    listed = _git(root, "ls-files", "-co", "--exclude-standard", "-z")
    found = sorted(path for path in (listed or "").split("\0") if path)
    if found:
        return found
    for folder, subfolders, names in os.walk(root):
        subfolders[:] = [name for name in subfolders if not name.startswith(".") and name not in SKIP_DIRS]
        found.extend((Path(folder) / name).relative_to(root).as_posix() for name in names)
    return sorted(found)


def _git(root: Path, *command: str) -> Optional[str]:
    try:
        git = subprocess.run(["git", "-C", str(root), *command], capture_output=True, timeout=GIT_TIMEOUT_SECONDS)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return git.stdout.decode("utf-8", "replace") if git.returncode == 0 else None


def matches(relative: str, patterns: Sequence[str]) -> bool:
    """True when a root-relative path matches a glob, a file name, or sits under a named folder."""
    name = relative.rsplit("/", 1)[-1]
    for pattern in patterns:
        pattern = pattern.strip("/")
        if fnmatch.fnmatch(relative, pattern) or fnmatch.fnmatch(name, pattern) or relative.startswith(pattern + "/"):
            return True
    return False


def matches_any(relatives: Sequence[str], pattern: str) -> bool:
    return any(matches(relative, [pattern]) for relative in relatives)


def relative_patterns(root: Path, patterns: Sequence[str]) -> List[str]:
    """Accept paths and globs written relative to the root, to the current folder, or as absolute paths. A glob
    is rebased by its fixed folder part (`app/Core/Theme*.swift` from the repo, root `app`: `Core/Theme*.swift`),
    as the other audit scanners read their --lib, --hub and --exclude."""
    result = []
    for pattern in patterns:
        if any(char in pattern for char in "*?["):
            parts = pattern.split("/")
            fixed = next(index for index, part in enumerate(parts) if any(char in part for char in "*?["))
            prefix = "/".join(parts[:fixed])
            if prefix and (Path(prefix).is_absolute() or not (root / prefix).exists()):
                rebased = _under_root(root, Path(prefix).expanduser())
                if rebased is not None:
                    pattern = "/".join(([rebased] if rebased != "." else []) + parts[fixed:])
        elif Path(pattern).expanduser().exists():
            rebased = _under_root(root, Path(pattern).expanduser())
            if rebased is not None:
                pattern = rebased
        result.append(pattern)
    return result


def _under_root(root: Path, candidate: Path) -> Optional[str]:
    if not candidate.exists():
        return None
    try:
        return candidate.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return None


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")
