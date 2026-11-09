/**
 * Micro QR Code Generator in pure TypeScript (Zero external dependencies).
 * Generates a standard QR Code matrix (boolean[][]) suitable for SVG or Canvas rendering.
 * Supports Byte mode (UTF-8 strings up to 150 chars, perfect for URLs & hashes).
 */

// Galois Field GF(256) tables for Reed-Solomon computation
const EXP: number[] = new Array(512);
const LOG: number[] = new Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    EXP[i] = EXP[i - 255];
  }
})();

function gmult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function polyMul(p: number[], q: number[]): number[] {
  const result = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      result[i + j] ^= gmult(p[i], q[j]);
    }
  }
  return result;
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    poly = polyMul(poly, [1, EXP[i]]);
  }
  return poly;
}

function rsCompute(data: number[], numEc: number): number[] {
  const gen = rsGeneratorPoly(numEc);
  const msg = [...data, ...new Array(numEc).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gmult(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// Version table configurations for Error Correction Level L (Low - 7% recovery, max capacity)
// [Version, Total Modules, Total Data Codewords, EC Codewords]
const VERSION_SPECS: { version: number; size: number; totalData: number; ecWords: number }[] = [
  { version: 1, size: 21, totalData: 19, ecWords: 7 },
  { version: 2, size: 25, totalData: 34, ecWords: 10 },
  { version: 3, size: 29, totalData: 55, ecWords: 15 },
  { version: 4, size: 33, totalData: 80, ecWords: 20 },
  { version: 5, size: 37, totalData: 108, ecWords: 26 },
  { version: 6, size: 41, totalData: 136, ecWords: 36 },
];

/**
 * Generate 2D boolean matrix of QR modules
 */
export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes = new TextEncoder().encode(text);
  const length = utf8Bytes.length;

  // Find minimal version that can hold length + 2 bytes header
  const spec = VERSION_SPECS.find((s) => s.totalData >= length + 3) || VERSION_SPECS[VERSION_SPECS.length - 1];
  const { size, totalData, ecWords } = spec;

  // 1. Bit Buffer: Mode (Byte: 0100) + Character Count (8 bits) + Data + Terminator + Pad
  const bitBuf: number[] = [];
  const pushBits = (val: number, bits: number) => {
    for (let i = bits - 1; i >= 0; i--) {
      bitBuf.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(length, 8); // 8-bit length
  for (const b of utf8Bytes) pushBits(b, 8);
  pushBits(0, Math.min(4, totalData * 8 - bitBuf.length)); // Terminator

  while (bitBuf.length % 8 !== 0) bitBuf.push(0);

  const dataBytes: number[] = [];
  for (let i = 0; i < bitBuf.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bitBuf[i + j];
    dataBytes.push(byte);
  }

  // Pad bytes
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (dataBytes.length < totalData) {
    dataBytes.push(padPatterns[padIdx % 2]);
    padIdx++;
  }

  // 2. Compute Reed-Solomon Error Correction
  const ecBytes = rsCompute(dataBytes, ecWords);
  const allCodewords = [...dataBytes, ...ecBytes];

  // 3. Setup Matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null)
  );

  // Helper: Finder Pattern
  const placeFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const row = r + dr;
        const col = c + dc;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          const isOuter = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const isInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          const isWhiteBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7;
          matrix[row][col] = isWhiteBorder ? false : isOuter || isInner;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[size - 8][8] = true;

  // Format info placeholders
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }

  // 4. Fill Data using Up/Down zigzag layout
  const allBits: number[] = [];
  for (const b of allCodewords) {
    for (let i = 7; i >= 0; i--) allBits.push((b >> i) & 1);
  }

  let bitIndex = 0;
  let dir = -1; // Going up
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--; // Skip timing pattern column
    const rows = dir === -1 ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i);
    for (const row of rows) {
      for (let c = col; c >= col - 1; c--) {
        if (matrix[row][c] === null) {
          const bit = bitIndex < allBits.length ? allBits[bitIndex++] : 0;
          // Apply Mask 0: (row + col) % 2 == 0
          const mask = (row + c) % 2 === 0;
          matrix[row][c] = (bit === 1) !== mask;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }

  // 5. Place Format Information (Level L, Mask 0 = 0b111011111000100)
  const formatInfo = 0b111011111000100;
  const formatBits: boolean[] = [];
  for (let i = 14; i >= 0; i--) formatBits.push(((formatInfo >> i) & 1) === 1);

  // Top-left
  matrix[8][0] = formatBits[0];
  matrix[8][1] = formatBits[1];
  matrix[8][2] = formatBits[2];
  matrix[8][3] = formatBits[3];
  matrix[8][4] = formatBits[4];
  matrix[8][5] = formatBits[5];
  matrix[8][7] = formatBits[6];
  matrix[8][8] = formatBits[7];
  matrix[7][8] = formatBits[8];
  matrix[5][8] = formatBits[9];
  matrix[4][8] = formatBits[10];
  matrix[3][8] = formatBits[11];
  matrix[2][8] = formatBits[12];
  matrix[1][8] = formatBits[13];
  matrix[0][8] = formatBits[14];

  // Top-right & bottom-left
  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = formatBits[i];
  for (let i = 0; i < 8; i++) matrix[8][size - 8 + i] = formatBits[7 + i];

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

