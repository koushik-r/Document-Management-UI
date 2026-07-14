import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'upload',
    pathMatch: 'full'
  },
  {
    path: 'upload',
    loadComponent: () =>
      import('./features/upload/upload.component')
        .then(m => m.UploadComponent)
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./features/documents/document-list/document-list.component')
        .then(m => m.DocumentListComponent)
  },
  {
    path: 'documents/:id',
    loadComponent: () =>
      import('./features/documents/document-viewer/document-viewer.component')
        .then(m => m.DocumentViewerComponent)
  },
  {
    path: 'idp',
    loadComponent: () =>
      import('./features/document-processing/home/home.component')
        .then(m => m.HomeComponent)
  },
  {
    path: 'idp/templates',
    loadComponent: () =>
      import('./features/document-processing/templates/templates.component')
        .then(m => m.TemplatesComponent)
  },
  {
    path: 'idp/upload',
    loadComponent: () =>
      import('./features/document-processing/upload/upload.component')
        .then(m => m.UploadComponent)
  },
  {
    path: 'idp/results',
    data: { mode: 'results' },
    loadComponent: () =>
      import('./features/document-processing/results/results.component')
        .then(m => m.ResultsComponent)
  },
  {
    path: 'idp/preview',
    data: { mode: 'preview' },
    loadComponent: () =>
      import('./features/document-processing/results/results.component')
        .then(m => m.ResultsComponent)
  }
];
