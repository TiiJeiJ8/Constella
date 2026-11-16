const fs = require('node:fs/promises')
const path = require('node:path')
const { parse } = require('@vue/compiler-sfc')

const projectRoot = path.resolve(__dirname, '..')
const config = require('./styles.prettier.json')
const checkOnly = process.argv.includes('--check')

async function collectFiles(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        const filePath = path.join(directory, entry.name)
        if (entry.isDirectory()) {
            files.push(...await collectFiles(filePath))
        } else if (/\.(vue|css)$/.test(entry.name)) {
            files.push(filePath)
        }
    }

    return files.sort()
}

async function main() {
    const prettier = await import('prettier')
    const files = await collectFiles(path.join(projectRoot, 'src'))
    let changed = 0

    for (const filePath of files) {
        const original = await fs.readFile(filePath, 'utf8')
        let formatted = original.replace(/\r\n?/g, '\n')

        if (filePath.endsWith('.css')) {
            formatted = await prettier.format(formatted, { ...config, parser: 'css' })
        } else {
            const { descriptor, errors } = parse(formatted, { filename: filePath })
            if (errors.length) {
                throw new Error(`Cannot parse ${filePath}: ${errors.join('\n')}`)
            }

            // Replace only style contents, leaving the template and script formatting intact.
            for (const style of [...descriptor.styles].reverse()) {
                if (style.src) continue
                if (style.lang && style.lang !== 'css') {
                    throw new Error(`Unsupported style language in ${filePath}: ${style.lang}`)
                }
                const content = await prettier.format(style.content, { ...config, parser: 'css' })
                formatted = formatted.slice(0, style.loc.start.offset)
                    + '\n' + content
                    + formatted.slice(style.loc.end.offset)
            }
        }

        if (formatted !== original) {
            changed++
            console.log(path.relative(projectRoot, filePath).split(path.sep).join('/'))
            if (!checkOnly) await fs.writeFile(filePath, formatted, 'utf8')
        }
    }

    if (checkOnly && changed) {
        console.error(`${changed} files need CSS formatting. Run npm run styles:format.`)
        process.exitCode = 1
    } else {
        console.log(checkOnly
            ? `CSS formatting passed for ${files.length} files.`
            : `Formatted CSS in ${changed} of ${files.length} files.`)
    }
}

main().catch(error => {
    console.error(error)
    process.exitCode = 1
})
