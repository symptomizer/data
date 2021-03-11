// import parse from "csv-parse/lib/sync";
const {parse} = require("csv-parse/lib/sync");

const csv = (csvString) => {
  return parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
};
