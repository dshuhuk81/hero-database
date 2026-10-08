// Playback uses the caller's simulation clock, so pause and speed affect every layer equally.
export function atlasFrame(clip, seconds, loop = false) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  let frame = Math.floor(seconds * clip.fps);
  if (loop && clip.loop && frame >= clip.loop[1]) {
    const [start, end] = clip.loop;
    frame = start + (frame - start) % (end - start);
  }
  return frame < clip.frames ? frame : null;
}

// A normal atlas preserves smoke/occlusion; an additive atlas preserves emitted light.
// Both share a frame and pivot, so switching clips never moves the effect's feet.
export async function loadFxAtlas(PIXI, clip, base = '/td/fx/effekseer-v1') {
  const textures = await Promise.all(['normal', 'add'].map(layer => PIXI.Assets.load(`${base}/${clip.id}-${layer}.webp`)));
  const frames = textures.map(texture => Array.from({ length: clip.frames }, (_, i) => new PIXI.Texture({
    source: texture.source,
    frame: new PIXI.Rectangle((i % clip.columns) * clip.size, Math.floor(i / clip.columns) * clip.size, clip.size, clip.size),
  })));
  return {
    duration: clip.frames / clip.fps,
    create(parent, x, y, width = clip.width) {
      const container = new PIXI.Container();
      container.position.set(x, y);
      const sprites = frames.map((layer, index) => {
        const sprite = new PIXI.Sprite(layer[0]);
        sprite.anchor.set(...clip.anchor);
        sprite.width = sprite.height = width;
        sprite.blendMode = index ? 'add' : 'normal';
        container.addChild(sprite);
        return sprite;
      });
      parent.addChild(container);
      return {
        container,
        seek(seconds, loop = false) {
          const frame = atlasFrame(clip, seconds, loop);
          container.visible = frame !== null;
          if (frame !== null) sprites.forEach((sprite, index) => { sprite.texture = frames[index][frame]; });
          return frame !== null;
        },
        destroy() { container.destroy({ children: true }); },
      };
    },
    destroy() { frames.flat().forEach(texture => texture.destroy(false)); },
  };
}
