/* eslint-disable no-console */

import chalk from 'chalk'
import chromeDevTools from 'chrome-remote-interface'
import fs from 'fs'
import flatten from 'lodash/flatten'
import mapValues from 'lodash/mapValues'
import zip from 'lodash/zip'
import os from 'os'
import path from 'path'
import puppeteer from 'puppeteer'
import { table } from 'table'
import titleCase from 'title-case'
import url from 'url'
import uuid from 'uuid'
import yargs from 'yargs'

const kbps = n => Math.floor(n * 1024 / 8)
const mbps = n => kbps(n * 1024)

const throttleProfiles = {
  fastmobile: {
    downloadThroughput: mbps(1),
    latency: 40,
    name: 'Fast Mobile',
    timeout: 120000,
    uploadThroughput: kbps(750),
  },
  none: undefined,
  slowmobile: {
    downloadThroughput: kbps(450),
    latency: 150,
    name: 'Slow Mobile',
    timeout: 300000,
    uploadThroughput: kbps(150),
  },
  wifi: {
    downloadThroughput: mbps(30),
    latency: 2,
    name: 'WiFi',
    timeout: 60000,
    uploadThroughput: mbps(15),
  },
}

const timestamp = () => new Date().getTime()

const setupPage = async (browser, throttle) => {
  const { downloadThroughput = -1, latency = 0, uploadThroughput = -1 } = throttle || {}

  const page = await browser.newPage()

  const uniqueTitle = uuid.v4()
  await page.evaluate((title) => {
    // eslint-disable-next-line no-undef
    document.title = title
  }, uniqueTitle)

  const devToolsEndpoint = url.parse(browser.wsEndpoint())

  const client = await chromeDevTools({
    host: devToolsEndpoint.hostname,
    port: devToolsEndpoint.port,
    target: list => list.find(target => target.title === uniqueTitle),
  })

  await Promise.all([
    client.Network.clearBrowserCache(),
    client.Network.clearBrowserCookies(),
    client.Network.setCacheDisabled({ cacheDisabled: true }),
    throttle &&
      client.Network.emulateNetworkConditions({
        downloadThroughput,
        latency,
        uploadThroughput,
        offline: false,
      }),
  ])

  return page
}

const testThrottledBatch = async (browser, args, sample, throttle) => {
  const data = []
  for (let i = 0; i < args.samples; i += 1) {
    let page
    try {
      // eslint-disable-next-line no-await-in-loop
      page = await setupPage(browser, throttle)
    } catch (error) {
      console.error(chalk`{red {bold ✘} There was an error setting up the page:}`)
      console.error(error)

      return undefined
    }

    try {
      const start = timestamp()

      // eslint-disable-next-line no-await-in-loop
      data.push(await sample(page, args, throttle ? throttle.timeout : 60000))

      console.log(chalk`{green {bold ✓} ${i + 1} out of ${args.samples} samples taken in ${timestamp() - start}ms.}`)
    } catch (error) {
      console.error(chalk`{red {bold ✘} There was an error with sample ${i + 1} out of ${args.samples}:}`)
      console.error(error)
    }

    page.close()
  }

  const sums = data.reduce((all, values) => mapValues(values, (value, key) => (all[key] || 0) + value), {})
  const means = mapValues(sums, value => value / data.length)
  const squareSumStds = data.reduce(
    // eslint-disable-next-line no-restricted-properties
    (all, values) => mapValues(values, (value, key) => (all[key] || 0) + Math.pow(value - means[key], 2)),
    {},
  )
  const stds = mapValues(squareSumStds, value => Math.sqrt(value / Math.max(1, data.length - 1)))

  return {
    means: mapValues(means, value => Math.round(value)),
    stds: mapValues(stds, value => Math.round(value)),
  }
}

const prepareData = statistics =>
  statistics.reduce(
    (all, statistic) => mapValues(all, (value, key) => [...value, statistic[key]]),
    mapValues(statistics[0], (value, key) => [titleCase(key)]),
  )

