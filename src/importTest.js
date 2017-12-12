import fs from 'fs-extra'
import { normalize } from 'jest-config'
import Environment from 'jest-environment-node'
import Runtime from 'jest-runtime'

export default async (path) => {
  const config = normalize({ name: `Runtime-${path.replace(/\W/, '-')}.benchmarks`, rootDir: path }, {}).options

  fs.ensureDirSync(config.cacheDirectory)

  const environment = new Environment(config)
  environment.global.console = console

  const hasteMap = await Runtime.createHasteMap(config, { maxWorkers: 1, resetCache: false }).build()
  const runtime = new Runtime(
    config,
    environment,
    Runtime.createResolver(config, hasteMap.moduleMap),
  )

  return filename => runtime.requireModule(filename)
}
