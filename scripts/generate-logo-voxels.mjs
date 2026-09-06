import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url))
const SOURCE_PATH = new URL('../brand/omarchy-logo.svg', import.meta.url)
const OUTPUT_PATH = new URL(
  '../src/generated/omarchy-logo-voxels.ts',
  import.meta.url,
)
const CELL_SIZE = 80
const EXPECTED_SIZE = 1200
const EXPECTED_VOXEL_COUNT = 95
const EXPECTED_OCCUPANCY_HASH =
  '97bd0b0b5539fa3452303b8bf6ec9de24b7e414c79a958fef04c487829c6d4ba'
const GRID_EPSILON = 0.01

function readAttribute(markup, name) {
  const match = markup.match(new RegExp(`\\b${name}="([^"]+)"`))
  return match?.[1]
}

function parsePath(pathData) {
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi)

  if (!tokens) throw new Error('The logo path has no commands.')

  const polygons = []
  let polygon = []
  let command = ''
  let index = 0
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0

  const readNumber = () => {
    const token = tokens[index]
    if (!token || /^[a-zA-Z]$/.test(token)) {
      throw new Error(`Expected a path coordinate near token ${index}.`)
    }
    index += 1
    return Number(token)
  }

  const addPoint = (nextX, nextY) => {
    x = nextX
    y = nextY
    polygon.push([x, y])
  }

  while (index < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[index])) {
      command = tokens[index]
      index += 1
    }

    if (!command) throw new Error('The logo path must begin with a command.')

    const relative = command === command.toLowerCase()
    const lowerCommand = command.toLowerCase()

    if (lowerCommand === 'm') {
      const nextX = readNumber()
      const nextY = readNumber()
      addPoint(relative ? x + nextX : nextX, relative ? y + nextY : nextY)
      startX = x
      startY = y
      command = relative ? 'l' : 'L'
      continue
    }

    if (lowerCommand === 'l') {
      const nextX = readNumber()
      const nextY = readNumber()
      const resolvedX = relative ? x + nextX : nextX
      const resolvedY = relative ? y + nextY : nextY

      if (Math.abs(resolvedX - x) > GRID_EPSILON && Math.abs(resolvedY - y) > GRID_EPSILON) {
        throw new Error('The canonical logo path contains a diagonal edge.')
      }

      addPoint(resolvedX, resolvedY)
      continue
    }

    if (lowerCommand === 'h') {
      const nextX = readNumber()
      addPoint(relative ? x + nextX : nextX, y)
      continue
    }

    if (lowerCommand === 'v') {
      const nextY = readNumber()
      addPoint(x, relative ? y + nextY : nextY)
      continue
    }

    if (lowerCommand === 'z') {
      if (polygon.length < 4) throw new Error('A logo polygon is incomplete.')
      polygons.push(polygon)
      polygon = []
      x = startX
      y = startY
      command = ''
      continue
    }

    throw new Error(`Unsupported logo path command: ${command}`)
  }

  if (polygon.length > 0) throw new Error('The logo path must close every polygon.')
  return polygons
}

function snapToGrid(value) {
  const snapped = Math.round(value / CELL_SIZE) * CELL_SIZE
  if (Math.abs(value - snapped) > GRID_EPSILON) {
    throw new Error(`Logo coordinate ${value} is off the ${CELL_SIZE}-unit grid.`)
  }
  return snapped
}

function pointInsideEvenOdd(pointX, pointY, polygons) {
  let inside = false

  for (const polygon of polygons) {
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
      const [x1, y1] = polygon[index]
      const [x2, y2] = polygon[previous]
      const crosses =
        y1 > pointY !== y2 > pointY &&
        pointX < ((x2 - x1) * (pointY - y1)) / (y2 - y1) + x1

      if (crosses) inside = !inside
    }
  }

  return inside
}

function createOutput(cells, occupancyHash) {
  const rows = cells
    .map(([column, row]) => `  ${column}, ${row},`)
    .join('\n')

  return `// This file is generated from brand/omarchy-logo.svg. Do not edit it by hand.\nexport const OMARCHY_LOGO_GRID = {\n  cellSize: ${CELL_SIZE},\n  columns: ${EXPECTED_SIZE / CELL_SIZE},\n  rows: ${EXPECTED_SIZE / CELL_SIZE},\n  viewBoxSize: ${EXPECTED_SIZE},\n  voxelCount: ${cells.length},\n} as const\n\nexport const OMARCHY_LOGO_CELLS = [\n${rows}\n] as const\n\nexport const OMARCHY_LOGO_OCCUPANCY_HASH = '${occupancyHash}'\n`
}

async function main() {
  const svg = await readFile(SOURCE_PATH, 'utf8')
  const svgTag = svg.match(/<svg\b[^>]*>/)?.[0]
  const paths = [...svg.matchAll(/<path\b[^>]*\/>/g)].map((match) => match[0])

  if (!svgTag || paths.length !== 1) {
    throw new Error('The canonical logo must contain one SVG root and one path.')
  }

  const viewBox = readAttribute(svgTag, 'viewBox')?.trim().split(/\s+/).map(Number)
  const width = Number(readAttribute(svgTag, 'width'))
  const height = Number(readAttribute(svgTag, 'height'))

  if (
    !viewBox ||
    viewBox.length !== 4 ||
    viewBox.some((value, index) => value !== [0, 0, EXPECTED_SIZE, EXPECTED_SIZE][index]) ||
    width !== EXPECTED_SIZE ||
    height !== EXPECTED_SIZE
  ) {
    throw new Error('The canonical logo dimensions or viewBox changed.')
  }

  const pathTag = paths[0]
  if (
    readAttribute(pathTag, 'fill-rule') !== 'evenodd' ||
    readAttribute(pathTag, 'clip-rule') !== 'evenodd' ||
    readAttribute(pathTag, 'transform')
  ) {
    throw new Error('The canonical logo fill rule or transform invariant changed.')
  }

  const pathData = readAttribute(pathTag, 'd')
  if (!pathData) throw new Error('The canonical logo path data is missing.')

  const polygons = parsePath(pathData).map((polygon) =>
    polygon.map(([x, y]) => [snapToGrid(x), snapToGrid(y)]),
  )
  const gridSize = EXPECTED_SIZE / CELL_SIZE
  const occupancy = []
  const cells = []

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const occupied = pointInsideEvenOdd(
        (column + 0.5) * CELL_SIZE,
        (row + 0.5) * CELL_SIZE,
        polygons,
      )
      occupancy.push(occupied ? '1' : '0')
      if (occupied) cells.push([column, row])
    }
  }

  const occupancyHash = createHash('sha256')
    .update(occupancy.join(''))
    .digest('hex')

  if (cells.length !== EXPECTED_VOXEL_COUNT) {
    throw new Error(
      `Logo occupancy changed: expected ${EXPECTED_VOXEL_COUNT} cells, received ${cells.length}.`,
    )
  }

  if (occupancyHash !== EXPECTED_OCCUPANCY_HASH) {
    throw new Error(
      `Logo occupancy hash changed: expected ${EXPECTED_OCCUPANCY_HASH}, received ${occupancyHash}.`,
    )
  }

  const output = createOutput(cells, occupancyHash)

  if (process.argv.includes('--check')) {
    const currentOutput = await readFile(OUTPUT_PATH, 'utf8').catch(() => '')
    if (currentOutput !== output) {
      throw new Error(
        `Generated logo data is stale. Run \"node scripts/generate-logo-voxels.mjs\" from ${PROJECT_ROOT}.`,
      )
    }
    return
  }

  await writeFile(OUTPUT_PATH, output)
}

await main()
