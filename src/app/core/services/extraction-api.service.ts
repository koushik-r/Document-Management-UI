import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ExtractionResultRecord,
  ExtractionDocument,
  TemplateRecord,
  UsageSummary
} from '../models/extraction.model';
import { environment } from '../../../environments/environment';

/**
 * Talks to the SECOND backend — the extraction API (Azure Functions in dev).
 * (The first backend, DocumentApiService, only handles plain blob uploads.)
 *
 * Base URL is per-environment; see src/environments/environment*.ts.
 */
export const EXTRACTION_API_BASE = environment.extractionApiBase;

@Injectable({ providedIn: 'root' })
export class ExtractionApiService {
  private http = inject(HttpClient);

  // ── Documents ──────────────────────────────────────────────────────────
  listDocuments(): Observable<ExtractionDocument[]> {
    return this.http.get<ExtractionDocument[]>(`${EXTRACTION_API_BASE}/documents`);
  }

  getDocument(id: string): Observable<ExtractionDocument> {
    return this.http.get<ExtractionDocument>(`${EXTRACTION_API_BASE}/documents/${id}`);
  }

  /** Upload a document to the extraction backend; runs extraction unless extract=false. */
  uploadAndExtract(file: File, templateId?: string, extract = true): Observable<ExtractionDocument> {
    const form = new FormData();
    form.append('file', file);
    if (templateId) form.append('template_id', templateId);
    const params: Record<string, string> = {};
    if (!extract) params['extract'] = 'false';
    if (templateId) params['template_id'] = templateId;
    return this.http.post<ExtractionDocument>(`${EXTRACTION_API_BASE}/documents/upload`, form, { params });
  }

  reextract(documentId: string, templateId?: string): Observable<ExtractionDocument> {
    const params: Record<string, string> = templateId ? { template_id: templateId } : {};
    return this.http.post<ExtractionDocument>(
      `${EXTRACTION_API_BASE}/documents/${documentId}/extract`,
      {},
      { params }
    );
  }

  deleteDocument(id: string): Observable<{ deleted: string }> {
    return this.http.delete<{ deleted: string }>(`${EXTRACTION_API_BASE}/documents/${id}`);
  }

  /** URL for previewing / downloading the stored blob. */
  blobUrl(id: string): string {
    return `${EXTRACTION_API_BASE}/documents/${id}/blob`;
  }

  // ── Templates ──────────────────────────────────────────────────────────
  listTemplates(): Observable<TemplateRecord[]> {
    return this.http.get<TemplateRecord[]>(`${EXTRACTION_API_BASE}/templates`);
  }

  getTemplate(templateId: string): Observable<TemplateRecord> {
    return this.http.get<TemplateRecord>(`${EXTRACTION_API_BASE}/templates/${templateId}`);
  }

  uploadTemplate(file: File, name?: string, useLlm = true): Observable<TemplateRecord> {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    form.append('use_llm', String(useLlm));
    return this.http.post<TemplateRecord>(`${EXTRACTION_API_BASE}/templates/upload`, form);
  }

  deleteTemplate(templateId: string): Observable<{ deleted: string }> {
    return this.http.delete<{ deleted: string }>(`${EXTRACTION_API_BASE}/templates/${templateId}`);
  }

  // ── Extractions ────────────────────────────────────────────────────────
  getExtraction(documentId: string): Observable<ExtractionResultRecord> {
    return this.http.get<ExtractionResultRecord>(`${EXTRACTION_API_BASE}/extractions/${documentId}`);
  }

  // ── Usage ──────────────────────────────────────────────────────────────
  getUsage(documentId?: string): Observable<UsageSummary> {
    const params: Record<string, string> = documentId ? { document_id: documentId } : {};
    return this.http.get<UsageSummary>(`${EXTRACTION_API_BASE}/usage`, { params });
  }
}
