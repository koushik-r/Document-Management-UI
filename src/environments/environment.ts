/**
 * Default (production) environment.
 *
 * The frontend talks to two backends:
 *   - uploadApiBase     → the .NET blob-upload backend
 *   - extractionApiBase → the Azure Functions extraction backend
 *
 * Replace these with the deployed URLs for your production hosts. Leave a value
 * as a same-origin relative path (e.g. '/api') when that backend is served from
 * the same host as the frontend behind a reverse proxy.
 */
export const environment = {
  production: true,
  uploadApiBase: '/api',
  extractionApiBase: '/api/idp'
};
