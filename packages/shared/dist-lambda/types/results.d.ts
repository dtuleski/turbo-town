/**
 * Result type pattern for type-safe error handling
 */
import { AppError } from './errors';
export interface Success<T> {
    success: true;
    data: T;
}
export interface Failure {
    success: false;
    error: AppError;
}
export type Result<T> = Success<T> | Failure;
export declare function success<T>(data: T): Success<T>;
export declare function failure(error: AppError): Failure;
//# sourceMappingURL=results.d.ts.map