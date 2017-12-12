import chromeDevTools from 'chrome-remote-interface'
import url from 'url'
import uuid from 'uuid'

export default async (browser, throttle) => {
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
