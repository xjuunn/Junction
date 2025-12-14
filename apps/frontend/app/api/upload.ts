import type { UploadController } from '@junction/backend/src/resource/upload/upload.controller'

const base = "/upload"

/**
 * 上传文件
 */
export function uploadFiles(type: string, files: File[]) {
    const form = new FormData()
    form.append("type", type)
    files.forEach(file => form.append("files", file))
    return api.post<AwaitedReturnType<UploadController['uploadFiles']>>
        (base + "/files", form, {}, { headers: { "Content-Type": "multipart/form-data" } })
}