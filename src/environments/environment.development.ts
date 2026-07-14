/**
 * Local development environment (used by `ng serve`).
 *
 *   - uploadApiBase     → .NET blob-upload backend (default: http://localhost:5000/api)
 *   - extractionApiBase → Azure Functions extraction backend
 *                         (`func start` serves under http://localhost:7071/api,
 *                          the IDP routes live under /api/idp)
 */
export const environment = {
  production: false,
  uploadApiBase: 'http://localhost:5000/api',
  extractionApiBase: 'http://localhost:7071/api/idp'
};
