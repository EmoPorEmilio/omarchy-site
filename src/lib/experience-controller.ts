/** One logical clock for camera choreography, world colors, copy and car travel. */
export type WorldId = 'bleak' | 'quattro'
export type ExperienceMode = 'intro' | 'travel' | 'settled'
export type ExperiencePhase = 'approach' | 'crossing' | 'arrival' | 'settle' | 'settled'

export const EXPERIENCE_TIMING = {
  intro: {
    durationMs: 6700,
    approachEndMs: 900,
    crossingEndMs: 1650,
    driveStartMs: 2350,
    revealStartMs: 4200,
    settleStartMs: 5300,
  },
  travel: {
    durationMs: 3600,
    approachEndMs: 900,
    crossingEndMs: 1500,
    driveStartMs: 1650,
    revealStartMs: 2400,
    settleStartMs: 2900,
  },
} as const

export interface ExperienceSnapshot {
  readonly mode: ExperienceMode
  readonly from: WorldId
  readonly to: WorldId
  readonly committedWorld: WorldId
  readonly phase: ExperiencePhase
  readonly progress: number
  readonly phaseProgress: number
  readonly busy: boolean
  readonly contentVisibility: number
  /** 0 at the Quattro drive start, 1 at its distant resting position. */
  readonly carProgress: number
  /** Destination blend, not absolute Quattro weight. Commit occurs at 0.5. */
  readonly thresholdProgress: number
  readonly durationMs: number
}

export interface ExperienceSample {
  mode: 'intro' | 'travel'
  from: WorldId
  to: WorldId
  progress: number
  durationScale?: number
}

function clamp01(value: number) {
  return Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value))
}

function smoothstep(value: number) {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

function validScale(scale: number) {
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

function settled(world: WorldId): ExperienceSnapshot {
  return {
    mode: 'settled', from: world, to: world, committedWorld: world,
    phase: 'settled', progress: 1, phaseProgress: 1, busy: false,
    contentVisibility: 1, carProgress: 1, thresholdProgress: 1, durationMs: 0,
  }
}

/**
 * Pure capture and playback evaluator. Spatial paths must cross the physical
 * portal at crossing.phaseProgress === 0.5, matching the world commit here.
 * Intro always runs Bleak → Quattro; travel uses the supplied endpoints.
 */
export function sampleExperience(sample: ExperienceSample): ExperienceSnapshot {
  const { mode } = sample
  const from = mode === 'intro' ? 'bleak' : sample.from
  const to = mode === 'intro' ? 'quattro' : sample.to
  const progress = clamp01(sample.progress)
  if (progress >= 1 || from === to) return settled(to)

  const timing = EXPERIENCE_TIMING[mode]
  const elapsed = progress * timing.durationMs
  let phase: ExperiencePhase
  let phaseStart: number
  let phaseEnd: number

  if (elapsed < timing.approachEndMs) {
    phase = 'approach'
    phaseStart = 0
    phaseEnd = timing.approachEndMs
  } else if (elapsed < timing.crossingEndMs) {
    phase = 'crossing'
    phaseStart = timing.approachEndMs
    phaseEnd = timing.crossingEndMs
  } else if (elapsed < timing.settleStartMs) {
    phase = 'arrival'
    phaseStart = timing.crossingEndMs
    phaseEnd = timing.settleStartMs
  } else {
    phase = 'settle'
    phaseStart = timing.settleStartMs
    phaseEnd = timing.durationMs
  }

  const crossing = clamp01(
    (elapsed - timing.approachEndMs) /
      (timing.crossingEndMs - timing.approachEndMs),
  )
  // Copy arrives during the final camera/car movement, avoiding a static handoff.
  const contentVisibility = elapsed >= timing.revealStartMs
    ? smoothstep((elapsed - timing.revealStartMs) / (timing.durationMs - timing.revealStartMs))
    : mode === 'travel' ? 1 - smoothstep(elapsed / 250) : 0

  return {
    mode, from, to,
    committedWorld: crossing >= 0.5 ? to : from,
    phase, progress,
    phaseProgress: clamp01((elapsed - phaseStart) / (phaseEnd - phaseStart)),
    busy: true,
    contentVisibility,
    // Reverse travel preserves the distant car; it never drives backward.
    // Forward reset happens while Quattro is hidden before the threshold.
    carProgress: to === 'quattro'
      ? smoothstep((elapsed - timing.driveStartMs) / (timing.durationMs - timing.driveStartMs))
      : 1,
    thresholdProgress: smoothstep(crossing),
    durationMs: timing.durationMs * validScale(sample.durationScale ?? 1),
  }
}

export class ExperienceController {
  private snapshot: ExperienceSnapshot
  private journey: Omit<ExperienceSample, 'progress'> | undefined
  private elapsedMs = 0

  constructor(initialWorld: WorldId = 'bleak') {
    this.snapshot = settled(initialWorld)
  }

  get state(): ExperienceSnapshot {
    return this.snapshot
  }

  startIntro(durationScale = 1): boolean {
    if (this.snapshot.busy) return false
    return this.start({ mode: 'intro', from: 'bleak', to: 'quattro', durationScale })
  }

  startTravel(to: WorldId, durationScale = 1): boolean {
    if (this.snapshot.busy || this.snapshot.committedWorld === to) return false
    return this.start({ mode: 'travel', from: this.snapshot.committedWorld, to, durationScale })
  }

  /** Delta is milliseconds. Pause by supplying no delta; hidden time is excluded. */
  update(deltaMs: number): ExperienceSnapshot {
    if (!this.snapshot.busy || !this.journey) return this.snapshot
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return this.snapshot
    const durationMs = this.durationMs()
    this.elapsedMs = Math.min(durationMs, this.elapsedMs + deltaMs)
    this.snapshot = sampleExperience({ ...this.journey, progress: this.elapsedMs / durationMs })
    return this.snapshot
  }

  /** Explicit development seek; normal playback only advances through update. */
  seek(progress: number): ExperienceSnapshot {
    if (!this.journey) return this.snapshot
    const normalized = clamp01(progress)
    this.elapsedMs = normalized * this.durationMs()
    this.snapshot = sampleExperience({ ...this.journey, progress: normalized })
    return this.snapshot
  }

  skip(): ExperienceSnapshot {
    return this.settle(this.snapshot.to)
  }

  settle(world: WorldId): ExperienceSnapshot {
    this.journey = undefined
    this.elapsedMs = 0
    this.snapshot = settled(world)
    return this.snapshot
  }

  private durationMs() {
    if (!this.journey) return 0
    return EXPERIENCE_TIMING[this.journey.mode].durationMs * (this.journey.durationScale ?? 1)
  }

  private start(journey: Omit<ExperienceSample, 'progress'>): boolean {
    this.journey = { ...journey, durationScale: validScale(journey.durationScale ?? 1) }
    this.elapsedMs = 0
    this.snapshot = sampleExperience({ ...this.journey, progress: 0 })
    return true
  }
}
