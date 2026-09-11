import {readdirSync, rmSync, statSync} from 'node:fs'
import {join} from 'node:path'

function clean(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (name.startsWith('._') || name === '.DS_Store') {
            rmSync(path, {recursive: true, force: true})
            continue
        }
        if (statSync(path).isDirectory()) clean(path)
    }
}

clean('dist')
