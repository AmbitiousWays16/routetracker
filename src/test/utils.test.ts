import { describe, it, expect } from "vitest";
import { chunk } from "@/lib/utils";

describe("chunk", () => {
  it("should split an array into chunks of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("should return a single chunk when array length <= size", () => {
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
  });

  it("should return an empty array for an empty input", () => {
    expect(chunk([], 30)).toEqual([]);
  });

  it("should handle exact multiples of chunk size", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("should handle chunk size of 30 (Firestore in-clause limit)", () => {
    const ids = Array.from({ length: 75 }, (_, i) => `user_${i}`);
    const result = chunk(ids, 30);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(30);
    expect(result[1]).toHaveLength(30);
    expect(result[2]).toHaveLength(15);
    // Verify all items are preserved
    expect(result.flat()).toEqual(ids);
  });
});
