const NUMERIC_TYPES = new Set(["number"]);
const DATE_KEY_PATTERN = /(date|time|month|week|day|year|period|at)$/i;

const isNumericValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number" && Number.isFinite(value)) return true;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return true;
  }
  return false;
};

const toNumber = (value) => {
  if (typeof value === "number") return value;
  return Number(value);
};

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
  if (!rows?.length) {
    return { labelKey: null, valueKeys: [], columns: [] };
  }

  const keys = Object.keys(rows[0] || {});
  const classified = keys.map((key) => ({
    key,
    kind: classifyColumn(key, rows),
  }));

  const labelKey =
    classified.find((col) => col.kind === "date")?.key ||
    classified.find((col) => col.kind === "label")?.key ||
    keys[0];

  const valueKeys = classified
    .filter((col) => col.kind === "number" && col.key !== labelKey)
    .map((col) => col.key);

  return { labelKey, valueKeys, columns: keys };
};

const buildMetricVisualization = (rows, title) => {
  const row = rows[0] || {};
  const metrics = Object.entries(row)
    .filter(([, value]) => isNumericValue(value))
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, " "),
      value: toNumber(value),
    }));

  if (metrics.length === 0) {
    return {
      type: "table",
      title: title || "Query results",
      columns: Object.keys(row),
      rows: rows.slice(0, 50),
    };
  }

  return {
    type: "metric",
    title: title || "Key metrics",
    metrics,
  };
};

const buildBarVisualization = (rows, labelKey, valueKeys, title) => {
  const primaryValueKey = valueKeys[0];
  const labels = rows.map((row, index) => {
    const raw = row[labelKey];
    return raw === null || raw === undefined ? `Item ${index + 1}` : String(raw);
  });

  return {
    type: valueKeys.length > 1 ? "grouped_bar" : "bar",
    title: title || "Results",
    labelKey,
    valueKeys,
    labels,
    datasets: valueKeys.map((key) => ({
      key,
      label: key.replace(/_/g, " "),
      values: rows.map((row) => toNumber(row[key] ?? 0)),
    })),
    primaryValueKey,
  };
};

const buildPieVisualization = (rows, labelKey, valueKey, title) => {
  return {
    type: "pie",
    title: title || "Distribution",
    labelKey,
    valueKey,
    slices: rows.map((row, index) => ({
      label:
        row[labelKey] === null || row[labelKey] === undefined
          ? `Item ${index + 1}`
          : String(row[labelKey]),
      value: toNumber(row[valueKey] ?? 0),
    })),
  };
};

const buildLineVisualization = (rows, labelKey, valueKeys, title) => {
  const labels = rows.map((row, index) => {
    const raw = row[labelKey];
    return raw === null || raw === undefined ? `Point ${index + 1}` : String(raw);
  });

  return {
    type: "line",
    title: title || "Trend",
    labelKey,
    labels,
    datasets: valueKeys.map((key) => ({
      key,
      label: key.replace(/_/g, " "),
      values: rows.map((row) => toNumber(row[key] ?? 0)),
    })),
  };
};

export const buildVisualization = (rows, { title, query } = {}) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      type: "empty",
      title: title || "No data",
      message: "The query returned no rows to visualize.",
      query: query || null,
    };
  }

  if (rows.length === 1 && Object.keys(rows[0]).length <= 6) {
    return buildMetricVisualization(rows, title);
  }

  const { labelKey, valueKeys, columns } = pickColumns(rows);

  if (!valueKeys.length) {
    return {
      type: "table",
      title: title || "Query results",
      columns,
      rows: rows.slice(0, 50),
      query: query || null,
    };
  }

  const labelKind = classifyColumn(labelKey, rows);

  if (rows.length <= 8 && valueKeys.length === 1) {
    return buildPieVisualization(rows, labelKey, valueKeys[0], title);
  }

  if (labelKind === "date" || rows.length >= 4) {
    return buildLineVisualization(rows, labelKey, valueKeys, title);
  }

  return buildBarVisualization(rows, labelKey, valueKeys, title);
};
