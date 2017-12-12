export const commandOptions = {
  query: {
    alias: 'q',
    describe: 'google query',
    requiresArg: true,
  },
}

const timestamp = () => new Date().getTime()

const elementIsVisible = async (page, start, selector, timeout) => {
  await page.waitForSelector(selector, { timeout, visible: true })

  return timestamp() - start
}

export default async (page, args, timeout) => {
  const { query } = args

  await page.setViewport({ height: 1000, width: 1024 })

  const start = timestamp()

  await page.goto(`https://www.google.it/search?q=${query}`, { timeout, waitUntil: 'domcontentloaded' })

  const loadTime = timestamp() - start

  const [
    tobNav,
    topBar,
    results,
  ] = await Promise.all([
    elementIsVisible(page, start, '#top_nav', timeout),
    elementIsVisible(page, start, '#topabar', timeout),
    elementIsVisible(page, start, '#res .g', timeout),
  ])

  return {
    loadTime,
    results,
    topBar,
    tobNav,
  }
}
