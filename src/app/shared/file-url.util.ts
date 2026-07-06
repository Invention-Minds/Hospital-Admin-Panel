import { environment } from '../../environment/environment';

/**
 * Resolve a stored file reference to a loadable URL.
 *
 * Files served by the backend are stored as RELATIVE paths (e.g.
 * "/files/ads_image/foo.png") so DB rows stay portable across environments.
 * The browser must resolve them against the API origin, not the frontend
 * origin — so we prepend `environment.filesUrl` (same pattern estimation PDFs
 * use: `${environment.filesUrl}${estimation.pdfLink}`).
 *
 * Passthrough cases (returned unchanged):
 *   - absolute http(s) URLs — legacy records that stored the full external URL
 *   - data: URLs — inline base64 (e.g. a signature-pad capture)
 *
 * In prod `environment.filesUrl` is '' so relative paths resolve same-origin
 * (nginx proxies /files -> backend, like /api).
 */
export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${environment.filesUrl}${url}`;
}
