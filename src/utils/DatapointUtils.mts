import { DatapointState } from "../Types.mjs";

export const compareAtOfStates = (a: DatapointState, b: DatapointState) => {
  return a.at - b.at;
};
