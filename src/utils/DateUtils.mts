import { DateTime, Duration } from "luxon";

export const getSimulationAtArray = (
  from: DateTime,
  to: DateTime,
  precision: Duration
) => {
  const atArr: number[] = [];
  const start = from;
  const count = Math.ceil(to.diff(from).toMillis() / precision.toMillis());
  let offset = Duration.fromObject({ seconds: 0 });
  for (let i = 0; i < count; i++) {
    atArr.push(start.plus(offset).toMillis());
    offset = offset.plus(precision);
  }
  return atArr;
};