const writeCsv = (filename, data) => {
  const csvFilename = path.extname(filename) === '.csv' ? filename : `${filename}.csv`

  const adjustPrecisionTitle = ([title, ...row]) =>
    (Array.isArray(row[0]) ? zip([title, `${title} precision`], ...row) : [[title, ...row]])

  const dataRows = Object.values(data).map(adjustPrecisionTitle)

  fs.writeFileSync(
    csvFilename,
    zip(...flatten(dataRows))
      .map(rows => rows.join(','))
      .join('\n'),
  )
}

const printTable = (data) => {
  const transposed = zip(...Object.values(data))
  const colToString = col => (Array.isArray(col) ? `${col[0]} ± ${col[1]}` : col)

  console.log(table(transposed.map(row => row.map(colToString))))
}

const test = async (args, sample) => {
  console.log(chalk`{cyan Benchmark starting with {bold ${args.samples}} samples per test.}`)

  const throttles = args.throttle.length === 0 ? ['none'] : args.throttle

  const browser = await puppeteer.launch({
    env: undefined,
    headless: args.headless,
    userDataDir: os.tmpdir(),
  })

  // warmup
  console.log(chalk`{yellow Warming up...}`)
  try {
    const page = await setupPage(browser)

    await sample(page, args, 120000)

    await page.close()
  } catch (error) {
    console.error(chalk`{red {bold ✘} There was an error during warmup:}`)
    console.error(error)

    process.exit(1)
  }

  const statistics = []
  // eslint-disable-next-line no-restricted-syntax
  for (const throttleKey of [].concat(throttles)) {
    const throttle = throttleProfiles[throttleKey]
    const throttleName = throttle ? throttle.name : 'None'

    if (throttleKey !== 'none') {
      console.log(chalk`{yellow {bold Network throttling} is {bold ${throttleName}}.}`)
    } else {
      console.log(chalk`{yellow {bold Network throttling} is disabled}`)
    }

    // eslint-disable-next-line no-await-in-loop
    const { means, stds } = await testThrottledBatch(browser, args, sample, throttle)

    statistics.push({
      ...mapValues(means, (value, key) => [value, stds[key]]),
      throttling: throttleName,
    })
  }

  const data = prepareData(statistics)

  if (args.csv) {
    writeCsv(args.csv, data)
  }
  if (args.table) {
    printTable(data)
  }

  browser.close()
}

const program = yargs
  .option('samples', {
    alias: 's',
    default: 5,
    describe: 'sample size',
    requiresArg: true,
  })
  .option('throttle', {
    alias: 't',
    choices: Object.keys(throttleProfiles),
    describe: 'network throttling',
    requiresArg: true,
    type: 'array',
  })
  .option('headless', {
    alias: 'H',
    default: true,
    describe: 'enable headless mode',
    type: 'boolean',
  })
  .option('csv', {
    alias: 'c',
    describe: 'csv file path',
    requiresArg: true,
  })
  .option('table', {
    alias: 'l',
    describe: 'print a table of the statistics',
    type: 'boolean',
  })
  .demandCommand(1, 'Please specify a test case.')

const testsPath = path.join(__dirname, 'tests')
const testCases = fs.readdirSync(testsPath).reduce((all, testFile) => {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const importedTest = require(path.join(testsPath, testFile))

  if (typeof importedTest.commandOptions === 'object') {
    program.options(importedTest.commandOptions)
  }

  return {
    ...all,
    [path.parse(testFile).name]: importedTest.default,
  }
}, {})

const args = program.argv

const testCase = args._[0]

process.once('SIGINT', () => {
  process.exit()
})

const run = async () => {
  try {
    await test(args, testCases[testCase])
  } catch (error) {
    console.error(chalk`{red There was an error with the execution:}`)
    console.error(error)
    process.exit(1)
  }
}

run()
