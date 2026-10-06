# Warp-frame animation clips (M7 step 3) from one painted enemy sprite: the weapon arm is cut
# out as a rigid layer (the gap behind it filled by colour diffusion), the legs swing as
# pendulums from the hip, the body bobs, leans and breathes. Writes one horizontal strip
# per clip (idle, walk, attack, hurt, death) for scripts/build-td-enemy-anims.mjs.
#   python3 scripts/td-warp-anim.py archer <outdir> --pixellab [--src .td-work/pixellab/archer]
#        (clips from PixelLab job frames saved by scripts/td-pixellab-clips.mjs)
#   python3 scripts/td-warp-anim.py grunt <outdir> [--warp]   (--warp: use RIGS even if STRIPS has the kind)
# Needs numpy and Pillow. Rig points live in RIGS (sprite pixels of the 256x256 still).
# STRIPS kinds start from a finished frame series instead (e.g. a generated flight cycle on
# black): the background is keyed out, frames are aligned on a fixed point, and hurt and
# death are derived from them.
import sys, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RIGS = {
    "grunt": {
        "file": "public/td/enemies/sprites/grunt-v2.webp",
        "hip_y": 165, "foot_y": 228, "feet": (115, 228), "leg_split": 120,
        "shoulder": (78, 95),
        # Sword arm and blade (upper arm, forearm, fist, guard, blade to the tip).
        "arm": [(60, 84), (88, 88), (84, 116), (74, 126), (142, 176), (140, 188), (126, 186),
                (66, 146), (36, 136), (34, 124), (50, 118), (54, 104)],
    },
}

STRIPS = {
    # Stymphalian bird flight cycle (6 frames on black, generated from text).
    "flyer": {
        "file": os.path.expanduser("~/hero-database-assets/td/enemy-sprites-src/flyerSpriteFlying.png"),
        "align_rows": (380, 450),   # rows of the head: frames align on the beak tip
        "size": 100,                # largest bird dimension in the output frames
        "derive": "flyer",
    },
}

CANVAS = 448            # square working frame; the still is pasted at OFFSET
OFFSET = (96, 128)      # room on the left for the death fall
OUT_SCALE = 0.35        # idle body ~70 px: about 2x its 35 px on screen (retina), no more

def soft_mask(size, poly, blur=1.5):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))

def diffuse_fill(rgba, hole, steps=80):
    """Fill hole pixels with colour pulled in from their surroundings (cheap inpaint)."""
    a = rgba.astype(np.float32) / 255
    known = (~hole) & (a[..., 3] > 0.5)
    col = a[..., :3] * known[..., None]
    w = known.astype(np.float32)
    for _ in range(steps):
        col_b = np.array(Image.fromarray((col * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(2))).astype(np.float32) / 255
        w_b = np.array(Image.fromarray((w * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(2))).astype(np.float32) / 255
        est = col_b / np.maximum(w_b, 1e-4)[..., None]
        col = np.where(known[..., None], a[..., :3], est * np.minimum(w_b, 1)[..., None])
        w = np.where(known, 1.0, np.minimum(w_b, 1))
    # Alpha inside the hole comes from all non-hole neighbours, transparent ones included,
    # so arm parts that stuck out over empty space vanish instead of leaving a ghost.
    alpha = np.where(hole, 0, a[..., 3])
    seen = (~hole).astype(np.float32)
    for _ in range(steps):
        al_b = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(2))).astype(np.float32) / 255
        seen_b = np.array(Image.fromarray((seen * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(2))).astype(np.float32) / 255
        alpha = np.where(hole, al_b / np.maximum(seen_b, 1e-4) * np.minimum(seen_b * 4, 1), a[..., 3])
        seen = np.where(hole, np.minimum(seen_b * 4, 1), 1.0)
    out = a.copy()
    out[..., :3] = np.where(hole[..., None], col / np.maximum(w, 1e-4)[..., None], a[..., :3])
    out[..., 3] = np.where(hole, np.clip((alpha - 0.35) / 0.3, 0, 1), a[..., 3])
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)

