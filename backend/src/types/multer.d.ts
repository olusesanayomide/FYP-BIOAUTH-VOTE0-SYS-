declare module 'multer' {
    import { RequestHandler } from 'express';

    namespace multer {
        interface File {
            fieldname: string;
            originalname: string;
            encoding: string;
            mimetype: string;
            size: number;
            destination: string;
            filename: string;
            path: string;
            buffer: Buffer;
        }

        interface StorageEngine {
            _handleFile(req: any, file: File, callback: (error?: any, info?: any) => void): void;
            _removeFile(req: any, file: File, callback: (error: Error) => void): void;
        }

        interface Options {
            dest?: string;
            storage?: StorageEngine;
            limits?: {
                fieldNameSize?: number;
                fieldSize?: number;
                fields?: number;
                fileSize?: number;
                files?: number;
                parts?: number;
                headerPairs?: number;
            };
            fileFilter?: (req: any, file: File, callback: (error: Error | null, acceptFile: boolean) => void) => void;
        }

        interface Multer {
            single(fieldname: string): RequestHandler;
            array(fieldname: string, maxCount?: number): RequestHandler;
            fields(fields: ReadonlyArray<{ name: string; maxCount?: number }>): RequestHandler;
            any(): RequestHandler;
            none(): RequestHandler;
        }
    }

    interface MulterStatic {
        (options?: multer.Options): multer.Multer;
        memoryStorage(): multer.StorageEngine;
        diskStorage(options: any): multer.StorageEngine;
    }

    const multer: MulterStatic;
    export = multer;
}

declare namespace Express {
    interface Request {
        file?: any;
        files?: any;
    }
}
