export type CameraPoint = readonly [number, number, number]
export interface CompactCameraPose {
  position: CameraPoint
  target: CameraPoint
  fov: number
}
interface CompactTravelFrame {
  phase: 'approach' | 'crossing' | 'arrival' | 'settle' | 'settled'
  phaseProgress: number
  arrivalProgress: number
  direction: -1 | 1
}
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}
const pointBetween = (a: CameraPoint, b: CameraPoint, t: number): CameraPoint => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
function blend(a: CompactCameraPose, b: CompactCameraPose, t: number): CompactCameraPose {
  return { position: pointBetween(a.position, b.position, t), target: pointBetween(a.target, b.target, t), fov: a.fov + (b.fov - a.fov) * t }
}

/** A physical portal crossing without the desktop's lateral car-view orbit. */
export function sampleCompactCamera(
  frame: CompactTravelFrame,
  from: CompactCameraPose,
  to: CompactCameraPose,
  portal: CameraPoint,
): CompactCameraPose {
  const { direction } = frame
  const target: CameraPoint = [portal[0] - direction * 8, portal[1] + .5, portal[2]]
  const entry: CompactCameraPose = {
    position: [portal[0] + direction * 1.4, portal[1] + .5, portal[2]],
    target,
    fov: 48,
  }
  const exit: CompactCameraPose = {
    ...entry,
    position: [portal[0] - direction * 1.4, portal[1] + .5, portal[2]],
  }
  if (frame.phase === 'approach') return blend(from, entry, smooth(frame.phaseProgress))
  if (frame.phase === 'crossing') return blend(entry, exit, smooth(frame.phaseProgress))
  if (frame.phase === 'arrival' || frame.phase === 'settle') return blend(exit, to, smooth(frame.arrivalProgress))
  return to
}
