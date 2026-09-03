import fs from 'fs';
import zlib from 'zlib';

export class VectorEngine {
  private vectors!: Uint8Array;
  private labels!: Uint8Array;
  private totalCount = 0;
  private isLoaded = false;

  public async loadDataset(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      this.isLoaded = true;
      return;
    }

    const compressed = fs.readFileSync(filePath);
    const decompressed = zlib.gunzipSync(compressed);
    const data = JSON.parse(decompressed.toString('utf-8')) as { vector: number[]; is_fraud: boolean }[];

    this.totalCount = data.length;
    this.vectors = new Uint8Array(this.totalCount * 14);
    this.labels = new Uint8Array(this.totalCount);

    for (let i = 0; i < this.totalCount; i++) {
      const item = data[i];
      this.labels[i] = item.is_fraud ? 1 : 0;
      const offset = i * 14;
      for (let d = 0; d < 14; d++) {
        this.vectors[offset + d] = Math.floor(Math.max(0, Math.min(1, item.vector[d])) * 255);
      }
    }

    this.isLoaded = true;
  }

  public ready(): boolean {
    return this.isLoaded;
  }

  public findFraudScore(query: Uint8Array): number {
    if (this.totalCount === 0) return 0.0;

    let d0 = 0, d1 = 0, d2 = 0, d3 = 0, d4 = 0;
    let label0 = 0, label1 = 0, label2 = 0, label3 = 0, label4 = 0;
    d0 = d1 = d2 = d3 = d4 = Number.MAX_SAFE_INTEGER;

    const len = this.totalCount;
    const vecs = this.vectors;
    const lbls = this.labels;

    for (let i = 0; i < len; i++) {
      const offset = i * 14;
      let dist = 0;

      for (let j = 0; j < 14; j++) {
        const diff = query[j] - vecs[offset + j];
        dist += diff * diff;
      }

      if (dist < d4) {
        if (dist < d0) {
          d4 = d3; label4 = label3;
          d3 = d2; label3 = label2;
          d2 = d1; label2 = label1;
          d1 = d0; label1 = label0;
          d0 = dist; label0 = lbls[i];
        } else if (dist < d1) {
          d4 = d3; label4 = label3;
          d3 = d2; label3 = label2;
          d2 = d1; label2 = label1;
          d1 = dist; label1 = lbls[i];
        } else if (dist < d2) {
          d4 = d3; label4 = label3;
          d3 = d2; label3 = label2;
          d2 = dist; label2 = lbls[i];
        } else if (dist < d3) {
          d4 = d3; label4 = label3;
          d3 = dist; label3 = lbls[i];
        } else {
          d4 = dist; label4 = lbls[i];
        }
      }
    }

    const fraudCount = label0 + label1 + label2 + label3 + label4;
    return fraudCount / 5.0;
  }
}
