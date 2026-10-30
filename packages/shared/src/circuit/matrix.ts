/**
 * Dense square matrix over a flat `Float64Array`, plus Gaussian elimination with partial
 * pivoting (component A3).
 *
 * This module is the single place that reconciles `noUncheckedIndexedAccess` with numeric
 * code: raw `Float64Array` indexing yields `number | undefined` under that compiler flag, so
 * every read goes through a bounds-checked accessor here instead of being asserted at each
 * call site.
 *
 * The `RangeError` throws below are programming-error guards on internal invariants. They are
 * unreachable from user input, which `validateStructure` has already bounded before any
 * matrix is built.
 */

import { PIVOT_EPSILON } from './constants';
import type { SolveOutcome } from './types';

/** Bounds-checked read of a `Float64Array` cell. */
export function readVector(vector: Float64Array, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= vector.length) {
    throw new RangeError('vector index out of range');
  }
  return vector[index] ?? 0;
}

function swapVector(vector: Float64Array, a: number, b: number): void {
  const temp = readVector(vector, a);
  vector[a] = readVector(vector, b);
  vector[b] = temp;
}

export class Matrix {
  readonly dimension: number;

  private readonly data: Float64Array;

  constructor(dimension: number) {
    if (!Number.isInteger(dimension) || dimension < 0) {
      throw new RangeError('matrix dimension must be a non-negative integer');
    }
    this.dimension = dimension;
    this.data = new Float64Array(dimension * dimension);
  }

  private offset(row: number, col: number): number {
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      col < 0 ||
      row >= this.dimension ||
      col >= this.dimension
    ) {
      throw new RangeError('matrix index out of range');
    }
    return row * this.dimension + col;
  }

  get(row: number, col: number): number {
    return this.data[this.offset(row, col)] ?? 0;
  }

  set(row: number, col: number, value: number): void {
    this.data[this.offset(row, col)] = value;
  }

  add(row: number, col: number, delta: number): void {
    const index = this.offset(row, col);
    this.data[index] = (this.data[index] ?? 0) + delta;
  }

  swapRows(a: number, b: number): void {
    if (a === b) {
      return;
    }
    for (let col = 0; col < this.dimension; col += 1) {
      const temp = this.get(a, col);
      this.set(a, col, this.get(b, col));
      this.set(b, col, temp);
    }
  }

  /** Largest absolute row sum. Used to scale the near-singularity tolerance. */
  infinityNorm(): number {
    let norm = 0;
    for (let row = 0; row < this.dimension; row += 1) {
      let rowSum = 0;
      for (let col = 0; col < this.dimension; col += 1) {
        rowSum += Math.abs(this.get(row, col));
      }
      if (rowSum > norm) {
        norm = rowSum;
      }
    }
    return norm;
  }

  clone(): Matrix {
    const copy = new Matrix(this.dimension);
    copy.data.set(this.data);
    return copy;
  }
}

/** Row at or below `col` holding the largest absolute value in that column. */
function selectPivot(matrix: Matrix, col: number): number {
  let pivotRow = col;
  let best = Math.abs(matrix.get(col, col));
  for (let row = col + 1; row < matrix.dimension; row += 1) {
    const candidate = Math.abs(matrix.get(row, col));
    if (candidate > best) {
      best = candidate;
      pivotRow = row;
    }
  }
  return pivotRow;
}

function eliminateColumn(matrix: Matrix, rhs: Float64Array, col: number): void {
  const pivot = matrix.get(col, col);
  for (let row = col + 1; row < matrix.dimension; row += 1) {
    const leading = matrix.get(row, col);
    if (leading === 0) {
      continue;
    }
    const factor = leading / pivot;
    matrix.set(row, col, 0);
    for (let k = col + 1; k < matrix.dimension; k += 1) {
      matrix.add(row, k, -factor * matrix.get(col, k));
    }
    rhs[row] = readVector(rhs, row) - factor * readVector(rhs, col);
  }
}

function backSubstitute(matrix: Matrix, rhs: Float64Array): SolveOutcome {
  const size = matrix.dimension;
  const values = new Float64Array(size);
  for (let row = size - 1; row >= 0; row -= 1) {
    let sum = readVector(rhs, row);
    for (let col = row + 1; col < size; col += 1) {
      sum -= matrix.get(row, col) * readVector(values, col);
    }
    const pivot = matrix.get(row, row);
    if (pivot === 0) {
      return { singular: true, pivotRow: row };
    }
    values[row] = sum / pivot;
  }
  return { singular: false, values };
}

/**
 * Solve `matrix * x = rhs` by Gaussian elimination with partial pivoting.
 *
 * Neither argument is mutated. Singularity is reported as a value rather than thrown, because
 * a singular system is a meaningful circuit condition - an ideal source across a zero-ohm
 * path - that A4 turns into a `SINGULAR_SYSTEM` fault.
 *
 * The pivot test is scaled by the matrix infinity norm, so it is independent of the circuit's
 * absolute units: a milliamp-scale and a kiloamp-scale system are judged alike.
 */
export function solveGaussian(matrix: Matrix, rhs: Float64Array): SolveOutcome {
  const size = matrix.dimension;
  if (rhs.length !== size) {
    throw new RangeError('right-hand side length must equal the matrix dimension');
  }
  if (size === 0) {
    return { singular: false, values: new Float64Array(0) };
  }

  const working = matrix.clone();
  const vector = Float64Array.from(rhs);
  const tolerance = PIVOT_EPSILON * working.infinityNorm();

  for (let col = 0; col < size; col += 1) {
    const pivotRow = selectPivot(working, col);
    if (Math.abs(working.get(pivotRow, col)) <= tolerance) {
      return { singular: true, pivotRow: col };
    }
    if (pivotRow !== col) {
      working.swapRows(pivotRow, col);
      swapVector(vector, pivotRow, col);
    }
    eliminateColumn(working, vector, col);
  }

  return backSubstitute(working, vector);
}
