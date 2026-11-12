#!/usr/bin/env python3
"""Export every CN hero release entry to Markdown; see export_hero_releases_md.py."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_hero_releases_md import main

if __name__ == '__main__':
    raise SystemExit(main('cn'))
