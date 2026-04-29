import type { Response } from 'express';
export declare function badRequest(res: Response, message: string): Response<any, Record<string, any>>;
export declare function unauthorized(res: Response, message?: string): Response<any, Record<string, any>>;
export declare function serverError(res: Response, message?: string): Response<any, Record<string, any>>;
//# sourceMappingURL=http.d.ts.map