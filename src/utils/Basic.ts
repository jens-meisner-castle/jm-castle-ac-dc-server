import { ErrorCode } from "jm-castle-types";

export function without<T = Record<string, unknown>>(
  obj: T,
  ...toDelete: Array<keyof T>
) {
  const newObj = obj;
  toDelete.forEach((k) => delete newObj[k]);
  return newObj;
}

export class ErrorWithCode extends Error {
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }

  public code: ErrorCode;
}
