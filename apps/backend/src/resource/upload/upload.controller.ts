import { Controller, Post, Body, UploadedFiles, UseInterceptors, HttpStatus } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseFilePipeBuilder } from '@nestjs/common';
import { UploadService } from './upload.service';

@ApiTags('文件上传')
@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('files')
    @ApiOperation({ summary: '上传文件' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                type: { type: 'string', example: 'avatar' },
                files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    @UseInterceptors(FilesInterceptor('files', 20))
    uploadFiles(
        @Body('type') type: string,
        @UploadedFiles(
            new ParseFilePipeBuilder()
                .addMaxSizeValidator({ maxSize: 20 * 1024 * 1024 })
                .addFileTypeValidator({
                    fileType: /^image\/(jpeg|jpg|png|gif|webp)$/i,
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    fileIsRequired: false,
                })
        )
        files: Express.Multer.File[],
    ) {
        const paths = this.uploadService.saveFiles(files, type);
        return { message: '上传成功', type, files: paths };
    }
}
