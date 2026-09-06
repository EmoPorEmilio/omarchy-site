# Independent homepage concept

This design pitch gives Omarchy a world to explore while keeping the homepage
immediately useful. A fresh visit opens in **The Barrens**, with readable copy,
downloads, and navigation already present. Nothing autoplays. Entering the portal
starts the journey to **Quattro** and changes the whole site's atmosphere; the
portal also brings you back. Return visits restore the last selected world
without replaying a journey when browser storage is available.

[Deployment preview](https://omarchy-homepage-redesign.proyecto-viviana.workers.dev)
 · [Fork master](https://github.com/EmoPorEmilio/omarchy-site/tree/master)
 · Review branch: `redesign/tanstack-start-solid`

The preview reflects the most recent deployment, which may differ from this
checkout. This branch intentionally includes the framework migration: Solid and
TanStack Start provide server-rendered and prerendered HTML, Three.js renders the
interactive scenes, and Cloudflare hosts the preview. The migration remains
visible in the review diff alongside the design.

Copy, metadata, links, and a scene still are available without JavaScript.
Recognized crawlers receive the static presentation; reduced-motion visitors
can change worlds without the cinematic journey. Existing secondary pages remain
upstream: homepage links to the manual, news, themes, and other official pages
lead to `omarchy.org`, rather than local replacements.

Use Node 24 and the repository's pinned pnpm version:

```sh
pnpm install
pnpm dev
pnpm build
node --test scripts/test-experience-controller.mjs scripts/test-experience-preferences.mjs
```

To deploy with Cloudflare credentials configured:

```sh
VITE_SITE_URL=https://omarchy-homepage-redesign.proyecto-viviana.workers.dev pnpm deploy
```

Set `VITE_SITE_URL` to the intended public origin at build time so social cards
use absolute image and page URLs. The upstream project documentation follows.

---

# Omarchy

Beautiful, Fun & Agentic Linux by DHH.

See https://github.com/omacom/omarchy for more.

## Adding your theme

Community themes are listed on [omarchy.org/themes](https://omarchy.org/themes/).
To get yours on the page, open a pull request with two things.

**1. A screenshot.** Take a 16:9 shot of the theme on a real desktop, then
convert it:

    magick preview.png -strip -resize '1200>' -quality 80 your-theme.webp

Put the result in `assets/themes/`. Name the file after the theme, lowercase
and hyphenated — `your-theme.webp`. Aim for 1200x675; keep it under about
100KB so the page stays quick to load.

**2. An entry.** Add a figure block to `themes/index.html`, in alphabetical
order among the others:

```html
<figure class="themes__theme">
  <a href="https://github.com/you/your-theme"><img src="/assets/themes/your-theme.webp" alt="Your Theme theme" loading="lazy" decoding="async"></a>
  <figcaption><a href="https://github.com/you/your-theme">Your Theme</a></figcaption>
</figure>
```

Both links point at the theme's own repository, which is where people
install it from and where it needs to keep living.

### The screenshot matters

The page is a grid of screenshots — that image is the whole pitch for your
theme, so give it the same care you gave the palette. Show a real session
with a terminal and an editor in it, not an empty desktop. Use the theme's own
wallpaper. Don't scale a small capture up, and don't include a cursor, a
notification, or anything personal you'd rather not publish.

Pull requests without a screenshot can't be merged, because there's nothing
to put on the page.

## Plugins

Plugins aren't in this repository. They're listed on
[omarchyplugins.com](https://omarchyplugins.com/) from the
[marketplace repo](https://github.com/HANCORE-linux/omarchy-plugin-marketplace),
which has its own submission guide.
