import { createFileRoute } from '@tanstack/solid-router'
import { WorldCanvas } from '../components/WorldCanvas'
import { WorldAtmosphere } from '../components/WorldAtmosphere'
import stageOneCss from '../styles/stage-one.css?url'
import alexFinnUrl from '../../assets/images/video/alex-finn.webp?url'
import linuxBtwUrl from '../../assets/images/video/linuxbtw.webp?url'
import networkChuckUrl from '../../assets/images/video/networkchuck.webp?url'
import quattroVideoUrl from '../../assets/images/video/omarchy-quattro.webp?url'
import typecraftUrl from '../../assets/images/video/typecraft.webp?url'
import logoUrl from '../../brand/omarchy-logo.svg?url'
import wordmarkUrl from '../../brand/omarchy-wordmark.svg?url'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: 'Omarchy — Your machine. Your rules.' }],
    links: [{ rel: 'stylesheet', href: stageOneCss }],
  }),
  component: Home,
})

const isoUrl = 'https://iso.omarchy.org/omarchy-4.0.2.iso'
const manualUrl = 'https://omarchy.org/manual/'
const foundationUrl = 'https://omarchy.org/news/2026/08/omacom-foundation-launches-with-8-million/'
const resources = [
  { number: '01', label: 'Make it yours', title: ['A starting point.', 'An open horizon.'], description: 'Learn the essentials, then change everything. Your tools, your themes, your way of working.', links: [['The manual', manualUrl], ['Themes', 'https://omarchy.org/themes/'], ['Plugins', 'https://omarchyplugins.com/'], ['Workstations', 'https://omarchy.org/workstations/'], ['Security', 'https://omarchy.org/security/']] },
  { number: '02', label: 'Find your people', title: ['Individual minds.', 'Shared curiosity.'], description: 'Meet the people making Omarchy their own. Trade ideas, follow along, or build something together.', links: [['Discord', 'https://discord.gg/tXFUdasqhY'], ['Meetups', 'https://omarchy.org/meetups/'], ['Omarchs', 'https://omarchs.fyi'], ['Teams', 'https://omarchy.org/teams/'], ['News', 'https://omarchy.org/news/']] },
  { number: '03', label: 'Move it forward', title: ['Open source.', 'Open possibilities.'], description: 'Contribute to the code, support the work, or help artists explore what a computer can become.', links: [['GitHub', 'https://github.com/omacom/omarchy'], ['Donate', 'https://donate.omarchy.org'], ['Patrons', 'https://omarchy.org/patrons/'], ['Sponsorships', 'https://omarchy.org/sponsorships/'], ['Artists in Residence', 'https://omarchy.org/air/']] },
]
const videos = [
  { image: networkChuckUrl, author: 'NetworkChuck', title: 'You need to switch to Linux RIGHT NOW!!', url: 'https://www.youtube.com/watch?v=9SDkU5VDQEQ' },
  { image: typecraftUrl, author: 'Typecraft', title: 'They finally fixed Linux', url: 'https://www.youtube.com/watch?v=5JPYJfN7HY0' },
  { image: linuxBtwUrl, author: 'LinuxBTW', title: "I Didn't Expect Omarchy 4 to Be This Good", url: 'https://www.youtube.com/watch?v=qBKMe8AatY0' },
  { image: alexFinnUrl, author: 'Alex Finn', title: 'If you use AI, switch to Omarchy immediately', url: 'https://www.youtube.com/watch?v=KO2T0oET9go' },
]
function DownloadIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 14v6h16v-6" /></svg>
}
function Home() {
  return (
    <div class="landing" data-world="bleak">
      <WorldAtmosphere />
      <a class="landing-skip" href="#main">Skip to content</a>
      <section class="landing-hero" aria-labelledby="landing-title">
        <WorldCanvas />
        <header class="landing-header">
          <a class="landing-brand" href="/" aria-label="Omarchy home"><img src={logoUrl} width="1200" height="1200" alt="" /></a>
          <nav class="landing-nav" aria-label="Primary navigation">
            <a href={manualUrl}>Manual</a>
            <a class="landing-nav-secondary" href="https://github.com/omacom/omarchy">GitHub</a>
            <a class="landing-nav-secondary" href="https://discord.gg/tXFUdasqhY">Discord <i class="status-dot" aria-hidden="true" /></a>
            <a class="landing-nav-download" href={isoUrl}><DownloadIcon /><span>Download ISO</span></a>
          </nav>
        </header>
        <main id="main" class="landing-main">
          <div class="landing-copy">
            <p class="hero-eyebrow">welcome to<span aria-hidden="true">_</span></p>
            <h1 id="landing-title"><img class="hero-wordmark" src={wordmarkUrl} width="4131" height="950" alt="Omarchy" /><span class="sr-only"> — Linux for the age of agents.</span></h1>
            <p class="hero-descriptor">The malleable OS for the age of agents.</p>
            <p class="hero-description">A computer to shape, tweak, and make entirely your own.</p>
            <a class="hero-invitation" href="https://omarchs.fyi"><span aria-hidden="true">&gt;</span> Be the Omarch.</a>
            <div class="hero-actions">
              <a class="landing-command button-primary" href={isoUrl}><DownloadIcon />Download ISO</a>
              <a class="button-secondary" href={manualUrl}><span aria-hidden="true">&gt;_</span>View manual</a>
            </div>
            <p class="hero-colophon">Beautiful, fun &amp; agentic Linux.<br />By <a href="https://dhh.dk">DHH</a> and the Omarchy community.</p>
          </div>
        </main>
        <div class="hero-baseline">
          <a class="landing-scroll" href="#explore"><span aria-hidden="true">↓</span> A world of your own</a>
        </div>
      </section>
      <section id="explore" class="landing-directory" aria-labelledby="explore-title">
        <div class="section-heading">
          <p class="section-kicker"><span aria-hidden="true">[ 01 ]</span> The system is yours</p>
          <h2 id="explore-title">Start here.<br /><span>Go anywhere.</span></h2>
          <p class="section-intro">The best part of a personal computer?<br />Making it personal.</p>
        </div>
        <div class="directory-grid">
          {resources.map((resource) => (
            <article class="directory-card">
              <div class="directory-card-topline"><span>{resource.label}</span><span aria-hidden="true">{resource.number}</span></div>
              <h3>{resource.title[0]}<br />{resource.title[1]}</h3>
              <p>{resource.description}</p>
              <nav class="directory-links" aria-label={resource.label}>{resource.links.map(([label, href]) => <a href={href}>{label}<span aria-hidden="true">↗</span></a>)}</nav>
            </article>
          ))}
        </div>
        <a class="foundation-dispatch" href={foundationUrl}>
          <span class="dispatch-mark" aria-hidden="true"><img src={logoUrl} width="1200" height="1200" alt="" /></span>
          <span class="dispatch-copy"><small>From the project / Omacom Foundation</small><strong>A foundation for what comes next.</strong></span>
          <span class="dispatch-action">Read the story <span aria-hidden="true">↗</span></span>
        </a>
      </section>
      <section class="landing-watch" aria-labelledby="watch-title">
        <div class="section-heading section-heading--watch">
          <p class="section-kicker"><span aria-hidden="true">[ 02 ]</span> See for yourself</p>
          <h2 id="watch-title">Less explaining.<br /><span>More exploring.</span></h2>
          <p class="section-intro">A closer look at Quattro.<br />And a few fresh perspectives.</p>
        </div>
        <div class="watch-grid">
          <a class="watch-feature" href="https://www.youtube.com/watch?v=F7fe9pa8OeE" aria-label="Watch Omarchy Quattro by David Heinemeier Hansson on YouTube">
            <img src={quattroVideoUrl} width="1280" height="720" alt="" loading="lazy" decoding="async" />
            <div class="watch-feature-shade" />
            <span class="watch-feature-label">The Quattro release</span>
            <span class="watch-play" aria-hidden="true"><svg width="21" height="24" viewBox="0 0 21 24" fill="currentColor"><path d="M2 1v22l18-11z" /></svg></span>
            <div class="watch-feature-copy"><h3>Meet your next<br />operating system.</h3><p>Omarchy Quattro <span aria-hidden="true">/</span> David Heinemeier Hansson</p></div>
            <span class="watch-feature-arrow" aria-hidden="true">↗</span>
          </a>
          <div class="watch-list">
            {videos.map((video) => <a class="watch-card" href={video.url} aria-label={`Watch ${video.title} by ${video.author} on YouTube`}><img src={video.image} width="1280" height="720" alt="" loading="lazy" decoding="async" /><span><small>{video.author}</small>{video.title}</span><i aria-hidden="true">↗</i></a>)}
          </div>
        </div>
      </section>
      <footer class="landing-footer">
        <div class="footer-top">
          <div class="footer-lead">
            <a class="footer-brand" href="/" aria-label="Omarchy home"><img src={wordmarkUrl} width="4131" height="950" alt="" /></a>
            <p>Your machine.<br /><span>Your rules.</span></p>
            <a class="footer-command" href={isoUrl}><DownloadIcon />Get Omarchy <span aria-hidden="true">↗</span></a>
          </div>
          <nav class="footer-nav" aria-label="Footer navigation">
            <div><p>Make it yours</p><a href={manualUrl}>Manual</a><a href="https://omarchy.org/themes/">Themes</a><a href="https://omarchyplugins.com/">Plugins</a><a href="https://omarchy.org/workstations/">Workstations</a></div>
            <div><p>Stay curious</p><a href="https://omarchy.org/news/">News</a><a href="https://discord.gg/tXFUdasqhY">Discord</a><a href="https://omarchy.org/meetups/">Meetups</a><a href="https://omarchy.org/teams/">Teams</a></div>
            <div><p>Keep it open</p><a href="https://github.com/omacom/omarchy">GitHub</a><a href="https://donate.omarchy.org">Donate</a><a href="https://omarchy.org/security/">Security</a><a href="https://omarchy.org/patrons/">Patrons</a><a href="https://omarchy.org/sponsorships/">Sponsorships</a></div>
            <div><p>A little more</p><a href="https://omarchy.org/air/">Artists in Residence</a><a href="https://supply.37signals.com/collections/omarchy">Merch</a><a href="https://omarchy.org/brand/">Brand</a><a href="https://omarchs.fyi">Omarchs</a></div>
          </nav>
        </div>
        <div class="footer-bottom">
          <p>Incubated at <a href="https://37signals.com">37signals</a>.<br />Makers of <a href="https://basecamp.com">Basecamp</a> and <a href="https://hey.com">HEY</a>.</p>
          <a class="footer-contact" href="mailto:david@omarchy.org">Become a partner or patron <span aria-hidden="true">↗</span></a>
          <p>Independent homepage concept.<br /><a href="https://omarchy.org/brand/">Omarchy is a pending trademark.</a></p>
        </div>
      </footer>
    </div>
  )
}