def sample(img, xs, ys):
    h, w = img.shape[:2]
    x0 = np.clip(np.floor(xs).astype(int), 0, w - 2); y0 = np.clip(np.floor(ys).astype(int), 0, h - 2)
    fx = np.clip(xs - x0, 0, 1)[..., None]; fy = np.clip(ys - y0, 0, 1)[..., None]
    out = (img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx) * (1 - fy) + (img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx) * fy
    out[(xs < 0) | (xs > w - 1) | (ys < 0) | (ys > h - 1)] = 0
    return out

class Puppet:
    def __init__(self, rig):
        self.rig = rig
        still = Image.open(rig["file"]).convert("RGBA")
        ox, oy = OFFSET
        self.o = lambda p: (p[0] + ox, p[1] + oy)
        base = Image.new("RGBA", (CANVAS, CANVAS)); base.paste(still, OFFSET)
        arm_mask = soft_mask(base.size, [self.o(p) for p in rig["arm"]], 1.2)
        # Arm layer: the still where the arm mask is.
        arm = np.array(base).astype(np.float32)
        arm[..., 3] *= np.array(arm_mask).astype(np.float32) / 255
        self.arm = Image.fromarray(arm.astype(np.uint8))
        # Body layer: the still with the arm's hole filled from around it (hidden torso, legs).
        hole = np.array(soft_mask(base.size, [self.o(p) for p in rig["arm"]], 0)) > 0
        hole &= np.array(base)[..., 3] > 0
        self.body = diffuse_fill(np.array(base), hole).astype(np.float32)
        # Premultiply for clean warps.
        self.body[..., :3] *= self.body[..., 3:4] / 255
        ys, xs = np.mgrid[0:CANVAS, 0:CANVAS].astype(np.float32)
        self.xs, self.ys = xs, ys
        hip, foot = rig["hip_y"] + oy, rig["foot_y"] + oy
        self.t_leg = np.clip((ys - hip) / (foot - hip), 0, 1)         # 0 at the hip, 1 at the feet
        split = rig["leg_split"] + ox
        self.back = np.clip((split + 6 - xs) / 12, 0, 1)                # back (left) leg weight
        self.front = 1 - self.back

    def body_frame(self, swing=0.0, lift_back=0.0, lift_front=0.0, bob=0.0, breathe=0.0):
        """Warped body: legs swing (px at the foot), lift, upper body bob and breath."""
        t = self.t_leg
        dx = swing * t * (self.back - self.front)
        dy = -(lift_back * self.back + lift_front * self.front) * np.sin(t * math.pi) * 1.0
        upper = 1 - t
        dy += -bob * upper
        # Breathing: stretch the upper body up from the hip.
        hip = self.rig["hip_y"] + OFFSET[1]
        dy += -breathe * np.clip((hip - self.ys) / 140, 0, 1)
        out = sample(self.body, self.xs - dx, self.ys - dy)
        a = out[..., 3:4]
        out[..., :3] = np.where(a > 0, out[..., :3] / np.maximum(a, 1e-3) * 255, 0)
        return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

    def frame(self, arm_angle=0.0, arm_shift=(0, 0), lean=0.0, shift=(0, 0), flash=0.0, **body):
        img = self.body_frame(**body)
        sx, sy = self.o(self.rig["shoulder"])
        bob = body.get("bob", 0.0) + body.get("breathe", 0.0) * 0.5
        arm = self.arm.rotate(math.degrees(arm_angle), resample=Image.BICUBIC, center=(sx, sy),
                              translate=(arm_shift[0], arm_shift[1] - bob))
        img.alpha_composite(arm)
        if flash:
            white = Image.new("RGBA", img.size, (255, 255, 255, 0))
            white.putalpha(img.getchannel("A").point(lambda v: int(v * flash)))
            img.alpha_composite(white)
        fx, fy = self.o(self.rig["feet"])
        if lean or shift != (0, 0):
            img = img.rotate(math.degrees(lean), resample=Image.BICUBIC, center=(fx, fy), translate=shift)
        return img

