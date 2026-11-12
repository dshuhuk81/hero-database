#!/usr/bin/env python3
"""Decrypt and unpack the config packages of an emu_status.py pull in one step.

Takes the pulled folder of one client (e.g. out/emu_pull/20261028/global), decrypts its config zips
(config.zip, deflate_config_*.zip) with motto_crypt and merges their contents:
  <date>_plain/<label>/<name>.zip   decrypted zips
  <date>_plain/x_<label>/           merged contents; client/config/ is what the export scripts read
Lua packages and asset bundles are not touched.

Usage:
  python3 -I scripts/unpack_config.py out/emu_pull/20261028/global [--out out/emu_pull/20261028_plain]
"""
from __future__ import annotations

import argparse
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import motto_crypt  # noqa: E402


def config_zips(packages: Path) -> list[Path]:
    found = [packages / name for name in ("config.zip", "deflate_config.zip") if (packages / name).exists()]
    return found + sorted(packages.glob("deflate_config_*.zip"))


def extract_safely(zf: zipfile.ZipFile, dest: Path) -> int:
    """Writes every member below dest; a member that would land outside dest is an error."""
    root = dest.resolve()
    count = 0
    for info in zf.infolist():
        target = (dest / info.filename).resolve()
        if root != target and root not in target.parents:
            raise ValueError(f"zip entry escapes the target folder: {info.filename}")
        if info.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(info) as src:
            target.write_bytes(src.read())
        count += 1
    return count


def unpack(pull_dir: Path, out: Path | None = None) -> Path:
    """Returns the x_<label> folder. Raises FileNotFoundError when the pull has no config zips."""
    pull_dir = Path(pull_dir)
    packages = pull_dir / "data" / "packages"
    if not packages.is_dir():
        packages = pull_dir / "files" / "data" / "packages"
    if not packages.is_dir():
        raise FileNotFoundError(f"{packages} does not exist (is this a folder pulled with emu_status.py --pull?)")
    zips = config_zips(packages)
    if not zips:
        raise FileNotFoundError(f"no config.zip / deflate_config_*.zip in {packages}")
    label = pull_dir.name
    out = Path(out) if out else pull_dir.parent.parent / f"{pull_dir.parent.name}_plain"
    plain_dir, x_dir = out / label, out / f"x_{label}"
    plain_dir.mkdir(parents=True, exist_ok=True)
    x_dir.mkdir(parents=True, exist_ok=True)
    for src in zips:
        plain = motto_crypt.decrypt(src.read_bytes())
        (plain_dir / src.name).write_bytes(plain)
        with zipfile.ZipFile(plain_dir / src.name) as zf:
            n = extract_safely(zf, x_dir)
        print(f"{src.name}: {len(plain):,} B decrypted, {n} files -> {x_dir}")
    return x_dir


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pull_dir", type=Path, help="pulled client folder, e.g. out/emu_pull/20261028/global")
    ap.add_argument("--out", type=Path, help="default: <pull date folder>_plain next to it")
    args = ap.parse_args()
    x = unpack(args.pull_dir, args.out)
    print(f"done: {x}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
