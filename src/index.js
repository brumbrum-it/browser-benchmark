/* eslint-disable no-console */

import chalk from 'chalk'
import test from './test'
import program from './program'

process.once('SIGINT', () => {
  process.exit()
})

const run = async () => {
  const { args, testCase } = await program()

  try {
    await test(args, testCase)
  } catch (error) {
    console.error(chalk`{red There was an error with the execution:}`)
    console.error(error)
    process.exit(1)
  }
}

run()
