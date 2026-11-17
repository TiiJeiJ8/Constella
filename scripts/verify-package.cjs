// Fail the release before compression if build outputs or unbundled dependencies leak in.
const path = require('node:path')
const { isBuiltin } = require('node:module')
const asar = require('@electron/asar')
const ts = require('typescript')

function verifyArchive(archive) {
    const entries = asar.listPackage(archive).map(name => name.replace(/\\/g, '/').replace(/^\//, ''))
    const entrypoints = ['dist-electron/main.js', 'dist-electron/preload.js']
    for (const required of ['package.json', 'dist/index.html', ...entrypoints]) {
        if (!entries.includes(required)) throw new Error(`Missing packaged file: ${required}`)
    }
    for (const entry of entries) {
        if (entry === 'dist' || entry.startsWith('dist/') || entry === 'dist-electron' ||
            entry === 'package.json' || entrypoints.includes(entry)) continue
        throw new Error(`Unexpected packaged path: ${entry}. Keep release output and npm packages out of app.asar.`)
    }
    for (const entry of entrypoints) {
        const text = asar.extractFile(archive, path.normalize(entry)).toString('utf8')
        const source = ts.createSourceFile(entry, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
        function visit(node) {
            let specifier
            if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier
            if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
                specifier = node.arguments[0]
                if (!specifier || !ts.isStringLiteralLike(specifier)) {
                    throw new Error(`Unverifiable dynamic dependency in ${entry}`)
                }
            }
            if (specifier && ts.isStringLiteralLike(specifier) &&
                specifier.text !== 'electron' && !isBuiltin(specifier.text)) {
                throw new Error(`Unbundled dependency in ${entry}: ${specifier.text}`)
            }
            ts.forEachChild(node, visit)
        }
        visit(source)
    }
    console.log(`[verify-package] ${entries.length} ASAR entries verified; Electron entries use only Electron/Node builtins.`)
}

module.exports = async context => {
    const resources = context.electronPlatformName === 'darwin'
        ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
        : path.join(context.appOutDir, 'resources')
    verifyArchive(path.join(resources, 'app.asar'))
}

if (require.main === module) {
    try {
        if (!process.argv[2]) throw new Error('Usage: node scripts/verify-package.cjs <app.asar>')
        verifyArchive(path.resolve(process.argv[2]))
    } catch (error) {
        console.error(error.message)
        process.exitCode = 1
    }
}
