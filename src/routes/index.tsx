import { createFileRoute } from '@tanstack/solid-router'

import { VoxelLogo } from '../components/VoxelLogo'
import heroVideoUrl from '../../assets/images/video/omarchy-quattro.webp?url'
import logoUrl from '../../brand/omarchy-logo.svg?url'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      {
        title: 'Omarchy — Beautiful, Fun & Opinionated Linux by DHH',
      },
    ],
  }),
  component: Home,
})

const directory = [
  ['01', 'Manual', '/manual/', 'Learn the system'],
  ['02', 'ISO', 'https://iso.omarchy.org/omarchy-4.0.2.iso', 'Download 4.0.2'],
  ['03', 'Plugins', 'https://omarchyplugins.com/', 'Extend Omarchy'],
  ['04', 'Themes', '/themes/', 'Make it yours'],
  ['05', 'News', '/news/', 'Follow the project'],
  ['06', 'GitHub', 'https://github.com/omacom/omarchy', 'Read the source'],
] as const

function Arrow() {
  return <span aria-hidden="true">↗</span>
}

function Home() {
  return (
    <>
      <a class="skip-link" href="#main">
        Skip to content
      </a>

      <div class="announcement">
        <span>NEW</span>
        <a href="/news/2026/08/omacom-foundation-launches-with-8-million">
          Omacom Foundation launches with $10 million
        </a>
      </div>

      <header class="site-header">
        <a class="brand" href="/" aria-label="Omarchy home">
          <img src={logoUrl} width="1200" height="1200" alt="" />
          <span>OMARCHY</span>
        </a>

        <nav class="site-nav" aria-label="Primary navigation">
          <a href="/manual/">Manual</a>
          <a href="/themes/">Themes</a>
          <a href="/news/">News</a>
        </nav>

        <a class="header-source" href="https://github.com/omacom/omarchy">
          <span>Source</span>
          <Arrow />
        </a>
      </header>

      <main id="main">
        <section class="hero" aria-labelledby="hero-title">
          <div class="hero-copy">
            <p class="eyebrow">
              <span>ARCH LINUX</span>
              <span>HYPRLAND</span>
              <span>OMARCHY 4</span>
            </p>

            <h1 id="hero-title">
              Beautiful.<br />
              Fun. Opinionated.<br />
              <em>Linux.</em>
            </h1>

            <p class="hero-intro">
              The malleable OS for the age of agents. Vibe your way through
              every alteration, tweak, and desire.
            </p>

            <div class="hero-actions">
              <a
                class="button button--solid"
                href="https://iso.omarchy.org/omarchy-4.0.2.iso"
              >
                Download the ISO
                <span aria-hidden="true">↓</span>
              </a>
              <a class="button" href="/manual/getting-started/">
                Read the manual
                <span aria-hidden="true">→</span>
              </a>
            </div>

            <p class="hero-byline">
              Built by <a href="https://dhh.dk">DHH</a> and the Omarchy community.
            </p>
          </div>

          <div class="hero-visual">
            <p class="visual-label">MARK_01 // REALTIME ASSEMBLY</p>
            <VoxelLogo />
          </div>
        </section>

        <div class="signal-strip" aria-label="Omarchy qualities">
          <span>ONE COMMAND</span>
          <span aria-hidden="true">◆</span>
          <span>ZERO CONFIG HUNTING</span>
          <span aria-hidden="true">◆</span>
          <span>YOURS TO CHANGE</span>
        </div>

        <section class="directory-section" aria-labelledby="directory-title">
          <div class="section-heading">
            <p class="eyebrow">SYSTEM DIRECTORY // 001—006</p>
            <h2 id="directory-title">
              Everything within <em>reach.</em>
            </h2>
          </div>

          <div class="directory-grid">
            {directory.map(([index, title, href, description]) => (
              <a class="directory-card" href={href}>
                <span class="directory-index">{index}</span>
                <strong>{title}</strong>
                <span class="directory-description">{description}</span>
                <Arrow />
              </a>
            ))}
          </div>
        </section>

        <section class="film-section" aria-labelledby="film-title">
          <a
            class="film-frame"
            href="https://www.youtube.com/watch?v=F7fe9pa8OeE"
            aria-label="Watch the Omarchy introduction on YouTube"
          >
            <img
              src={heroVideoUrl}
              width="1280"
              height="720"
              loading="lazy"
              decoding="async"
              alt="Omarchy Quattro by David Heinemeier Hansson"
            />
            <span class="film-play" aria-hidden="true">
              PLAY
            </span>
          </a>

          <div class="film-copy">
            <p class="eyebrow">FILM // OMARCHY QUATTRO</p>
            <h2 id="film-title">See the whole system in motion.</h2>
            <p>
              A tour of the opinionated defaults, sharp edges, and small
              details that make Omarchy feel complete from first boot.
            </p>
            <a class="text-link" href="https://www.youtube.com/watch?v=F7fe9pa8OeE">
              Watch on YouTube <Arrow />
            </a>
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <a class="brand brand--footer" href="/" aria-label="Omarchy home">
          <img src={logoUrl} width="1200" height="1200" alt="" />
          <span>OMARCHY</span>
        </a>
        <p>
          Looking to become a partner or patron?{' '}
          <a href="mailto:david@omarchy.org">david@omarchy.org</a>
        </p>
        <a href="/brand/">Pending trademark // Brand assets</a>
      </footer>
    </>
  )
}
