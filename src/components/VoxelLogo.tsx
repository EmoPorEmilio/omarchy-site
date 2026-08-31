import { onCleanup, onMount } from 'solid-js'

import logoUrl from '../../brand/omarchy-logo.svg?url'

export function VoxelLogo() {
  let stage: HTMLDivElement | undefined
  let status: HTMLSpanElement | undefined

  onMount(() => {
    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    let disposed = false
    let disposeScene: (() => void) | undefined

    const timer = window.setTimeout(async () => {
      try {
        const { mountVoxelScene } = await import('../lib/voxel-scene')
        if (disposed || !stage) return

        const scene = await mountVoxelScene(stage)
        if (disposed) {
          scene.dispose()
          return
        }

        disposeScene = scene.dispose
        stage.dataset.ready = 'true'
        if (status) status.textContent = scene.backend
      } catch (error) {
        console.warn('The voxel logo could not start.', error)
        if (status) status.textContent = 'SVG FALLBACK'
      }
    }, 180)

    onCleanup(() => {
      disposed = true
      window.clearTimeout(timer)
      disposeScene?.()
    })
  })

  return (
    <div class="voxel-shell">
      <div class="voxel-ruler voxel-ruler--top" aria-hidden="true">
        <span>00</span>
        <span>07</span>
        <span>15</span>
      </div>
      <div class="voxel-stage" ref={stage}>
        <img
          class="voxel-fallback"
          src={logoUrl}
          width="1200"
          height="1200"
          alt="Omarchy logo"
        />
      </div>
      <div class="voxel-meta" aria-hidden="true">
        <span ref={status}>SSR VECTOR</span>
        <span>95 VOXELS</span>
        <span>POINTER / TILT</span>
      </div>
    </div>
  )
}
