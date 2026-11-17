// Compare two already extracted application payloads without executing them.
// node scripts/compare-package-contents.cjs <left> <right> <output.json>
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

async function inventory(root) {
    const files = []
    async function walk(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const full = path.join(directory, entry.name)
            if (entry.isSymbolicLink()) throw new Error(`Unsupported link: ${full}`)
            if (entry.isDirectory()) await walk(full)
            else if (entry.isFile()) {
                const hash = crypto.createHash('sha256')
                for await (const chunk of fs.createReadStream(full)) hash.update(chunk)
                files.push({
                    path: path.relative(root, full).replace(/\\/g, '/'),
                    bytes: fs.statSync(full).size,
                    sha256: hash.digest('hex'),
                })
            }
        }
    }
    await walk(root)
    return files.sort((a, b) => a.path.localeCompare(b.path))
}

async function main() {
    if (process.argv.length !== 5) throw new Error('Expected <left> <right> <output.json>')
    const [leftRoot, rightRoot, output] = process.argv.slice(2).map(p => path.resolve(p))
    const left = await inventory(leftRoot)
    const right = await inventory(rightRoot)
    const leftMap = new Map(left.map(f => [f.path, f]))
    const rightMap = new Map(right.map(f => [f.path, f]))
    const onlyLeft = left.filter(f => !rightMap.has(f.path))
    const onlyRight = right.filter(f => !leftMap.has(f.path))
    const changed = left.filter(f => rightMap.has(f.path) && rightMap.get(f.path).sha256 !== f.sha256)
        .map(f => ({ path: f.path, left: f, right: rightMap.get(f.path) }))
    const result = {
        leftRoot, rightRoot, left, right, onlyLeft, onlyRight, changed,
        identicalCount: left.length - onlyLeft.length - changed.length,
    }
    fs.mkdirSync(path.dirname(output), { recursive: true })
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n')
    console.log(JSON.stringify({ leftFiles: left.length, rightFiles: right.length, identicalCount: result.identicalCount, onlyLeft, onlyRight, changed }, null, 2))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
