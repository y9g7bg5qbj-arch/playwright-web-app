import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async Express route handler to catch rejected promises
 * and forward errors to Express error middleware via next().
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     const data = await someAsyncOp();
 *     res.json({ success: true, data });
 *   }));
 */
export function asyncHandler(
    fn: (req: any, res: Response, next: NextFunction) => Promise<any>
): (req: Request, res: Response, next: NextFunction) => void {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
