import { EXPERIENCE_TIMING, type ExperienceSnapshot } from './experience-controller'

export interface WorldPresentation {
  /** Absolute world weight: Barrens = 0, Quattro = 1. */
  quattroMix: number
  thresholdVeil: number
}

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

/** One appearance sample for DOM and GPU, independent of render frequency. */
export function sampleWorldPresentation(state: ExperienceSnapshot): WorldPresentation {
  if (state.mode === 'settled') return {
    quattroMix: state.committedWorld === 'quattro' ? 1 : 0,
    thresholdVeil: 0,
  }
  const timing = EXPERIENCE_TIMING[state.mode]
  const commitMs = (timing.approachEndMs + timing.crossingEndMs) / 2
  const destinationMix = smooth((state.progress * timing.durationMs - (commitMs - 750)) / 1500)
  return {
    quattroMix: state.from === 'quattro' ? 1 - destinationMix : destinationMix,
    thresholdVeil: state.phase === 'crossing'
      ? smooth(1 - Math.abs(state.phaseProgress - .5) / .3) : 0,
  }
}
