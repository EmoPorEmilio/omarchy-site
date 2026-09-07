import { createSignal, onCleanup, onMount } from 'solid-js'

import { ExperienceController, type ExperienceSnapshot, type WorldId } from '../lib/experience-controller'
import { isCrawler, markIntroSeen, readExperiencePreferences, rememberWorld } from '../lib/experience-preferences'
import { sampleWorldPresentation } from '../lib/world-presentation'
import type { PortalProjection } from '../lib/stage-one-world'
import { advanceSceneVisibility, SCENE_REVEAL_MS, SCENE_TIMEOUT_MS, type SceneVisibility, type SceneVisibilityEvent } from '../lib/scene-visibility'
import '../styles/portal-interaction.css'

const STILL_PORTALS: Record<WorldId, PortalProjection> = {
  quattro: { x: 0.141648, y: 0.608074, width: 0.124466, height: 0.242105, visible: true },
  bleak: { x: 0.516586, y: 0.441232, width: 0.179535, height: 0.294616, visible: true },
}
// Quattro sunHalo projected by the camera used to export the 951 × 732 still.
const STILL_SUN = { x: 0.572358, y: 0.391169 }

export function WorldCanvas() {
  let host: HTMLDivElement | undefined
  let portalButton: HTMLButtonElement | undefined
  let worldButton: HTMLButtonElement | undefined
  let skipButton: HTMLButtonElement | undefined
  let fallbackStill: HTMLImageElement | undefined
  let runtime: Awaited<ReturnType<typeof import('../lib/stage-one-world').mountStageOneWorld>> | undefined
  let restorePortalFocus = false
  let stopped = false
  let pointerInsidePortal = false
  let portalFocused = false
  let skipRequested = false
  let awaitingIntroPlayback = false
  const fallbackController = new ExperienceController('bleak')
  const [state, setState] = createSignal<ExperienceSnapshot>(fallbackController.state)
  const [projection, setProjection] = createSignal<PortalProjection>(STILL_PORTALS.bleak)
  const [visibility, setVisibility] = createSignal<SceneVisibility>('loading')
  const initializing = () => visibility() !== 'live' && visibility() !== 'fallback'
  const fallback = () => !visibility().endsWith('live')
  const destination = () => state().committedWorld === 'quattro' ? 'bleak' : 'quattro'
  const destinationName = () => destination() === 'bleak' ? 'The Barrens' : 'Quattro'
  let revealDeadline: ReturnType<typeof setTimeout> | undefined
  let presentationFrame = 0
  const finishReveal = () => transitionVisibility('reveal-finished')
  const transitionVisibility = (event: SceneVisibilityEvent) => {
    if (stopped) return
    const next = advanceSceneVisibility(visibility(), event)
    if (next === visibility()) return
    setVisibility(next)
    document.documentElement.dataset.sceneState = next
    if (next.startsWith('presenting-')) {
      // Composite the completed scene beneath an opaque cover before starting
      // the fade. The first canvas upload must not consume its animation time.
      presentationFrame = requestAnimationFrame(() => {
        presentationFrame = requestAnimationFrame(() => transitionVisibility('presented'))
      })
    }
    if (next.startsWith('revealing-')) {
      // The ready canvas (or decoded still) is exposed beneath one fading cover.
      // Let the actual CSS transition finish: a wall-clock-only deadline can
      // expire while a slow first composite is still blocking presentation.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finishReveal()
      else revealDeadline = setTimeout(finishReveal, SCENE_REVEAL_MS + 1000)
    }
    if (next === 'live' || next === 'fallback') {
      if (revealDeadline) clearTimeout(revealDeadline)
      cancelAnimationFrame(presentationFrame)
      if (window.__omarchySceneBoot) clearTimeout(window.__omarchySceneBoot.timer)
      delete window.__omarchySceneBoot
    }
  }

  const projectFallbackPortal = () => {
    if (!host || !fallback()) return
    const width = host.clientWidth
    const height = host.clientHeight
    if (!width || !height) return
    // Both exported scene stills are 951 × 732, centered with object-fit: contain.
    const scale = Math.min(width / 951, height / 732)
    const imageWidth = 951 * scale
    const imageHeight = 732 * scale
    const portal = STILL_PORTALS[state().committedWorld]
    setProjection({
      x: ((width - imageWidth) / 2 + portal.x * imageWidth) / width,
      y: ((height - imageHeight) / 2 + portal.y * imageHeight) / height,
      width: portal.width * imageWidth / width,
      height: portal.height * imageHeight / height,
      visible: true,
    })
    const hero = host.closest<HTMLElement>('.landing-hero')
    const landing = host.closest<HTMLElement>('.landing')
    if (hero && landing) {
      const hostBounds = host.getBoundingClientRect()
      const heroBounds = hero.getBoundingClientRect()
      const imageLeft = hostBounds.left - heroBounds.left + (width - imageWidth) / 2
      const imageTop = hostBounds.top - heroBounds.top + (height - imageHeight) / 2
      landing.style.setProperty('--world-sun-x', `${100 * (imageLeft + STILL_SUN.x * imageWidth) / heroBounds.width}%`)
      landing.style.setProperty('--world-sun-y', `${100 * (imageTop + STILL_SUN.y * imageHeight) / heroBounds.height}%`)
      landing.style.setProperty('--world-sun-visibility', String(sampleWorldPresentation(state()).quattroMix))
    }
  }

  const applyState = (next: ExperienceSnapshot) => {
    if (stopped) return
    const landing = host?.closest<HTMLElement>('.landing')
    const copy = landing?.querySelector<HTMLElement>('.landing-copy')
    const wasBusy = state().busy
    const focused = document.activeElement
    const concealCopy = next.contentVisibility < 0.95
    const mustMoveFocus = next.busy && (
      (restorePortalFocus && !wasBusy) || focused === portalButton || focused === worldButton || Boolean(concealCopy && copy?.contains(focused))
    )

    if (mustMoveFocus) restorePortalFocus = true
    if (!wasBusy && next.busy) {
      pointerInsidePortal = false
      portalFocused = false
      runtime?.setPortalHovered(false)
    }
    setState(next)
    projectFallbackPortal()
    if (landing) {
      landing.dataset.world = next.committedWorld
      landing.dataset.cinematic = next.busy ? 'true' : 'settled'
      landing.dataset.travel = next.mode
      landing.style.setProperty('--hero-reveal', String(next.contentVisibility))
      const presentation = sampleWorldPresentation(next)
      landing.style.setProperty('--world-mix', String(presentation.quattroMix))
      landing.style.setProperty('--threshold-veil', String(presentation.thresholdVeil))
    }
    document.documentElement.dataset.world = next.committedWorld
    if (copy) copy.inert = concealCopy

    if (mustMoveFocus) queueMicrotask(() => {
      if (!stopped && state().busy) skipButton?.focus({ preventScroll: true })
    })
    if (wasBusy && !next.busy && restorePortalFocus) {
      restorePortalFocus = false
      queueMicrotask(() => {
        if (stopped || state().busy) return
        const compactControl = worldButton?.getClientRects().length ? worldButton : undefined
        const target = !initializing()
          ? compactControl ?? (projection().visible ? portalButton : landing?.querySelector<HTMLAnchorElement>('.landing-brand'))
          : landing?.querySelector<HTMLAnchorElement>('.landing-brand')
        const bounds = target?.getBoundingClientRect()
        if (bounds && bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth) target?.focus({ preventScroll: true })
      })
    }
  }

  const enterPortal = () => {
    if (state().busy) return
    const next = destination()
    // Projection updates can hide the portal before the state callback arrives.
    // Remember activation focus before the runtime makes that element hidden.
    if ((document.activeElement === portalButton || document.activeElement === worldButton) && runtime) restorePortalFocus = true
    if (runtime) runtime.travel(next)
    else if (!initializing()) {
      applyState(fallbackController.settle(next))
      rememberWorld(next)
    }
  }

  const syncPortalHover = () => runtime?.setPortalHovered(
    !state().busy && (pointerInsidePortal || portalFocused),
  )

  onMount(() => {
    const loader = document.querySelector('.world-loader')
    const revealEnded = (event: Event) => {
      if (event.target === loader && (event as TransitionEvent).propertyName === 'opacity') finishReveal()
    }
    loader?.addEventListener('transitionend', revealEnded)
    const relinquishFocusOnScroll = () => { if (state().busy) restorePortalFocus = false }
    const trackFocus = (event: FocusEvent) => {
      if (state().busy && event.target !== skipButton && event.target !== portalButton && event.target !== worldButton) restorePortalFocus = false
    }
    window.addEventListener('scroll', relinquishFocusOnScroll, { passive: true })
    document.addEventListener('focusin', trackFocus)
    const initialization = new AbortController()
    const fallbackResize = new ResizeObserver(projectFallbackPortal)
    if (host) fallbackResize.observe(host)
    const hero = host?.closest<HTMLElement>('.landing-hero')
    if (hero) fallbackResize.observe(hero)
    const query = new URLSearchParams(location.search)
    const requestedWorld = import.meta.env.DEV ? query.get('world') : null
    const forcedWorld = requestedWorld === 'bleak' || requestedWorld === 'quattro' ? requestedWorld : undefined
    const preferences = readExperiencePreferences()
    const crawler = isCrawler()
    // Adopt the pre-paint state. A watchdog that already failed open is terminal.
    const bootState = document.documentElement.dataset.sceneState
    if (crawler || bootState === 'fallback') transitionVisibility('fail-open')
    else document.documentElement.dataset.sceneState = 'loading'
    awaitingIntroPlayback = import.meta.env.DEV && query.get('intro') === 'play'
      && !crawler && !forcedWorld
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && !(import.meta.env.DEV && (query.get('capture') === '1' || query.get('renderer') === 'fallback'))
    if (awaitingIntroPlayback) fallbackController.startIntro()
    else fallbackController.settle(forcedWorld ?? preferences.world)
    applyState(fallbackController.state)
    let timedOut = false
    let deadline: ReturnType<typeof setTimeout> | undefined
    const useFallback = async (immediate = false) => {
      if (stopped) return
      if (host) host.dataset.renderer = 'unavailable'
      applyState(fallbackController.settle(state().to))
      if (!immediate) {
        try { await fallbackStill?.decode() } catch { /* Retain usable copy if the art request fails. */ }
      }
      if (!stopped) transitionVisibility(immediate ? 'fail-open' : 'fallback-ready')
    }
    const failOpen = () => {
      timedOut = true
      initialization.abort()
      void useFallback(true)
    }
    window.addEventListener('omarchy-scene-timeout', failOpen)

    const initialize = async () => {
      if (!host) return
      const remaining = window.__omarchySceneBoot
        ? Math.max(0, window.__omarchySceneBoot.deadline - Date.now())
        : import.meta.env.DEV && query.get('capture') === '1' ? 60000 : SCENE_TIMEOUT_MS
      deadline = setTimeout(failOpen, remaining)
      try {
        const { shouldForceRendererFallback } = await import('../lib/quality-policy')
        if (stopped || timedOut) return
        if (shouldForceRendererFallback()) {
          await useFallback()
          return
        }
        const [{ mountStageOneWorld }] = await Promise.all([
          import('../lib/stage-one-world'),
          document.fonts.ready,
        ])
        if (stopped || timedOut || !host) return
        const world = await mountStageOneWorld(host, {
          signal: initialization.signal,
          onStateChange: (next) => {
            if (stopped || timedOut || (skipRequested && initializing())) return
            // The runtime renders a settled preparation frame before its clock
            // starts. Keep the opening presentation until the intro actually begins.
            if (awaitingIntroPlayback && next.mode === 'settled') return
            awaitingIntroPlayback = false
            applyState(next)
          },
          onPortalProjectionChange: (next) => {
            if (!stopped && !timedOut) setProjection(next)
          },
        })
        if (stopped || timedOut) {
          world.dispose()
          return
        }
        runtime = world
        host.dataset.renderer = world.backend
        if (skipRequested) world.skipIntro()
        transitionVisibility('frame-ready')
        world.start()
      } catch (error) {
        if (!stopped && !timedOut) {
          console.warn('Homepage renderer initialization failed.', error)
          await useFallback()
        }
      } finally {
        if (deadline) clearTimeout(deadline)
      }
    }

    if (crawler || bootState === 'fallback') void useFallback(true)
    else void initialize()
    onCleanup(() => {
      stopped = true
      loader?.removeEventListener('transitionend', revealEnded)
      window.removeEventListener('scroll', relinquishFocusOnScroll)
      document.removeEventListener('focusin', trackFocus)
      initialization.abort()
      window.removeEventListener('omarchy-scene-timeout', failOpen)
      fallbackResize.disconnect()
      if (deadline) clearTimeout(deadline)
      if (revealDeadline) clearTimeout(revealDeadline)
      cancelAnimationFrame(presentationFrame)
      if (window.__omarchySceneBoot) clearTimeout(window.__omarchySceneBoot.timer)
      delete window.__omarchySceneBoot
      delete document.documentElement.dataset.sceneState
      runtime?.dispose()
      runtime = undefined
      const landing = host?.closest<HTMLElement>('.landing')
      const copy = landing?.querySelector<HTMLElement>('.landing-copy')
      if (copy) copy.inert = false
      landing?.style.removeProperty('--hero-reveal')
      landing?.style.removeProperty('--world-mix')
      landing?.style.removeProperty('--threshold-veil')
      landing?.style.removeProperty('--world-sun-x')
      landing?.style.removeProperty('--world-sun-y')
      landing?.style.removeProperty('--world-sun-visibility')
      landing?.removeAttribute('data-world')
      landing?.removeAttribute('data-cinematic')
      landing?.removeAttribute('data-travel')
      delete document.documentElement.dataset.world
    })
  })

  return (
    <>
      <div class="world-layer" data-fallback={fallback() ? 'true' : 'false'}>
        <div class="world-host" ref={host} aria-hidden="true">
          <img
            ref={fallbackStill}
            class="world-fallback-still"
            src={`/art/${state().committedWorld}.webp`}
            alt=""
            onLoad={() => { if (!stopped) projectFallbackPortal() }}
          />
        </div>
        <button
          ref={portalButton}
          class="portal-control"
          type="button"
          aria-label={`Enter ${destinationName()}`}
          aria-disabled={state().busy}
          hidden={initializing() || state().busy || !projection().visible}
          style={{
            left: `${projection().x * 100}%`,
            top: `${projection().y * 100}%`,
            width: `${projection().width * 100}%`,
            height: `${projection().height * 100}%`,
          }}
          onPointerEnter={() => { pointerInsidePortal = true; syncPortalHover() }}
          onPointerLeave={() => { pointerInsidePortal = false; syncPortalHover() }}
          onFocus={() => { portalFocused = true; syncPortalHover() }}
          onBlur={() => { portalFocused = false; syncPortalHover() }}
          onClick={enterPortal}
        >
          <span class="portal-control-corners" aria-hidden="true" />
          <span class="portal-control-label" aria-hidden="true">
            <span class="portal-control-dot" />
            Enter {destinationName()} <span class="portal-control-arrow">↗</span>
          </span>
        </button>
      </div>
      <button
        ref={worldButton}
        class="world-switch"
        type="button"
        disabled={initializing() || state().busy}
        aria-busy={state().busy}
        style={{ visibility: initializing() ? 'hidden' : 'visible' }}
        onPointerEnter={() => { pointerInsidePortal = true; syncPortalHover() }}
        onPointerLeave={() => { pointerInsidePortal = false; syncPortalHover() }}
        onFocus={() => { portalFocused = true; syncPortalHover() }}
        onBlur={() => { portalFocused = false; syncPortalHover() }}
        onClick={enterPortal}
      >
        <span>{state().busy ? 'Travelling' : destination() === 'quattro' ? 'Enter Quattro' : 'Return to The Barrens'}</span>
        <span aria-hidden="true">{state().busy ? '···' : '↗'}</span>
      </button>
      <button
        ref={skipButton}
        class="landing-intro-skip"
        type="button"
        hidden={!state().busy}
        onClick={() => {
          restorePortalFocus = true
          if (runtime) runtime.skipIntro()
          else {
            skipRequested = true
            awaitingIntroPlayback = false
            markIntroSeen()
            const destination = state().to
            rememberWorld(destination)
            applyState(fallbackController.settle(destination))
          }
        }}
      >
        {state().mode === 'intro' ? 'Skip intro' : 'Finish journey'}
        <span aria-hidden="true"> ↗</span>
      </button>
    </>
  )
}
