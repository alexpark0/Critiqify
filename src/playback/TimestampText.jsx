import PropTypes from "prop-types";
import { splitTimestamps } from "./time.js";

const TimestampText = ({ text, onSeek }) => {
  const parts = splitTimestamps(text);
  return parts.map((part, index) => {
    if (part.type !== "time" || !onSeek) {
      return <span key={`${part.type}-${index}`}>{part.value}</span>;
    }
    return (
      <button
        key={`time-${index}`}
        type="button"
        className="timestamp-link"
        onClick={() => onSeek(part.seconds)}
      >
        {part.value}
        <span className="sr-only">, seek video to this moment</span>
      </button>
    );
  });
};

TimestampText.propTypes = {
  text: PropTypes.string,
  onSeek: PropTypes.func,
};

export default TimestampText;
