/* eslint-disable no-console */

import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
import importTest from './importTest'
import throttleProfiles from './throttleProfiles'

export default async () => {
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
      default: ['none'],
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

  const testsPath = path.join(process.cwd(), 'benchmark')

  try {
    fs.accessSync(testsPath)
  } catch (error) {
    console.error(chalk`{red No "benchmark" directory found in {bold ${process.cwd()}}}`)
    console.error(error)

    process.exit(1)
  }

  const importer = await importTest(testsPath)

  const testCases = fs.readdirSync(testsPath).reduce((all, testFile) => {
    const filePath = path.join(testsPath, testFile)

    if (!fs.statSync(filePath).isFile()) {
      return all
    }

    const importedTest = importer(filePath)

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

  return {
    args,
    testCase: testCases[testCase],
  }
}
