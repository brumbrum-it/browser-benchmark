import mapValues from 'lodash/mapValues'
import titleCase from 'title-case'

export default statistics =>
  statistics.reduce(
    (all, statistic) => mapValues(all, (value, key) => [...value, statistic[key]]),
    mapValues(statistics[0], (value, key) => [titleCase(key)]),
  )
