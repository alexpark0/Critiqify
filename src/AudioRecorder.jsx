import { useEffect, useRef, useState } from "react";

const mimeType = "audio/webm";

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

const AudioRecorder = () => {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioUrlRef = useRef(null);

  const [permission, setPermission] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("inactive");
  const [audio, setAudio] = useState(null);
  const [error, setError] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const requestingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stopStream(streamRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const getMicrophonePermission = async () => {
    if (requestingRef.current) return;
    setError("");
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser doesn't support recording. Try Chrome, Edge, or Firefox.",
      );
      return;
    }
    requestingRef.current = true;
    setIsRequesting(true);
    try {
      const streamData = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      if (!mountedRef.current) {
        stopStream(streamData);
        return;
      }
      stopStream(streamRef.current);
      streamRef.current = streamData;
      setPermission(true);
    } catch (err) {
      setPermission(false);
      const denied =
        err?.name === "NotAllowedError" || err?.name === "SecurityError";
      const missing = err?.name === "NotFoundError";
      setError(
        denied
          ? "Microphone access was blocked. Allow access in the browser and try again."
          : missing
            ? "No microphone was found on this device."
            : "Couldn't open the microphone. Check that it isn't already in use.",
      );
    } finally {
      requestingRef.current = false;
      if (mountedRef.current) setIsRequesting(false);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
      setError("Turn the microphone on before recording.");
      return;
    }
    setError("");
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      setAudio(null);
    }
    chunksRef.current = [];
    try {
      const media = new MediaRecorder(streamRef.current, { mimeType });
      recorderRef.current = media;
      media.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) return;
        chunksRef.current.push(event.data);
      };
      media.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;
        chunksRef.current = [];
        stopStream(streamRef.current);
        streamRef.current = null;
        setAudio(audioUrl);
        setPermission(false);
        setRecordingStatus("inactive");
      };
      media.start();
      setRecordingStatus("recording");
    } catch {
      setRecordingStatus("inactive");
      setError("Recording couldn't start in this browser.");
    }
  };

  const stopRecording = () => {
    const media = recorderRef.current;
    if (!media || media.state === "inactive") return;
    media.stop();
  };

  return (
    <div>
      <h2 id="recorder-heading">Audio Recorder</h2>
      <div className="recorder-controls">
        {!permission ? (
          <button
            onClick={getMicrophonePermission}
            type="button"
            disabled={isRequesting}
          >
            {isRequesting ? "Opening microphone…" : "Get Microphone"}
          </button>
        ) : null}
        {permission && recordingStatus === "inactive" ? (
          <button onClick={startRecording} type="button">
            Start Recording
          </button>
        ) : null}
        {recordingStatus === "recording" ? (
          <button onClick={stopRecording} type="button" className="button-stop">
            Stop Recording
          </button>
        ) : null}
      </div>
      {recordingStatus === "recording" ? (
        <p className="recording-status" role="status">
          <span className="recording-dot" aria-hidden="true" />
          Recording
        </p>
      ) : null}
      {error ? (
        <p className="status status-error" role="alert">
          {error}
        </p>
      ) : null}
      {audio ? (
        <div className="audio-container">
          <audio src={audio} controls />
          <a download="critiqify-recording.webm" href={audio}>
            Download Recording
          </a>
        </div>
      ) : (
        <p className="status">Your audio recording will appear here.</p>
      )}
    </div>
  );
};

export default AudioRecorder;
