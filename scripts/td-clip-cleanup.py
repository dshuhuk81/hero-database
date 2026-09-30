# Free fixes for PixelLab clip frames (docs/td-asset-pipeline.md), edited in place.
#
#   python3 scripts/td-clip-cleanup.py <frame dir>... [--specks N] [--string] [--flash]
#
# --specks N  drop detached blobs smaller than N pixels (snow, sparks, snap lines). Default 24;
#             use 0 to skip. Larger values (400) also drop loose swirls around the figure.
# --string    archers: PixelLab paints the bowstring in a bright colour (purple, cyan, orange)
#             and leaves a thin glow of that colour on the body outline. Outline pixels take the
#             colour of their body neighbours; the line in the air becomes string tan.
# --flash     remove bright yellow flash pixels (a colour the figures themselves do not use).
#
# Check the result: a weapon or costume in the flagged colour loses it too.
import os, sys
from collections import deque
import numpy as np
from PIL import Image

STRING_TAN = (196, 178, 140)


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def neighbours(mask):
    p = np.pad(mask, 1)
    h, w = mask.shape
    return sum(p[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)


def blobs(mask):
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        comp, queue = [], deque([(y, x)])
        seen[y, x] = True
        while queue:
            cy, cx = queue.popleft()
            comp.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        queue.append((ny, nx))
        yield comp


def fix_string(a):
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    opaque = al > 0
    bright = opaque & (((b > g + 35) & (r > g + 20)) | ((b > r + 40) & (g > r + 30)) | ((r > 190) & (g > 60) & (b < 90) & (r > b + 100)))
    body = opaque & ~bright
    edge = bright & (neighbours(body) >= 3)
    for y, x in zip(*np.nonzero(edge)):
        ys, xs = slice(max(0, y - 1), y + 2), slice(max(0, x - 1), x + 2)
        a[y, x, :3] = np.median(a[ys, xs, :3][body[ys, xs]], axis=0)
    line = bright & ~edge
    for i, v in enumerate(STRING_TAN):
        a[..., i] = np.where(line, v, a[..., i])
    return int(edge.sum() + line.sum())


def fix_flash(a):
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    flash = (al > 0) & (r > 170) & (g > 150) & (b < r - 45)
    a[..., 3] = np.where(flash, 0, al)
    return int(flash.sum())


def fix_specks(a, size):
    count = 0
    for comp in blobs(a[..., 3] > 0):
        if len(comp) < size:
            ys, xs = zip(*comp)
            a[list(ys), list(xs), 3] = 0
            count += len(comp)
    return count


def main():
    specks = int(arg("--specks", 24))
    dirs = [d for d in sys.argv[1:] if os.path.isdir(d)]
    if not dirs:
        print("usage: python3 scripts/td-clip-cleanup.py <frame dir>... [--specks N] [--string] [--flash]")
        sys.exit(1)
    for d in dirs:
        for name in sorted(f for f in os.listdir(d) if f.endswith(".png")):
            path = os.path.join(d, name)
            a = np.array(Image.open(path).convert("RGBA")).astype(np.int32)
            done = []
            if "--string" in sys.argv:
                done.append(f"string {fix_string(a)}")
            if "--flash" in sys.argv:
                done.append(f"flash {fix_flash(a)}")
            if specks:
                done.append(f"specks {fix_specks(a, specks)}")
            Image.fromarray(a.astype(np.uint8)).save(path)
            print(f"{path}: {', '.join(done)}")


if __name__ == "__main__":
    main()
