import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CompressionService {
  /**
   * Compress a File using the CompressionStream API (supported in modern browsers).
   * Falls back to returning the original ArrayBuffer if the API is unavailable.
   */
  async compress(file: File): Promise<{ data: ArrayBuffer; compressedSize: number }> {
    const buffer = await file.arrayBuffer();

    if (typeof CompressionStream === 'undefined') {
      return { data: buffer.slice(0), compressedSize: buffer.byteLength };
    }

    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    await writer.write(new Uint8Array(buffer));
    await writer.close();

    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((s, c) => s + c.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { data: result.buffer.slice(0, result.byteLength), compressedSize: result.byteLength };
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
