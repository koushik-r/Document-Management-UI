export interface DocumentModel {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  compressedSize?: number;
  dataUrl?: string;
  downloadUrl?: string;
}
