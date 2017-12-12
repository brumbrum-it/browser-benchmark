import values from 'lodash/values'
import zip from 'lodash/zip'
import { table } from 'table'

export default (data) => {
  const transposed = zip(...values(data))
  const colToString = col => (Array.isArray(col) ? `${col[0]} ± ${col[1]}` : col)

  // eslint-disable-next-line no-console
  console.log(table(transposed.map(row => row.map(colToString))))
}
