import { useMemo } from "react";
import { BarChart3, LineChart, PieChart as PieIcon, Table2 } from "lucide-react";

const CHART_HEIGHT = 180;
const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

const formatNumber = (value) => {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

function MetricCards({ visualization }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {visualization.metrics.map((metric) => (
        <div key={metric.key} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 truncate">{metric.label}</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{formatNumber(metric.value)}</p>
        </div>
      ))}
    </div>
  );
}

function BarChartView({ visualization }) {
  const max = useMemo(() => {
    let peak = 0;
    for (const dataset of visualization.datasets || []) {
      for (const value of dataset.values || []) {
        if (value > peak) peak = value;
      }
    }
    return peak || 1;
  }, [visualization.datasets]);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1" style={{ height: CHART_HEIGHT }}>
        {(visualization.labels || []).map((label, index) => (
          <div key={`${label}-${index}`} className="flex-1 min-w-[36px] flex flex-col items-center justify-end gap-1 group">
            <div className="w-full flex items-end justify-center gap-0.5" style={{ height: CHART_HEIGHT - 24 }}>
              {(visualization.datasets || []).map((dataset, dsIndex) => {
                const value = dataset.values?.[index] ?? 0;
                const height = Math.max((value / max) * (CHART_HEIGHT - 40), value > 0 ? 4 : 0);
                return (
                  <div
                    key={dataset.key}
                    title={`${dataset.label}: ${formatNumber(value)}`}
                    className="flex-1 max-w-[14px] rounded-t-sm transition-all"
                    style={{ height, backgroundColor: COLORS[dsIndex % COLORS.length] }}
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-slate-500 text-center line-clamp-2 leading-tight max-w-[72px]">
              {label}
            </span>
          </div>
        ))}
      </div>
      {(visualization.datasets || []).length > 1 && (
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
          {visualization.datasets.map((dataset, index) => (
            <span key={dataset.key} className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {dataset.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LineChartView({ visualization }) {
  const { points, max } = useMemo(() => {
    let peak = 0;
    const allPoints = (visualization.datasets || []).map((dataset) => ({
      ...dataset,
      coords: (dataset.values || []).map((value, index) => {
        if (value > peak) peak = value;
        return { index, value };
      }),
    }));
    return { points: allPoints, max: peak || 1 };
  }, [visualization.datasets]);

  const width = 320;
  const height = CHART_HEIGHT;

  return (
    <div className="space-y-2 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[280px]" role="img">
        {points.map((dataset, dsIndex) => {
          const coords = dataset.coords || [];
          if (!coords.length) return null;
          const polyline = coords
            .map((point, index) => {
              const x = (index / Math.max(coords.length - 1, 1)) * (width - 24) + 12;
              const y = height - 20 - (point.value / max) * (height - 40);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polyline
              key={dataset.key}
              fill="none"
              stroke={COLORS[dsIndex % COLORS.length]}
              strokeWidth="2.5"
              points={polyline}
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
        {(visualization.labels || []).map((label, index) => (
          <span key={`${label}-${index}`} className="truncate max-w-[80px]">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PieChartView({ visualization }) {
  const total = (visualization.slices || []).reduce((sum, slice) => sum + (slice.value || 0), 0) || 1;
  let cursor = 0;
  const radius = 54;
  const cx = 64;
  const cy = 64;

  const slices = (visualization.slices || []).map((slice, index) => {
    const value = slice.value || 0;
    const start = cursor;
    const angle = (value / total) * Math.PI * 2;
    cursor += angle;
    const end = cursor;
    const x1 = cx + radius * Math.cos(start - Math.PI / 2);
    const y1 = cy + radius * Math.sin(start - Math.PI / 2);
    const x2 = cx + radius * Math.cos(end - Math.PI / 2);
    const y2 = cy + radius * Math.sin(end - Math.PI / 2);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...slice, path, color: COLORS[index % COLORS.length] };
  });

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <svg width="128" height="128" viewBox="0 0 128 128" className="shrink-0">
        {slices.map((slice) => (
          <path key={slice.label} d={slice.path} fill={slice.color} />
        ))}
      </svg>
      <ul className="space-y-1 text-xs text-slate-600 flex-1 min-w-0">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
            <span className="truncate">{slice.label}</span>
            <span className="ml-auto font-medium text-slate-800">{formatNumber(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultsTable({ visualization }) {
  const columns = visualization.columns || [];
  const rows = visualization.rows || [];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-100">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                  {row[col] == null ? "—" : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AssistantDataChart({ visualization }) {
  if (!visualization || visualization.type === "none" || visualization.type === "empty") {
    if (visualization?.message) {
      return <p className="text-xs text-slate-500">{visualization.message}</p>;
    }
    return null;
  }

  if (visualization.type === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {visualization.message}
      </div>
    );
  }

  const icon =
    visualization.type === "pie" ? (
      <PieIcon className="w-4 h-4 text-slate-500" />
    ) : visualization.type === "line" ? (
      <LineChart className="w-4 h-4 text-slate-500" />
    ) : visualization.type === "table" ? (
      <Table2 className="w-4 h-4 text-slate-500" />
    ) : (
      <BarChart3 className="w-4 h-4 text-slate-500" />
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-medium text-slate-800">{visualization.title || "Visualization"}</p>
      </div>

      {visualization.type === "metric" && <MetricCards visualization={visualization} />}
      {(visualization.type === "bar" || visualization.type === "grouped_bar") && (
        <BarChartView visualization={visualization} />
      )}
      {visualization.type === "line" && <LineChartView visualization={visualization} />}
      {visualization.type === "pie" && <PieChartView visualization={visualization} />}
      {visualization.type === "table" && <ResultsTable visualization={visualization} />}
    </div>
  );
}
