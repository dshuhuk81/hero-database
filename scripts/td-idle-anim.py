# Procedural idle loop (M24) from a static full-body portrait: feet pinned, body sways from
# the hips up, chest breathes, cloth and hair ripple slightly. Writes {name}-idle-v1.webp (24
# square head-to-waist frames at 224 px, the recruit preview's format) and a preview GIF.
#   python3 scripts/td-idle-anim.py public/td/heroes-alt/review-set-v1/odin.webp odin <outdir> [--version v2]
# Needs numpy and Pillow. Output goes to public/td/heroes-alt/anims/ and R2 td/heroes-alt/anims/.
import sys, math, numpy as np
from PIL import Image

def bilinear(img, xs, ys):
    h, w = img.shape[:2]
    x0 = np.clip(np.floor(xs).astype(int), 0, w - 2); y0 = np.clip(np.floor(ys).astype(int), 0, h - 2)
    fx = np.clip(xs - x0, 0, 1)[..., None]; fy = np.clip(ys - y0, 0, 1)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    out = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
    outside = (xs < 0) | (xs > w - 1) | (ys < 0) | (ys > h - 1)
    out[outside] = 0
    return out

def frames(src, n=24, width=240, pad=12, sway=0.018, breathe=0.012, ripple=0.006):
    im = Image.open(src).convert("RGBA")
    im = im.crop(im.getchannel("A").getbbox())
    h = round(im.height * (width - 2 * pad) / im.width)
    im = im.resize((width - 2 * pad, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (width, h + 2 * pad)); canvas.paste(im, (pad, pad))
    # premultiply so edges blend cleanly
    arr = np.asarray(canvas).astype(np.float32) / 255
    arr[..., :3] *= arr[..., 3:4]
    H, W = arr.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    feet = H - pad; cx = W / 2
    up = np.clip((feet - ys) / (feet - pad), 0, 1)          # 0 at feet, 1 at head
    chest = np.exp(-((up - 0.62) / 0.16) ** 2)              # breathing band
    out = []
    for i in range(n):
        p = 2 * math.pi * i / n
        dx = sway * W * math.sin(p) * up ** 1.6                          # body sway, feet fixed
        dx += ripple * W * np.sin(p - 4 * up) * up ** 2                  # cloth / hair lag
        s = 1 + breathe * math.sin(p) * chest                            # chest widens
        sy = 1 + breathe * 0.6 * (1 + math.sin(p)) / 2                   # body rises a touch
        src_x = cx + (xs - dx - cx) / s
        src_y = feet - (feet - ys) / sy
        f = bilinear(arr, src_x, src_y)
        a = f[..., 3:4]; rgb = np.where(a > 0, f[..., :3] / np.maximum(a, 1e-6), 0)
        out.append(Image.fromarray((np.concatenate([rgb, a], -1) * 255).clip(0, 255).astype(np.uint8), "RGBA"))
    return out

if __name__ == "__main__":
    src, name, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
    # --version vN: art version of a redrawn hero (tdSkinMythic.json "art"), file {name}-idle-vN.webp
    version = sys.argv[sys.argv.index("--version") + 1] if "--version" in sys.argv else "v1"
    fr = frames(src)
    W, H = fr[0].size
    # Recruit preview frames: square, head to waist (same crop as the still portrait preview).
    top = 6
    sq = [f.crop((0, top, W, top + W)).resize((224, 224), Image.LANCZOS) for f in fr]
    sheet = Image.new("RGBA", (224 * len(sq), 224))
    for i, f in enumerate(sq): sheet.paste(f, (i * 224, 0))
    sheet.save(f"{outdir}/{name}-idle-{version}.webp", quality=86, method=6)
    bg = (24, 22, 34, 255)
    gif = [Image.alpha_composite(Image.new("RGBA", f.size, bg), f).convert("P", palette=Image.ADAPTIVE) for f in fr]
    if "--gif" in sys.argv:  # preview only; keep it out of public/ (it would be uploaded)
        gif[0].save(f"{outdir}/{name}-idle.gif", save_all=True, append_images=gif[1:], duration=100, loop=0, disposal=2)
    print(name, sheet.size)
