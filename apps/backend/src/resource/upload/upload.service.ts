import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

@Injectable()
export class UploadService {
    saveFiles(files: Express.Multer.File[], type = 'others') {
        const uploadPath = join(process.cwd(), 'uploads', type);

        if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
        }

        const savedPaths: string[] = [];

        for (const file of files) {
            const ext = file.originalname.split('.').pop();
            const timestamp = Date.now();
            const random = Math.round(Math.random() * 1e9);
            const filename = `${timestamp}-${random}.${ext}`;

            const fullPath = join(uploadPath, filename);
            writeFileSync(fullPath, file.buffer);

            savedPaths.push(`/${type}/${filename}`);
        }

        return savedPaths;
    }
}