def clips(p):
    walk = []
    for k in range(8):
        ph = k / 8 * math.tau
        walk.append(p.frame(swing=11 * math.sin(ph), lift_back=7 * max(0, math.cos(ph)), lift_front=7 * max(0, -math.cos(ph)),
                            bob=4 * abs(math.cos(ph)), arm_angle=-0.14 * math.sin(ph), lean=-0.05))
    idle = [p.frame(breathe=2.2 * math.sin(k / 6 * math.tau), arm_angle=0.04 * math.sin(k / 6 * math.tau)) for k in range(6)]
    # Attack: raise the sword back and up, slash down and forward (strike on frame 3), recover.
    attack = [p.frame(arm_angle=a, lean=l, shift=s) for a, l, s in [
        (0.35, 0.04, (-2, 0)), (0.85, 0.08, (-4, 0)), (1.05, 0.09, (-5, 0)),
        (-0.55, -0.1, (8, 0)), (-0.45, -0.08, (6, 0)), (-0.1, -0.02, (2, 0))]]
    hurt = [p.frame(lean=l, shift=(s, 0), flash=f, arm_angle=a) for l, s, f, a in [
        (0.14, -7, 0.55, 0.2), (0.1, -5, 0.25, 0.14), (0.05, -2, 0, 0.06), (0, 0, 0, 0)]]
    # Death: topple backwards around the feet, sword arm drops, lands lying down.
    death = [p.frame(lean=l, shift=(s, d), arm_angle=a) for l, s, d, a in [
        (0.15, -2, 0, 0.1), (0.45, -4, 2, 0.3), (0.85, -2, 6, 0.6), (1.2, 4, 10, 0.9), (1.42, 10, 14, 1.1), (1.5, 12, 16, 1.2)]]
    return {"idle": idle, "walk": walk, "attack": attack, "hurt": hurt, "death": death}

def key_black(rgb):
    """Black background to alpha. Only dark pixels connected to the image border are background
    (flood fill), so dark feathers inside the figure stay opaque; the silhouette edge keeps a
    brightness-based soft alpha with un-premultiplied colour so glowing rims keep their hue."""
    bright = rgb.max(axis=2)
    keyed = np.clip((bright - 14) / 40, 0, 1)
    marks = Image.fromarray(np.where(bright < 22, 0, 255).astype(np.uint8)).copy()  # copy: floodfill is a no-op on array-backed images
    h, w = bright.shape
    for x in range(0, w, 16):  # seed the fill all along the border
        for y in (0, h - 1):
            if marks.getpixel((x, y)) == 0: ImageDraw.floodfill(marks, (x, y), 128)
    for y in range(0, h, 16):
        for x in (0, w - 1):
            if marks.getpixel((x, y)) == 0: ImageDraw.floodfill(marks, (x, y), 128)
    solid = Image.fromarray(np.where(np.array(marks) == 128, 0, 255).astype(np.uint8))
    # Opaque core: the solid shape shrunk by 1 px and softened, so only the rim uses the key.
    core = np.array(solid.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1))).astype(np.float32) / 255
    a = np.maximum(keyed, core)
    from_key = keyed >= a - 1e-3
    col = np.where(from_key[..., None], rgb / np.maximum(keyed, 1e-3)[..., None], rgb)
    return np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)

def flash(img, amount):
    white = Image.new("RGBA", img.size, (255, 255, 255, 0))
    white.putalpha(img.getchannel("A").point(lambda v: int(v * amount)))
    out = img.copy(); out.alpha_composite(white); return out

