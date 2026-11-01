import { ORIGIN } from '../shared/constants'

/** www.meatspace.sh/<path>?<query> -> https://meatspace.sh/<path>?<query> */
export function apexUrl(requestUrl: string): string {
  const { pathname, search } = new URL(requestUrl)
  return `${ORIGIN}${pathname}${search}`
}
