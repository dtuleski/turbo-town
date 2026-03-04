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

export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

export function failure(error: AppError): Failure {
  return { success: false, error };
}