def strip_clips(cfg):
    src = Image.open(cfg["file"])
    rgba = np.array(src.convert("RGBA")) if src.mode == "RGBA" else key_black(np.array(src.convert("RGB")).astype(np.float32))
    alpha = rgba[..., 3] > 76
    cols = alpha.any(axis=0)
    runs, start = [], None
    for x, on in enumerate(list(cols) + [False]):
        if on and start is None: start = x
        if not on and start is not None:
            if x - start > 40: runs.append((start, x))
            start = None
    if cfg.get("cell"):  # frames already registered on a shared canvas: one run per cell
        runs = [(x, x + cfg["cell"]) for x in range(0, alpha.shape[1], cfg["cell"])]
    rows = np.where(alpha.any(axis=1))[0]
    top, bottom = rows.min(), rows.max() + 1
    r0, r1 = cfg.get("align_rows", (0, 0))
    # Align point per frame: the rightmost pixel (beak tip) or the centre (helmet) of the align rows.
    def align_x(x0, x1):
        if cfg.get("cell"): return (x0 + x1) / 2
        hits = np.where(alpha[r0:r1, x0:x1].any(axis=0))[0]
        return x0 + (hits.max() if cfg.get("align", "right") == "right" else (hits.min() + hits.max()) / 2)
    tips = [align_x(x0, x1) for x0, x1 in runs]
    left = max(t - x0 for (x0, _), t in zip(runs, tips))
    right = max(x1 - t for (_, x1), t in zip(runs, tips))
    w, h = left + right, bottom - top
    scale = cfg["size"] / max(w, h)
    walker = cfg["derive"] == "walker"
    # Square frames with room for the death clip: a flyer tumbles in place, a walker falls
    # backwards (left) around its feet and sinks below them, so its feet sit right of centre at 70% height.
    side = round(max(w, h) * (2.0 if walker else 1.5))
    ax, ay = (side * 0.6, side * 0.7 - h) if walker else ((side - w) / 2 + left, (side - h) / 2)
    cycle = []
    for (x0, x1), t in zip(runs, tips):
        f = Image.new("RGBA", (side, side))
        f.alpha_composite(Image.fromarray(rgba[top:bottom, x0:x1]), (int(ax - (t - x0)), int(ay)))
        cycle.append(f)
    if walker:
        feet = (ax, ay + h)
        def pose(img, lean=0.0, shift=0.0, drop=0.0, sy=1.0, amount=0.0):
            out = img
            if sy != 1:  # breathe: stretch up from the feet
                out = out.transform(out.size, Image.AFFINE, (1, 0, 0, 0, 1 / sy, feet[1] - feet[1] / sy), resample=Image.BICUBIC)
            out = out.rotate(math.degrees(lean), resample=Image.BICUBIC, center=feet, translate=(shift * h, drop * h))
            return flash(out, amount) if amount else out
        out = {
            "walk": cycle,
            "idle": [pose(cycle[0], sy=1 + 0.018 * math.sin(k / 4 * math.tau)) for k in range(4)],
            # Lean back, then lunge forward (strike on frame 3), recover.
            "attack": [pose(cycle[i], lean=l, shift=d) for i, l, d in [
                (0, 0.06, -0.02), (0, 0.11, -0.035), (0, 0.13, -0.04), (3, -0.16, 0.08), (3, -0.11, 0.05), (0, -0.03, 0.01)]],
            "hurt": [pose(cycle[0], lean=0.13, shift=-0.035, amount=0.55), pose(cycle[0], lean=0.07, shift=-0.02, amount=0.25), pose(cycle[0], lean=0.02)],
            "death": [pose(cycle[0], lean=l, shift=d, drop=v) for l, d, v in [
                (0.15, -0.01, 0), (0.45, -0.02, 0.01), (0.85, 0, 0.03), (1.2, 0.03, 0.05), (1.42, 0.05, 0.06), (1.5, 0.06, 0.07)]],
        }
    else:
        center = (side / 2, side / 2)
        out = {
            "fly": cycle,
            "hurt": [flash(cycle[0], 0.55).rotate(10, resample=Image.BICUBIC, center=center, translate=(-side * 0.03, 0)),
                     flash(cycle[1], 0.25).rotate(6, resample=Image.BICUBIC, center=center, translate=(-side * 0.02, 0)),
                     cycle[2]],
            # Wings fold (flap frames), the body tips nose-down and spins; the renderer drops it to the ground.
            "death": [cycle[i % len(cycle)].rotate(-a, resample=Image.BICUBIC, center=center) for i, a in zip([4, 0, 4, 1, 4, 4], [15, 45, 90, 140, 190, 220])],
        }
    size = round(side * scale)
    return {name: [f.resize((size, size), Image.LANCZOS) for f in frames] for name, frames in out.items()}

