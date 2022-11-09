import { DatapointState } from "jm-castle-ac-dc-types/dist/All.mjs";

export const compareAtOfStates = (a: DatapointState, b: DatapointState) => {
  return a.at - b.at;
};
