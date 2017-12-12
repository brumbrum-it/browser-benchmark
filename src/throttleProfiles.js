const kbps = n => Math.floor(n * 1024 / 8)
const mbps = n => kbps(n * 1024)

export default {
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
