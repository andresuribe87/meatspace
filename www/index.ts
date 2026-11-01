/**
 * meatspace-www: the only job of this Worker is a permanent redirect from www.meatspace.sh to the apex.
 * It is a separate Worker (Custom Domain www.meatspace.sh) because the main Worker serves static assets
 * before running, so it could not redirect www navigations without running on every asset request.
 */
import { apexUrl } from './redirect'

export default {
  fetch: (request) => Response.redirect(apexUrl(request.url), 301),
} satisfies ExportedHandler
