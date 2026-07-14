import { Injectable, signal } from '@angular/core';
import { DocumentModel } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class UploadService {
  documents = signal<DocumentModel[]>([]);

  setDocuments(docs: DocumentModel[]): void {
    this.documents.set(docs);
  }

  addDocument(doc: DocumentModel): void {
    this.documents.update(prev => [doc, ...prev]);
  }

  removeDocument(id: string): void {
    this.documents.update(prev => prev.filter(d => d.id !== id));
  }

  getDocument(id: string): DocumentModel | undefined {
    return this.documents().find(d => d.id === id);
  }
}
