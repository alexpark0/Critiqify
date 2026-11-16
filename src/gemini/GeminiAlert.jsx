import { titleForKind } from "./critiqueFormat.js";
import PropTypes from "prop-types";

const KEY_URL = "https://aistudio.google.com/apikey";
const RATE_LIMIT_URL = "https://aistudio.google.com/docs/rate-limits";

const GeminiAlert = ({ kind, message, detail = "", onRetry, retryLabel = "Try again" }) => {
  const needsKey = kind === "missing_key" || kind === "auth";
  const needsQuota = kind === "quota";

  return (
    <div className="status status-error gemini-alert" role="alert">
      <p className="error-title">{titleForKind(kind)}</p>
      <p>{message}</p>
      {detail ? (
        <details className="error-details">
          <summary>Error details</summary>
          <pre>{detail}</pre>
        </details>
      ) : null}
      {needsKey ? (
        <p>
          <a href={KEY_URL} target="_blank" rel="noopener noreferrer">
            Get a Gemini API key
          </a>
        </p>
      ) : null}
      {needsQuota ? (
        <p>
          <a href={RATE_LIMIT_URL} target="_blank" rel="noopener noreferrer">
            Check Gemini rate limits
          </a>
        </p>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
};

export default GeminiAlert;

GeminiAlert.propTypes = {
  kind: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  detail: PropTypes.string,
  onRetry: PropTypes.func,
  retryLabel: PropTypes.string,
};
