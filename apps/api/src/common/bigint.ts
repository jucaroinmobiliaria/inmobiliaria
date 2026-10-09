// BigInt (price, adminFee) se serializa como número JSON. Los mappers convierten explícitamente además.
declare global {
  interface BigInt {
    toJSON(): number;
  }
}
if (!("toJSON" in BigInt.prototype)) {
  Object.defineProperty(BigInt.prototype, "toJSON", {
    value: function toJSON(this: bigint) {
      return Number(this);
    },
    configurable: true,
    writable: true,
  });
}
export const num = (v: bigint | number | null | undefined): number | null => (v === null || v === undefined ? null : Number(v));
export const num0 = (v: bigint | number | null | undefined): number => (v === null || v === undefined ? 0 : Number(v));
export {};
