import type { Publisher, Stored } from '../../server/operating/publisher.ts'
export class MemoryPublisher implements Publisher {
  data = new Map<string, { value: unknown; version: number }>()
  async read<T>(path: string): Promise<Stored<T>> {
    const record = this.data.get(path)
    return { value: structuredClone(record?.value ?? null) as T | null, etag: String(record?.version ?? 0) }
  }
  async write(path: string, value: unknown, etag?: string) {
    const current = this.data.get(path)
    if (etag !== undefined && etag !== String(current?.version ?? 0)) return false
    this.data.set(path, { value: structuredClone(value), version: (current?.version ?? 0) + 1 })
    return true
  }
}
