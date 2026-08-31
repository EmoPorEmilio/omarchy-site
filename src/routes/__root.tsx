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
import appCss from '../styles/app.css?url'

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
        content: 'Beautiful, Fun & Opinionated Linux by DHH',
      },
      { property: 'og:site_name', content: 'Omarchy' },
      { property: 'og:title', content: 'Omarchy' },
      {
        property: 'og:description',
        content: 'Beautiful, Fun & Opinionated Linux by DHH',
      },
      {
        property: 'og:image',
        content: 'https://omarchy.org/assets/images/opengraph.png',
      },
      { property: 'og:url', content: 'https://omarchy.org' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'theme-color', content: '#1a1b26' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
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
