// Read-only measurement of build inputs and optional release artifacts.
// Usage: node scripts/package-size-baseline.cjs --out <directory>
//        [--artifact <installer.exe|archive.zip>] [--unpacked <app-directory>]
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

const web = path.resolve(__dirname, '..')
const workspace = path.dirname(web)
const args = process.argv.slice(2)
const artifacts = []
const unpacked = []
let output
for (let i = 0; i < args.length; i += 2) {
    if (!args[i + 1]) throw new Error(`Missing value for ${args[i]}`)
    const value = path.resolve(args[i + 1])
    if (args[i] === '--out') output = value
    else if (args[i] === '--artifact') artifacts.push(value)
    else if (args[i] === '--unpacked') unpacked.push(value)
    else throw new Error(`Unknown argument: ${args[i]}`)
}
if (!output) throw new Error('--out is required')
const slash = value => value.replace(/\\/g, '/')
const relative = value => slash(path.relative(workspace, value))
const mib = bytes => (bytes / 1024 / 1024).toFixed(2)

function inventory(root) {
    const files = []
    const skippedLinks = []
    function walk(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const full = path.join(directory, entry.name)
            if (entry.isSymbolicLink()) skippedLinks.push(slash(path.relative(root, full)))
            else if (entry.isDirectory()) walk(full)
            else if (entry.isFile()) files.push({ path: slash(path.relative(root, full)), bytes: fs.statSync(full).size })
        }
    }
    walk(root)
    return { files, skippedLinks }
}

function summarize(files, packageGroups = false) {
    const groups = {}
    const extensions = {}
    for (const file of files) {
        const parts = file.path.split('/')
        const group = packageGroups && parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
        groups[group] = (groups[group] || 0) + file.bytes
        const ext = path.extname(file.path) || '(none)'
        extensions[ext] = (extensions[ext] || 0) + file.bytes
    }
    const ranked = values => Object.entries(values).map(([name, bytes]) => ({ name, bytes })).sort((a, b) => b.bytes - a.bytes)
    return {
        bytes: files.reduce((sum, file) => sum + file.bytes, 0),
        fileCount: files.length,
        groups: ranked(groups),
        extensions: ranked(extensions),
        largestFiles: [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 30),
    }
}

async function sha256(file) {
    const hash = crypto.createHash('sha256')
    for await (const chunk of fs.createReadStream(file)) hash.update(chunk)
    return hash.digest('hex')
}

function asarInventory(file) {
    const asar = require('@electron/asar')
    const files = []
    let links = 0
    function walk(directory, prefix = '') {
        for (const [name, entry] of Object.entries(directory.files || {})) {
            const item = prefix + name
            if (entry.files) walk(entry, item + '/')
            else if (entry.link) links++
            else files.push({ path: item, bytes: entry.size, unpacked: !!entry.unpacked })
        }
    }
    walk(asar.getRawHeader(file).header)
    return {
        path: file,
        archiveBytes: fs.statSync(file).size,
        ...summarize(files),
        packedLogicalBytes: files.filter(f => !f.unpacked).reduce((sum, f) => sum + f.bytes, 0),
        unpackedLogicalBytes: files.filter(f => f.unpacked).reduce((sum, f) => sum + f.bytes, 0),
        links,
        files,
    }
}

