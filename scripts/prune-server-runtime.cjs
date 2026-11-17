const fs = require('node:fs')
const path = require('node:path')

// Only remove known development files from the disposable production staging area.
// Preserve package metadata, JS entrypoints, licenses and the target native binaries.
module.exports = function pruneServerRuntime(root, platform = process.platform, arch = process.arch) {
    const expected = path.resolve(__dirname, '..', '.electron-server-runtime-next')
    if (path.resolve(root) !== expected || fs.lstatSync(root).isSymbolicLink()) {
        throw new Error(`Unexpected runtime staging directory: ${root}`)
    }
    let removedBytes = 0
    let removedFiles = 0
    const target = `${platform}-${arch}`
    function walk(directory, shouldRemove) {
        if (!fs.existsSync(directory)) return
        const relative = path.relative(expected, fs.realpathSync(directory))
        if (fs.lstatSync(directory).isSymbolicLink() || relative === '..' ||
            relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
            throw new Error(`Refusing to prune outside staging: ${directory}`)
        }
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const full = path.join(directory, entry.name)
            if (entry.isSymbolicLink()) throw new Error(`Unexpected link in native runtime: ${full}`)
            if (entry.isDirectory()) walk(full, shouldRemove)
            else if (!/license|copying|copyright|notice/i.test(entry.name) && shouldRemove(full)) {
                removedBytes += fs.statSync(full).size
                fs.unlinkSync(full)
                removedFiles++
            }
        }
    }
    const modules = path.join(root, 'node_modules')
    // Backend declarations/maps are not executed by the bundled Node process.
    walk(path.join(root, 'dist'), file => /(?:\.d\.ts|\.map)$/.test(file))
    for (const name of ['better-sqlite3', 'classic-level']) {
        const pkg = path.join(modules, name)
        walk(pkg, file => {
            const relative = path.relative(pkg, file).replace(/\\/g, '/')
            if (relative.startsWith('prebuilds/')) {
                const candidate = relative.split('/')[1]
                const separator = candidate.indexOf('-')
                const matches = candidate.slice(0, separator) === platform &&
                    candidate.slice(separator + 1).split('+').includes(arch)
                return !matches
            }
            if (relative.startsWith('build/')) return relative !== 'build/Release/better_sqlite3.node'
            return /\.(?:c|cc|cpp|h|hpp|gyp|gypi|d\.ts|map)$/.test(relative)
        })
    }
    const sqlite = path.join(modules, 'better-sqlite3/build/Release/better_sqlite3.node')
    if (!fs.existsSync(sqlite)) throw new Error('Missing better-sqlite3 runtime binary')
    const prebuilds = path.join(modules, 'classic-level/prebuilds')
    const candidates = fs.readdirSync(prebuilds).filter(name => {
        const separator = name.indexOf('-')
        return name.slice(0, separator) === platform && name.slice(separator + 1).split('+').includes(arch)
    })
    if (!candidates.some(name => fs.readdirSync(path.join(prebuilds, name)).some(file => file.endsWith('.node')))) {
        throw new Error(`Missing classic-level prebuild for ${target}`)
    }
    console.log(`[prune-server-runtime] Removed ${removedFiles} development/foreign-platform files (${(removedBytes / 1048576).toFixed(2)} MiB); target=${target}`)
    return { removedBytes, removedFiles, target }
}
