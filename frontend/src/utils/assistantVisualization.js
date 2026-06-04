const DATE_KEY_PATTERN = /(date|time|month|week|day|year|period|at)$/i;

const isNumericValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number" && Number.isFinite(value)) return true;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return true;
  return false;
};

const toNumber = (value) => (typeof value === "number" ? value : Number(value));

const classifyColumn = (key, rows) => {
  const sample = rows.slice(0, 25).map((row) => row?.[key]);
  const numericCount = sample.filter(isNumericValue).length;
  const dateLike = sample.some(
    (value) =>
      typeof value === "string" &&
      (DATE_KEY_PATTERN.test(key) || /^\d{4}-\d{2}-\d{2}/.test(value))
  );
  if (dateLike) return "date";
  if (numericCount >= Math.max(1, Math.ceil(sample.length * 0.6))) return "number";
  return "label";
};

const pickColumns = (rows) => {
  if (!rows?.length) return { labelKey: null, valueKeys: [], columns: [] };
  const keys = Object.keys(rows[0] || {});
  const classified = keys.map((key) => ({ key, kind: classifyColumn(key, rows) }));
  const labelKey =
    classified.find((col) => col.kind === "date")?.key ||
    classified.find((col) => col.kind === "label")?.key ||
    keys[0];
  const valueKeys = classified
    .filter((col) => col.kind === "number" && col.key !== labelKey)
    .map((col) => col.key);
  return { labelKey, valueKeys, columns: keys };
};

export const buildVisualization = (rows, { title, query } = {}) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { type: "empty", title: title || "No data", message: "No rows returned.", query: query || null };
  }

  if (rows.length === 1 && Object.keys(rows[0]).length <= 6) {
    const row = rows[0];
    const metrics = Object.entries(row)
      .filter(([, value]) => isNumericValue(value))
      .map(([key, value]) => ({ key, label: key.replace(/_/g, " "), value: toNumber(value) }));
    if (metrics.length) return { type: "metric", title: title || "Key metrics", metrics };
  }

  const { labelKey, valueKeys, columns } = pickColumns(rows);
  if (!valueKeys.length) {
    return { type: "table", title: title || "Results", columns, rows: rows.slice(0, 50), query: query || null };
  }

  const labelKind = classifyColumn(labelKey, rows);

  if (rows.length <= 8 && valueKeys.length === 1) {
    const valueKey = valueKeys[0];
    return {
      type: "pie",
      title: title || "Distribution",
      slices: rows.map((row, index) => ({
        label: row[labelKey] == null ? `Item ${index + 1}` : String(row[labelKey]),
        value: toNumber(row[valueKey] ?? 0),
      })),
    };
  }

  const labels = rows.map((row, index) =>
    row[labelKey] == null ? `Item ${index + 1}` : String(row[labelKey])
  );
  const datasets = valueKeys.map((key) => ({
    key,
    label: key.replace(/_/g, " "),
    values: rows.map((row) => toNumber(row[key] ?? 0)),
  }));

  if (labelKind === "date" || rows.length >= 4) {
    return { type: "line", title: title || "Trend", labels, datasets };
  }

  return {
    type: valueKeys.length > 1 ? "grouped_bar" : "bar",
    title: title || "Results",
    labels,
    datasets,
  };
};
