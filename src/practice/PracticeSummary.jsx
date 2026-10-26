import PropTypes from "prop-types";
import { TREND_PREVIEW, sparklineGeometry } from "./practiceStats.js";

function formatAverage(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function TrendChart({ summary }) {
  const preview = summary.state === "empty";
  const values = preview ? TREND_PREVIEW : summary.series.map((point) => point.average);
  const geometry = sparklineGeometry(values, 220, 52, 6);
  return (
    <div className="practice-trend">
      <svg
        className={preview ? "trend-chart is-preview" : "trend-chart"}
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        role="img"
        aria-label={summary.chartLabel}
      >
        <title>{summary.chartLabel}</title>
        {preview ? (
          <path className="trend-preview" d={geometry.line} />
        ) : (
          <>
            {summary.state === "trend" ? <path className="trend-area" d={geometry.area} /> : null}
            {summary.state === "trend" ? <path className="trend-line" d={geometry.line} /> : null}
            {geometry.points.map((point) => (
              <circle
                key={`${point.x}-${point.value}`}
                className={point.value >= 7 ? "trend-dot is-strong" : "trend-dot is-flag"}
                cx={point.x}
                cy={point.y}
                r={summary.state === "single" ? 5 : 3.5}
              />
            ))}
          </>
        )}
      </svg>
      <p className="trend-caption">{summary.caption}</p>
    </div>
  );
}

TrendChart.propTypes = {
  summary: PropTypes.shape({
    state: PropTypes.string.isRequired,
    series: PropTypes.arrayOf(
      PropTypes.shape({
        average: PropTypes.number.isRequired,
      }),
    ).isRequired,
    chartLabel: PropTypes.string.isRequired,
    caption: PropTypes.string.isRequired,
  }).isRequired,
};

const PracticeSummary = ({ summary }) => {
  return (
    <section className="practice-strip" aria-label="Practice summary">
      <div className="practice-stat">
        <p className="practice-stat-value">{summary.totalTakes}</p>
        <p className="practice-stat-label">Takes</p>
      </div>
      <div className="practice-stat">
        <p className="practice-stat-value">{summary.streak}</p>
        <p className="practice-stat-label">Day streak</p>
      </div>
      <div className="practice-stat">
        <p className="practice-stat-value">{formatAverage(summary.recentAverage)}</p>
        <p className="practice-stat-label">Recent average</p>
      </div>
      <TrendChart summary={summary} />
    </section>
  );
};

export default PracticeSummary;

PracticeSummary.propTypes = {
  summary: PropTypes.shape({
    totalTakes: PropTypes.number.isRequired,
    streak: PropTypes.number.isRequired,
    recentAverage: PropTypes.number,
    state: PropTypes.string.isRequired,
    series: PropTypes.array.isRequired,
    chartLabel: PropTypes.string.isRequired,
    caption: PropTypes.string.isRequired,
  }).isRequired,
};
