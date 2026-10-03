import { titleForKind } from "./critiqueFormat.js";
import PropTypes from "prop-types";

const KEY_URL = "https://aistudio.google.com/apikey";

const GeminiAlert = ({ kind, message, onRetry, retryLabel = "Try again" }) => {
  const needsKey = kind === "missing_key" || kind === "auth";

  return (
    <div className="status status-error gemini-alert" role="alert">
      <p className="error-title">{titleForKind(kind)}</p>
      <p>{message}</p>
      {needsKey ? (
        <p>
          <a href={KEY_URL} target="_blank" rel="noopener noreferrer">
            Get a Gemini API key
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
  onRetry: PropTypes.func,
  retryLabel: PropTypes.string,
};
