import { titleForKind } from "./critiqueFormat.js";
import { JEV_KEY_URL } from "../jev/messages.js";
import PropTypes from "prop-types";

const GEMINI_KEY_URL = "https://aistudio.google.com/apikey";

function keyHelp(kind) {
  if (kind === "missing_jev_key" || kind === "jev_auth") {
    return { href: JEV_KEY_URL, label: "Get a Jev API key" };
  }
  if (kind === "missing_key" || kind === "auth") {
    return { href: GEMINI_KEY_URL, label: "Get a Gemini API key" };
  }
  return null;
}

const GeminiAlert = ({ kind, message, detail = "", onRetry, retryLabel = "Try again" }) => {
  const help = keyHelp(kind);

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
      {help ? (
        <p>
          <a href={help.href} target="_blank" rel="noopener noreferrer">
            {help.label}
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
