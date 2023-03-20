export const addJokerToFilterValue = (s: string) => {
  let filterValue = s.startsWith("%") ? s : "%" + s;
  filterValue = filterValue.endsWith("%") ? filterValue : filterValue + "%";
  return filterValue;
};
