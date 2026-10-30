import { Matrix, readVector, solveGaussian } from './matrix';

describe('Matrix', () => {
  it('reads back what was written and accumulates with add', () => {
    const matrix = new Matrix(2);
    matrix.set(0, 1, 3);
    matrix.add(0, 1, 4);
    expect(matrix.get(0, 1)).toBe(7);
    expect(matrix.get(1, 0)).toBe(0);
  });

  it('rejects out-of-range indices as programming errors', () => {
    const matrix = new Matrix(2);
    expect(() => matrix.get(2, 0)).toThrow(RangeError);
    expect(() => matrix.get(0, -1)).toThrow(RangeError);
    expect(() => new Matrix(-1)).toThrow(RangeError);
  });

  it('swaps rows and reports the infinity norm', () => {
    const matrix = new Matrix(2);
    matrix.set(0, 0, 1);
    matrix.set(0, 1, 2);
    matrix.set(1, 0, -5);
    matrix.set(1, 1, 1);
    expect(matrix.infinityNorm()).toBe(6);
    matrix.swapRows(0, 1);
    expect(matrix.get(0, 0)).toBe(-5);
    expect(matrix.get(1, 0)).toBe(1);
  });

  it('clones without aliasing the original', () => {
    const matrix = new Matrix(1);
    matrix.set(0, 0, 2);
    const copy = matrix.clone();
    copy.set(0, 0, 9);
    expect(matrix.get(0, 0)).toBe(2);
    expect(copy.get(0, 0)).toBe(9);
  });
});

describe('readVector', () => {
  it('rejects an index outside the array', () => {
    const vector = Float64Array.from([1, 2]);
    expect(readVector(vector, 1)).toBe(2);
    expect(() => readVector(vector, 2)).toThrow(RangeError);
  });
});

describe('solveGaussian', () => {
  it('solves a known 3 by 3 system', () => {
    const matrix = new Matrix(3);
    const rows = [
      [2, 1, -1],
      [-3, -1, 2],
      [-2, 1, 2],
    ];
    rows.forEach((row, i) => row.forEach((value, j) => matrix.set(i, j, value)));
    const outcome = solveGaussian(matrix, Float64Array.from([8, -11, -3]));

    expect(outcome.singular).toBe(false);
    if (outcome.singular) {
      return;
    }
    expect(outcome.values[0]).toBeCloseTo(2, 12);
    expect(outcome.values[1]).toBeCloseTo(3, 12);
    expect(outcome.values[2]).toBeCloseTo(-1, 12);
  });

  it('solves a system whose first pivot is zero, which requires the row swap', () => {
    const matrix = new Matrix(2);
    matrix.set(0, 0, 0);
    matrix.set(0, 1, 1);
    matrix.set(1, 0, 1);
    matrix.set(1, 1, 0);
    const outcome = solveGaussian(matrix, Float64Array.from([1, 2]));

    expect(outcome.singular).toBe(false);
    if (outcome.singular) {
      return;
    }
    expect(outcome.values[0]).toBeCloseTo(2, 12);
    expect(outcome.values[1]).toBeCloseTo(1, 12);
  });

  it('reports a singular system instead of throwing or returning NaN', () => {
    const matrix = new Matrix(2);
    matrix.set(0, 0, 1);
    matrix.set(0, 1, 2);
    matrix.set(1, 0, 2);
    matrix.set(1, 1, 4);
    const outcome = solveGaussian(matrix, Float64Array.from([1, 2]));

    expect(outcome.singular).toBe(true);
  });

  it('treats an all-zero matrix as singular', () => {
    expect(solveGaussian(new Matrix(2), new Float64Array(2)).singular).toBe(true);
  });

  it('solves the empty system', () => {
    const outcome = solveGaussian(new Matrix(0), new Float64Array(0));
    expect(outcome.singular).toBe(false);
  });

  it('leaves its arguments untouched', () => {
    const matrix = new Matrix(1);
    matrix.set(0, 0, 4);
    const rhs = Float64Array.from([8]);
    solveGaussian(matrix, rhs);
    expect(matrix.get(0, 0)).toBe(4);
    expect(readVector(rhs, 0)).toBe(8);
  });

  it('rejects a right-hand side of the wrong length', () => {
    expect(() => solveGaussian(new Matrix(2), new Float64Array(1))).toThrow(RangeError);
  });
});
