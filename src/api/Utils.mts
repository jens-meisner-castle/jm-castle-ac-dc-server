import { Response } from "express";
import {
  ApiServiceResponse,
  CastleConfigErrorCode,
  DevErrorCode,
  ErrorCode,
  getApiStatus,
} from "jm-castle-types";
import { Persistence } from "../persistence/Types.mjs";
import { getCurrentSystem } from "../system/status/System.mjs";

export const handleError = (
  res: Response,
  errorCode: ErrorCode,
  error: string,
  errorDetails?: Record<string, unknown>
) => {
  const apiResponse: ApiServiceResponse<undefined> = {
    errorCode,
    error,
    errorDetails,
  };
  return res
    .status(getApiStatus(apiResponse.errorCode || "-1"))
    .send(apiResponse);
};

export const handleErrorOrUndefinedResult = (
  res: Response,
  result: unknown | undefined,
  errorCode: ErrorCode | undefined,
  error: string | undefined,
  errorDetails?: Record<string, unknown>
): boolean => {
  if (error) {
    handleError(res, errorCode, error, errorDetails);
    return true;
  }
  if (!result) {
    handleError(res, DevErrorCode, `Received undefined result without error.`);
    return true;
  }
  return false;
};

export const withDefaultPersistence = (
  res: Response,
  cb: (persistence: Persistence) => Promise<unknown>
) => {
  const persistence = getCurrentSystem().getDefaultPersistence();
  if (persistence) {
    cb(persistence);
  } else {
    return handleError(
      res,
      CastleConfigErrorCode,
      "Currently is no default persistence available."
    );
  }
};
