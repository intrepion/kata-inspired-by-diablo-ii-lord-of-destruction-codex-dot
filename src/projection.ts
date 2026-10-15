export type Point = { x: number; y: number };
export type Camera = Point & { width: number; height: number; scale: number };
export const SPRITE_SCALE = 1.3;
export function cameraAt(point: Point, width = 960, height = 600): Camera {
  return { x: point.x, y: point.y, width, height, scale: 1.2 };
}
export function project(point: Point, camera: Camera, elevation = 0): Point {
  const dx = point.x - camera.x,
    dy = point.y - camera.y;
  return {
    x: camera.width / 2 + (dx - dy) * camera.scale,
    y: camera.height * 0.56 + ((dx + dy) * camera.scale) / 2 - elevation,
  };
}
export function groundAt(point: Point, camera: Camera): Point {
  const across = (point.x - camera.width / 2) / camera.scale;
  const down = (point.y - camera.height * 0.56) / camera.scale;
  return { x: camera.x + across / 2 + down, y: camera.y - across / 2 + down };
}
/** Keyboard conveniences remain aligned with the viewport; rules continue to use world axes. */
export function groundDirection(dx: number, dy: number): Point {
  const x = dx / 2 + dy,
    y = dy - dx / 2,
    length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
export function canvasPoint(
  client: Point,
  rect: { left: number; top: number; width: number; height: number },
  camera: Camera,
): Point | null {
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    !Number.isFinite(client.x) ||
    !Number.isFinite(client.y)
  )
    return null;
  return {
    x: ((client.x - rect.left) / rect.width) * camera.width,
    y: ((client.y - rect.top) / rect.height) * camera.height,
  };
}
export function foeScale(kind: string): number {
  return (
    SPRITE_SCALE *
    (["bell", "mire", "king"].includes(kind) ? 1.7 : kind === "brute" ? 1.3 : 1)
  );
}
type PickableFoe = Point & { id: number; hp: number; kind: string };
/** Pick upright sprite bodies, frontmost first, rather than inverse-projecting their elevated heads onto the floor. */
export function pickFoe(
  point: Point,
  camera: Camera,
  foes: readonly PickableFoe[],
): number | undefined {
  return [...foes]
    .filter((foe) => foe.hp > 0)
    .sort((a, b) => b.x + b.y - a.x - a.y || b.id - a.id)
    .find((foe) => {
      const foot = project(foe, camera),
        scale = foeScale(foe.kind);
      return (
        Math.abs(point.x - foot.x) <= 28 * scale &&
        point.y >= foot.y - 53 * scale &&
        point.y <= foot.y + 12 * scale
      );
    })?.id;
}