async function main() {
    const report = {
        measuredAt: new Date().toISOString(),
        units: 'bytes; tables use MiB (1024^2 bytes)',
        scope: 'Local inputs are not installed application contents. Nested directory measurements overlap; do not add them together.',
        revisions: {},
        directories: [],
        artifacts: [],
        asars: [],
    }
    for (const name of ['web', 'server']) {
        const root = path.join(workspace, name)
        const git = spawnSync('git', ['-c', `safe.directory=${slash(root)}`, '-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' })
        report.revisions[name] = git.status === 0 ? git.stdout.trim() : null
    }
    const roots = [
        'web/dist', 'web/dist-electron', 'web/public', 'web/node_modules',
        'web/node_modules/electron/dist', 'web/node_modules/electron/dist/locales',
        'web/.electron-server-runtime', 'web/.electron-node-runtime',
        'server/dist', 'server/node_modules', 'server/node_modules/better-sqlite3',
    ].map(name => path.join(workspace, name)).concat(unpacked)
    for (const root of roots) {
        if (!fs.existsSync(root)) {
            report.directories.push({ path: relative(root), status: 'missing' })
            continue
        }
        const scanned = inventory(root)
        report.directories.push({ path: relative(root), status: 'measured', ...summarize(scanned.files, path.basename(root) === 'node_modules'), ...scanned })
        // Only unpacked release directories are searched for ASAR files.
        if (unpacked.includes(root)) {
            for (const file of scanned.files.filter(f => f.path.endsWith('.asar'))) {
                report.asars.push(asarInventory(path.join(root, file.path)))
            }
        }
    }
    fs.mkdirSync(output, { recursive: true })
    for (const [index, file] of artifacts.entries()) {
        const entry = { path: file, bytes: fs.statSync(file).size, sha256: await sha256(file) }
        const result = spawnSync(require('7zip-bin').path7za, ['l', '-slt', file], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true })
        entry.listingStatus = result.status === 0 ? 'listed' : 'failed'
        entry.listingFile = `archive-${index + 1}.txt`
        fs.writeFileSync(path.join(output, entry.listingFile), `${result.stdout || ''}\n${result.stderr || ''}\n${result.error || ''}`)
        report.artifacts.push(entry)
    }
    report.releaseComparison = artifacts.length < 2
        ? 'Pending: installer and portable archive were not both supplied.'
        : 'Archive listings recorded. Installer listings may expose nested payload archives only; extract and compare payload hashes separately before claiming identical contents.'
    fs.writeFileSync(path.join(output, 'baseline.json'), JSON.stringify(report, null, 2) + '\n')
    const lines = [
        '# 包体积基线', '',
        `测量时间（UTC）：${report.measuredAt}`, '',
        '此脚本仅测量运行时已有文件，本身不执行构建。MiB = 1,048,576 字节。父目录与子目录数据重叠，不可相加；开发目录大小不代表发布包大小。', '',
        '| 目录 | MiB | 文件数 |', '| --- | ---: | ---: |',
        ...report.directories.map(d => `| ${d.path} | ${d.status === 'missing' ? '不存在' : mib(d.bytes)} | ${d.fileCount ?? '—'} |`), '',
        '## 发布包', '',
        ...(report.artifacts.length ? report.artifacts.map(a => `- ${a.path}: ${mib(a.bytes)} MiB; SHA-256: ${a.sha256}; listing: ${a.listingStatus}`) : ['未提供安装 EXE 或便携压缩包，无法核实用户报告的 266 MB / 近 620 MB，无法判断两者是否包含相同内容。']), '',
        '## 各目录主要组成', '',
    ]
    for (const directory of report.directories.filter(d => d.status === 'measured')) {
        lines.push(`### ${directory.path}`, '', '| 项目 | MiB |', '| --- | ---: |', ...directory.groups.slice(0, 12).map(g => `| ${g.name} | ${mib(g.bytes)} |`), '')
    }
    lines.push('完整文件清单、文件扩展名统计、最大的 30 个文件和代码版本见 baseline.json。符号链接不跟随，跳过项记录在 skippedLinks 中。', '')
    fs.writeFileSync(path.join(output, 'baseline.md'), lines.join('\n'))
    console.log(JSON.stringify({ output, directories: report.directories.map(({ path, bytes, status }) => ({ path, bytes, status })), artifacts: report.artifacts, releaseComparison: report.releaseComparison }, null, 2))
}

main().catch(error => { console.error(error); process.exitCode = 1 })
