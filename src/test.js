/* eslint-disable no-console */

import chalk from 'chalk'
import mapValues from 'lodash/mapValues'
import os from 'os'
import puppeteer from 'puppeteer'
import prepareData from './prepareData'
import printTable from './printTable'
import setupPage from './setupPage'
import throttleProfiles from './throttleProfiles'
import writeCsv from './writeCsv'

const timestamp = () => new Date().getTime()

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

export default async (args, sample) => {
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