def pixellab_clips(kind, target=int(os.environ.get("TD_CLIP_TARGET", 90)), root=None):  # TD_CLIP_TARGET=160: a sharper sheet (Lilith)
    """Clips from PixelLab image-to-animation jobs saved as
    ~/hero-database-assets/td/enemy-sprites-src/pixellab-<kind>/<clip>/NN.png (index 00 is the
    unchanged input frame). Every clip drops frame 0: the generated frames are slightly redrawn
    (edges, glow), so the untouched input would pop once per loop. Loops still close, since they
    were generated with last frame = first frame and their final frame is the start pose."""
    root = root or os.path.expanduser(f"~/hero-database-assets/td/enemy-sprites-src/pixellab-{kind}")
    out = {}
    for clip in ("idle", "walk", "attack", "hurt", "death"):
        files = sorted(f for f in os.listdir(os.path.join(root, clip)) if f.endswith(".png"))
        frames = [Image.open(os.path.join(root, clip, f)).convert("RGBA") for f in files]
        out[clip] = frames[1:]
    box = out["walk"][0].getchannel("A").getbbox()
    scale = target / max(box[2] - box[0], box[3] - box[1])
    size = round(out["walk"][0].width * scale)
    return {name: [f.resize((size, size), Image.LANCZOS) for f in frames] for name, frames in out.items()}

def warp_clips(kind):
    size = round(CANVAS * OUT_SCALE)
    return {name: [f.resize((size, size), Image.LANCZOS) for f in frames] for name, frames in clips(Puppet(RIGS[kind])).items()}

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/td-warp-anim.py <kind> <outdir>"); sys.exit(1)
    kind, out = sys.argv[1], sys.argv[2]
    if "--pixellab" in sys.argv:
        # --src <dir>: the frames of scripts/td-pixellab-clips.mjs (<dir>/<clip>/NN.png)
        src = sys.argv[sys.argv.index("--src") + 1] if "--src" in sys.argv else None
        result = pixellab_clips(kind, root=src)
    else:
        result = strip_clips(STRIPS[kind]) if kind in STRIPS and "--warp" not in sys.argv else warp_clips(kind)
    os.makedirs(os.path.join(out, kind), exist_ok=True)
    preview = []
    for name, frames in result.items():
        size = frames[0].width
        strip = Image.new("RGBA", (size * len(frames), size))
        for i, f in enumerate(frames):
            strip.paste(f, (i * size, 0))
        strip.save(os.path.join(out, kind, f"{kind}_{name}.png"))
        preview.append(strip)
        print(f"{kind} {name}: {len(frames)} frames, {size}px")
    sheet = Image.new("RGBA", (max(s.width for s in preview), sum(s.height for s in preview)), (58, 60, 72, 255))
    y = 0
    for s in preview:
        sheet.alpha_composite(s, (0, y)); y += s.height
    sheet.save(os.path.join(out, kind, f"{kind}_preview.png"))

if __name__ == "__main__":
    main()
