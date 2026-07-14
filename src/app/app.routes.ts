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
  }
];
