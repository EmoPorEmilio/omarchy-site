/// <reference types="vite/client" />

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/solid-router'
import { HydrationScript } from 'solid-js/web'
import type { JSX } from 'solid-js'

import faviconUrl from '../../assets/images/favicon.png?url'
import rootCss from '../styles/root.css?url'

const pitchTitle = 'Omarchy — An independent homepage concept'
const pitchDescription =
  'An independent design concept for Omarchy: two worlds, one personal computer. Explore a cinematic journey from The Barrens to Quattro.'

// Set at build time to the public preview origin for absolute social-card URLs.
function getPreviewOrigin(): string | undefined {
  try {
    const url = new URL(import.meta.env.VITE_SITE_URL ?? '')
    return ['https:', 'http:'].includes(url.protocol) ? url.origin : undefined
  } catch {
    return undefined
  }
}

const previewOrigin = getPreviewOrigin()
const socialImage = `${previewOrigin ?? ''}/art/pitch-social.jpg`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charset: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        name: 'description',
        content: pitchDescription,
      },
      { property: 'og:site_name', content: 'Omarchy homepage concept' },
      { property: 'og:title', content: pitchTitle },
      {
        property: 'og:description',
        content: pitchDescription,
      },
      {
        property: 'og:image',
        content: socialImage,
      },
      { property: 'og:image:alt', content: 'Omarchy homepage concept with a voxel road leading toward a Quattro sunset' },
      ...(previewOrigin ? [{ property: 'og:url', content: `${previewOrigin}/` }] : []),
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: pitchTitle },
      { name: 'twitter:description', content: pitchDescription },
      { name: 'twitter:image', content: socialImage },
      { name: 'theme-color', content: '#080b10' },
    ],
    links: [
      { rel: 'stylesheet', href: rootCss },
      { rel: 'icon', type: 'image/png', href: faviconUrl },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <main class="not-found">
      <p class="eyebrow">ERROR // 404</p>
      <h1>Nothing at this address.</h1>
      <a class="button button--solid" href="/">
        Return home
      </a>
    </main>
  ),
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <HydrationScript />
      </head>
      <body>
        <HeadContent />
        {props.children}
        <Scripts />
      </body>
    </html>
  )
}
