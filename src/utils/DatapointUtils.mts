import { DatapointState } from "jm-castle-ac-dc-types";

export const compareAtOfStates = (a: DatapointState, b: DatapointState) => {
  return a.at - b.at;
};
