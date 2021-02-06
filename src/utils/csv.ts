import parse from "csv-parse/lib/sync";

export const csv = (csvString: string): Record<string, unknown>[] => {
  return parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
};
