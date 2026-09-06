import { createSignal, onCleanup, onMount } from 'solid-js'

import logoUrl from '../../brand/omarchy-logo.svg?url'
import { ExperienceController, type ExperienceSnapshot, type WorldId } from '../lib/experience-controller'
import { isCrawler, markIntroSeen, readExperiencePreferences, rememberWorld } from '../lib/experience-preferences'
import { sampleWorldPresentation } from '../lib/world-presentation'
import type { PortalProjection } from '../lib/stage-one-world'
import '../styles/portal-interaction.css'

const STILL_PORTALS: Record<WorldId, PortalProjection> = {
  quattro: { x: 0.141648, y: 0.608074, width: 0.124466, height: 0.242105, visible: true },
  bleak: { x: 0.516586, y: 0.441232, width: 0.179535, height: 0.294616, visible: true },
}

export function WorldCanvas() {
  let host: HTMLDivElement | undefined
  let portalButton: HTMLButtonElement | undefined
  let skipButton: HTMLButtonElement | undefined
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
  const [fallback, setFallback] = createSignal(true)
  const [initializing, setInitializing] = createSignal(true)
  const [mounted, setMounted] = createSignal(false)
  const [loadingDismissed, setLoadingDismissed] = createSignal(false)
  const destination = () => state().committedWorld === 'quattro' ? 'bleak' : 'quattro'
  const destinationName = () => destination() === 'bleak' ? 'The Barrens' : 'Quattro'
  const showLoader = () => mounted() && initializing() && !loadingDismissed()

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
  }

  const applyState = (next: ExperienceSnapshot) => {
    if (stopped) return
    const landing = host?.closest<HTMLElement>('.landing')
    const copy = landing?.querySelector<HTMLElement>('.landing-copy')
    const wasBusy = state().busy
    const focused = document.activeElement
    const concealCopy = next.contentVisibility < 0.95
    const mustMoveFocus = next.busy && (
      (restorePortalFocus && !wasBusy) || focused === portalButton || Boolean(concealCopy && copy?.contains(focused))
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
        const target = !initializing() && projection().visible
          ? portalButton : landing?.querySelector<HTMLAnchorElement>('.landing-brand')
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
    if (document.activeElement === portalButton && runtime) restorePortalFocus = true
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
    const relinquishFocusOnScroll = () => { if (state().busy) restorePortalFocus = false }
    const trackFocus = (event: FocusEvent) => {
      if (state().busy && event.target !== skipButton && event.target !== portalButton) restorePortalFocus = false
    }
    window.addEventListener('scroll', relinquishFocusOnScroll, { passive: true })
    document.addEventListener('focusin', trackFocus)
    const initialization = new AbortController()
    const fallbackResize = new ResizeObserver(projectFallbackPortal)
    if (host) fallbackResize.observe(host)
    const query = new URLSearchParams(location.search)
    const requestedWorld = import.meta.env.DEV ? query.get('world') : null
    const forcedWorld = requestedWorld === 'bleak' || requestedWorld === 'quattro' ? requestedWorld : undefined
    const preferences = readExperiencePreferences()
    const crawler = isCrawler()
    awaitingIntroPlayback = import.meta.env.DEV && query.get('intro') === 'play'
      && !crawler && !forcedWorld
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && !(import.meta.env.DEV && (query.get('capture') === '1' || query.get('renderer') === 'fallback'))
    if (awaitingIntroPlayback) fallbackController.startIntro()
    else fallbackController.settle(forcedWorld ?? preferences.world)
    applyState(fallbackController.state)
    let timedOut = false
    let deadline: ReturnType<typeof setTimeout> | undefined
    const useFallback = () => {
      if (stopped) return
      setInitializing(false)
      setFallback(true)
      if (host) host.dataset.renderer = 'unavailable'
      applyState(fallbackController.settle(state().to))
    }

    const initialize = async () => {
      if (!host) return
      deadline = setTimeout(() => {
        timedOut = true
        initialization.abort()
        useFallback()
      }, import.meta.env.DEV && query.get('capture') === '1' ? 60000 : 30000)
      try {
        const { shouldForceRendererFallback } = await import('../lib/quality-policy')
        if (stopped || timedOut) return
        if (shouldForceRendererFallback()) {
          useFallback()
          return
        }
        const { mountStageOneWorld } = await import('../lib/stage-one-world')
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
        setInitializing(false)
        setFallback(false)
        host.dataset.renderer = world.backend
        if (skipRequested) world.skipIntro()
        world.start()
      } catch (error) {
        if (!stopped && !timedOut) {
          console.warn('Homepage renderer initialization failed.', error)
          useFallback()
        }
      } finally {
        if (deadline) clearTimeout(deadline)
      }
    }

    if (crawler) useFallback()
    else {
      setMounted(true)
      void initialize()
    }
    onCleanup(() => {
      stopped = true
      window.removeEventListener('scroll', relinquishFocusOnScroll)
      document.removeEventListener('focusin', trackFocus)
      initialization.abort()
      fallbackResize.disconnect()
      if (deadline) clearTimeout(deadline)
      runtime?.dispose()
      runtime = undefined
      const landing = host?.closest<HTMLElement>('.landing')
      const copy = landing?.querySelector<HTMLElement>('.landing-copy')
      if (copy) copy.inert = false
      landing?.style.removeProperty('--hero-reveal')
      landing?.style.removeProperty('--world-mix')
      landing?.style.removeProperty('--threshold-veil')
      landing?.removeAttribute('data-world')
      landing?.removeAttribute('data-cinematic')
      landing?.removeAttribute('data-travel')
      delete document.documentElement.dataset.world
    })
  })

  return (
    <>
      <div class="world-loader" data-active={showLoader() ? 'true' : 'false'} aria-hidden={!showLoader()}>
        <div class="world-loader-content" role="status" aria-live="polite">
          <img class="world-loader-logo" src={logoUrl} width="76" height="76" alt="" />
          <span class="world-loader-caption">Preparing your world</span>
          <span class="world-loader-track" aria-hidden="true" />
        </div>
      </div>
      <div class="world-layer" data-fallback={fallback() ? 'true' : 'false'}>
        <div class="world-host" ref={host} aria-hidden="true">
          <img
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
        ref={skipButton}
        class="landing-intro-skip"
        type="button"
        hidden={!state().busy}
        onClick={() => {
          restorePortalFocus = true
          if (runtime) runtime.skipIntro()
          else {
            skipRequested = true
            setLoadingDismissed(true)
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
