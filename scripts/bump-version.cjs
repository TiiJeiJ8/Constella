const fs = require('fs')
const path = require('path')

const rawVersion = process.argv[2]

if (!rawVersion) {
  console.error('Usage: npm run version:bump -- <version>')
  process.exit(1)
}

const normalizedVersion = rawVersion.replace(/^v/i, '')

if (!/^\d+\.\d+\.\d+$/.test(normalizedVersion)) {
  console.error(`Invalid version: ${rawVersion}`)
  process.exit(1)
}

const projectRoot = path.resolve(__dirname, '..')
const serverRoot = process.env.CONSTELLA_SERVER_ROOT
  ? path.resolve(projectRoot, process.env.CONSTELLA_SERVER_ROOT)
  : path.resolve(projectRoot, '..', 'server')
const packageVersion = `v${normalizedVersion}`

function readText(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

function writeText(relativePath, content) {
  fs.writeFileSync(path.join(projectRoot, relativePath), content, 'utf8')
}

function updateJson(relativePath, updater) {
  const fullPath = path.join(projectRoot, relativePath)
  const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  updater(json)
  fs.writeFileSync(fullPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8')
}

function updateJsonByFullPath(fullPath, updater) {
  const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  updater(json)
  fs.writeFileSync(fullPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8')
}

updateJson('package.json', (json) => {
  json.version = packageVersion
})

updateJson('package-lock.json', (json) => {
  json.version = normalizedVersion
  if (json.packages && json.packages['']) {
    json.packages[''].version = normalizedVersion
  }
})

if (fs.existsSync(serverRoot) && fs.statSync(serverRoot).isDirectory()) {
  const serverPackageJsonPath = path.join(serverRoot, 'package.json')
  const serverPackageLockPath = path.join(serverRoot, 'package-lock.json')

  if (fs.existsSync(serverPackageJsonPath)) {
    updateJsonByFullPath(serverPackageJsonPath, (json) => {
      json.version = normalizedVersion
    })
  } else {
    console.warn(`[version:bump] Skip backend package sync: missing ${serverPackageJsonPath}`)
  }

  if (fs.existsSync(serverPackageLockPath)) {
    updateJsonByFullPath(serverPackageLockPath, (json) => {
      json.version = normalizedVersion
      if (json.packages && json.packages['']) {
        json.packages[''].version = normalizedVersion
      }
    })
  } else {
    console.warn(`[version:bump] Skip backend lock sync: missing ${serverPackageLockPath}`)
  }
} else {
  console.warn(`[version:bump] Server folder not found, skip backend sync: ${serverRoot}`)
}

const compatibilityTargets = [
  'examples/plugins/notice-card-plugin/manifest.json',
  'docs/PLUGIN_RUNTIME_EXAMPLE.md',
  'docs/PLUGIN_PACKAGE_FORMAT.md',
  'docs/PLUGIN_PACKAGE_FORMAT-en.md'
]

for (const relativePath of compatibilityTargets) {
  const content = readText(relativePath)
  const updated = content.replace(
    /"constella": "\^[^"]+"/g,
    `"constella": "^${normalizedVersion}"`
  )

  if (content === updated) {
    console.warn(`No compatibility version updated in ${relativePath}`)
  }

  writeText(relativePath, updated)
}

console.log(`Updated Constella version to ${packageVersion}`)
