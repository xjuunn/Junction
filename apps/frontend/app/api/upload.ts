import type { UploadService } from '@junction/backend/src/resource/upload/upload.service'

const base = "/upload"

/**
 * 上传文件
 */
export function uploadFiles(type: string, files: File[]) {
    const form = new FormData()
    form.append("type", type)
    files.forEach(file => form.append("files", file))
    return api.post<AwaitedReturnType<UploadService['saveFiles']>>
        (base + "/files", form, {}, { headers: { "Content-Type": "multipart/form-data" } })
}
