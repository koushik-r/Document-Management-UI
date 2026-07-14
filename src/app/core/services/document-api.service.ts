import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { DocumentModel } from '../models/document.model';

interface BlobDocumentInfo {
  fileName: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

export const API_BASE = 'http://localhost:5000/api';

// Files below this size use the simple single-POST path.
// Files at or above this size use chunked block upload.
const SMALL_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

// Each chunk sent to POST /api/upload/block/{id}/{index}
const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB

export interface UploadProgress {
  percent: number;        // 0–100
  uploadedBytes: number;
  totalBytes: number;
  done: boolean;
  doc?: DocumentModel;
}

@Injectable({ providedIn: 'root' })
export class DocumentApiService {
  private http = inject(HttpClient);

  list(): Observable<DocumentModel[]> {
    return this.http.get<BlobDocumentInfo[]>(`${API_BASE}/documents`).pipe(
      map(items => items.map(i => this.toModel(i)))
    );
  }

  delete(fileName: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/documents/${encodeURIComponent(fileName)}`);
  }

  getDownloadUrl(fileName: string): string {
    return `${API_BASE}/documents/${encodeURIComponent(fileName)}`;
  }

  /**
   * Upload a file with real byte-accurate progress reporting.
   *
   * Small files (< 10 MB) → single multipart POST to /api/upload
   * Large files (≥ 10 MB) → chunked block upload:
   *   1. Slice file into 4 MB Blobs (zero-copy, no ArrayBuffer allocation)
   *   2. POST each slice as raw binary to /api/upload/block/{uploadId}/{i}
   *   3. POST to /api/upload/commit once all blocks are staged
   *
   * Yields UploadProgress events so the component can show a real progress bar.
   * On error, calls DELETE /api/upload/abort/{uploadId} to clean up staged blocks.
   */
  async *uploadWithProgress(file: File): AsyncGenerator<UploadProgress> {
    if (file.size < SMALL_FILE_THRESHOLD) {
      yield* this.uploadSmall(file);
    } else {
      yield* this.uploadChunked(file);
    }
  }

  private async *uploadSmall(file: File): AsyncGenerator<UploadProgress> {
    yield { percent: 10, uploadedBytes: 0, totalBytes: file.size, done: false };

    const form = new FormData();
    form.append('file', file);
    const info = await this.http
      .post<BlobDocumentInfo>(`${API_BASE}/upload`, form)
      .toPromise();

    yield {
      percent: 100,
      uploadedBytes: file.size,
      totalBytes: file.size,
      done: true,
      doc: this.toModel(info!)
    };
  }

  private async *uploadChunked(file: File): AsyncGenerator<UploadProgress> {
    const uploadId    = crypto.randomUUID();
    const totalBytes  = file.size;
    const totalBlocks = Math.ceil(totalBytes / CHUNK_SIZE);
    let   uploadedBytes = 0;

    try {
      for (let i = 0; i < totalBlocks; i++) {
        const start = i * CHUNK_SIZE;
        const end   = Math.min(start + CHUNK_SIZE, totalBytes);

        // file.slice() is zero-copy — the browser does not allocate a new buffer.
        // The Blob is streamed directly from the File handle when POSTed.
        const chunk = file.slice(start, end);

        await this.http.post(
          `${API_BASE}/upload/block/${uploadId}/${i}`,
          chunk,
          { headers: { 'Content-Type': 'application/octet-stream' } }
        ).toPromise();

        uploadedBytes += (end - start);

        // Reserve the last 5% of progress for the commit step
        yield {
          percent: Math.round((uploadedBytes / totalBytes) * 95),
          uploadedBytes,
          totalBytes,
          done: false
        };
      }

      // All blocks staged — commit them into the final blob
      yield { percent: 97, uploadedBytes, totalBytes, done: false };

      const info = await this.http.post<BlobDocumentInfo>(
        `${API_BASE}/upload/commit`,
        {
          uploadId,
          fileName:    file.name,
          contentType: file.type || 'application/octet-stream',
          totalBlocks
        }
      ).toPromise();

      yield {
        percent: 100,
        uploadedBytes: totalBytes,
        totalBytes,
        done: true,
        doc: this.toModel(info!)
      };

    } catch (err) {
      // Best-effort cleanup — do not suppress the original error
      await this.http
        .delete(`${API_BASE}/upload/abort/${uploadId}`)
        .toPromise()
        .catch(() => {});
      throw err;
    }
  }

  private toModel(info: BlobDocumentInfo): DocumentModel {
    return {
      id:          info.fileName,
      name:        info.fileName,
      size:        info.size,
      type:        info.contentType,
      uploadedAt:  new Date(info.uploadedAt),
      downloadUrl: this.getDownloadUrl(info.fileName)
    };
  }
}
