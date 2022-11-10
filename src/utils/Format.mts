import { LuxonKey } from "jm-castle-ac-dc-types";

export const getDateFormat = (level: LuxonKey): string => {
  switch (level) {
    case "millisecond":
      return "HH:mm:ss.SSS";
    case "second":
      return "yyyy-LL-dd HH:mm:ss";
    case "minute":
      return "yyyy-LL-dd HH:mm";
    case "hour":
      return "yyyy-LL-dd HH";
    case "day":
      return "yyyy-LL-dd";
    default:
      return "yyyy-LL-dd HH:mm:ss";
  }
};
