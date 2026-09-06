import { onCleanup, onMount } from 'solid-js'
import '../styles/world-atmosphere.css'

/** One decorative landscape beneath every section; no animation clock of its own. */
export function WorldAtmosphere() {
  let field: HTMLDivElement | undefined
  onMount(() => {
    const landing = field?.parentElement
    if (!landing || !field) return
    const hero = landing.querySelector<HTMLElement>('.landing-hero')
    const watch = landing.querySelector<HTMLElement>('.landing-watch')
    const place = () => {
      if (hero) field?.style.setProperty('--atmosphere-hero-height', `${hero.offsetHeight}px`)
      if (watch) field?.style.setProperty('--atmosphere-watch-top', `${watch.offsetTop}px`)
    }
    const observer = new ResizeObserver(place)
    observer.observe(landing)
    if (hero) observer.observe(hero)
    if (watch) observer.observe(watch)
    place()
    onCleanup(() => observer.disconnect())
  })
  return (
    <div ref={field} class="world-atmosphere" aria-hidden="true">
      <div class="atmosphere-world atmosphere-world--barrens">
        <div class="atmosphere-sky" />
        <div class="atmosphere-terraces" />
        <div class="atmosphere-depth" />
      </div>
      <div class="atmosphere-world atmosphere-world--quattro">
        <div class="atmosphere-sky" />
        <div class="atmosphere-light-anchor"><div class="atmosphere-sunlight" /></div>
        <div class="atmosphere-terraces" />
        <div class="atmosphere-depth" />
      </div>
      <div class="atmosphere-grain" />
    </div>
  )
}
