/** 업로드한 파일은 DB가 없으므로 세션(메모리) 동안만 보관합니다. 새로고침 시 샘플 답안지로 대체됩니다. */
const blobs = new Map<string, Blob>()
const urls = new Map<string, string>()

export function putBlob(name: string, blob: Blob) {
  blobs.set(name, blob)
  const old = urls.get(name)
  if (old) URL.revokeObjectURL(old)
  urls.delete(name)
}

export function blobFor(name: string): string | null {
  const b = blobs.get(name)
  if (!b) return null
  let u = urls.get(name)
  if (!u) {
    u = URL.createObjectURL(b)
    urls.set(name, u)
  }
  return u
}

export const isImageName = (name: string) => /\.(png|jpe?g)$/i.test(name)

/** 과제물 관리에서 고른 학급 PDF를 분할 화면으로 넘겨 주기 위한 임시 보관 */
let pendingPdf: File | null = null
export const setPendingPdf = (f: File | null) => { pendingPdf = f }
export const takePendingPdf = () => {
  const f = pendingPdf
  pendingPdf = null
  return f
}
