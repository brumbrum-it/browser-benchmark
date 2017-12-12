# browser-benchmark

[![npm](https://img.shields.io/npm/v/browser-benchmark.svg)](https://www.npmjs.com/package/browser-benchmark)
[![Build Status](https://travis-ci.org/brumbrum-it/browser-benchmark.svg?branch=master)](https://travis-ci.org/brumbrum-it/browser-benchmark)

Benchmark webpages using puppeteer and Chromium.

## Install

Run
```bash
yarn add --dev browser-benchmark
```
or
```bash
npm i -D browser-benchmark
```

## Benchmark

Every javascript file in the `benchmark` directory relative to the execution is treated as a benchmark command.

Every command must export a default async function accepting:
```
page: puppeteer Page object
args: CLI arguments
timeout: time in ms
```
and returning an object with keys which will be used as benchmark key points and as values timings in ms.

Optionally a commandOptions object could be exported, which must be a yargs `.options()` object.

## References
 - [puppeteer Page object](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page)
 - [yargs options object](https://github.com/yargs/yargs/blob/HEAD/docs/api.md#optionskey-opt)
