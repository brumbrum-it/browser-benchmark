import fs from 'fs'
import flatten from 'lodash/flatten'
import values from 'lodash/values'
import zip from 'lodash/zip'
import path from 'path'

export default (filename, data) => {
  const csvFilename = path.extname(filename) === '.csv' ? filename : `${filename}.csv`

  const adjustPrecisionTitle = ([title, ...row]) =>
    (Array.isArray(row[0]) ? zip([title, `${title} precision`], ...row) : [[title, ...row]])

  const dataRows = values(data).map(adjustPrecisionTitle)

  fs.writeFileSync(
    csvFilename,
    zip(...flatten(dataRows))
      .map(rows => rows.join(','))
      .join('\n'),
  )
}
