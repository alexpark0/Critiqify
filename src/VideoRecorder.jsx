import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { createClient } from "@supabase/supabase-js";
import { Link } from "react-router-dom";

const supabaseUrl = "https://hngxaylgylmtakwbxzss.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZ3hheWxneWxtdGFrd2J4enNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NDQ4ODksImV4cCI6MjA1MjEyMDg4OX0.PfvbMIX6IByuf6kTWQgykjwHta6IdDmBioy-xJhTTJQ";
const supabase = createClient(supabaseUrl, supabaseKey);
const mimeType = "video/webm";

function formatStamp(now = new Date()) {
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${month}-${date}-${year}-${hours}.${minutes}.${seconds}`;
}

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

const VideoRecorder = ({ onRecordingReady }) => {
  const liveVideoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordedUrlRef = useRef(null);

  const [permission, setPermission] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("inactive");
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [date, setDate] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const requestingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    const video = liveVideoRef.current;
    if (!video || !streamRef.current || recordedVideo) return;
    video.srcObject = streamRef.current;
    const playAttempt = video.play();
    if (playAttempt) playAttempt.catch(() => {});
  }, [permission, recordedVideo, recordingStatus]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stopStream(streamRef.current);
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    };
  }, []);

  const releasePreview = () => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
  };

  const getCameraPermission = async () => {
    if (requestingRef.current) return;
    setError("");
    setSaveState("idle");
    setSaveError("");
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser doesn't support recording. Try Chrome, Edge, or Firefox.",
      );
      return;
    }

    requestingRef.current = true;
    setIsRequesting(true);
    setRecordingStatus("inactive");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      if (!mountedRef.current) {
        stopStream(stream);
        return;
      }
      releasePreview();
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
        recordedUrlRef.current = null;
      }
      setRecordedVideo(null);
      setVideoFile(null);
      setDate(null);
      onRecordingReady?.(null);
      streamRef.current = stream;
      setPermission(true);
    } catch (err) {
      setPermission(false);
      const denied =
        err?.name === "NotAllowedError" || err?.name === "SecurityError";
      const missing = err?.name === "NotFoundError";
      setError(
        denied
          ? "Camera and microphone access was blocked. Allow access in the browser and try again."
          : missing
            ? "No camera or microphone was found on this device."
            : "Couldn't open the camera. Check that it isn't already in use.",
      );
    } finally {
      requestingRef.current = false;
      if (mountedRef.current) setIsRequesting(false);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
      setError("Turn the camera on before recording.");
      return;
    }
    setError("");
    chunksRef.current = [];
    try {
      const media = new MediaRecorder(streamRef.current, { mimeType });
      recorderRef.current = media;
      media.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) return;
        chunksRef.current.push(event.data);
      };
      media.onstop = () => {
        const stamp = formatStamp();
        const videoBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        releasePreview();
        setPermission(false);
        setRecordingStatus("inactive");
        if (videoBlob.size === 0) {
          setError("The recording was empty. Try again.");
          onRecordingReady?.(null);
          return;
        }
        const videoUrl = URL.createObjectURL(videoBlob);
        const file = new File([videoBlob], `${stamp}.webm`, {
          type: "video/webm",
        });
        if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
        recordedUrlRef.current = videoUrl;
        setRecordedVideo(videoUrl);
        setVideoFile(file);
        setDate(stamp);
        onRecordingReady?.(file);
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

  async function storeData(url, noteText, stamp) {
    const { error: insertError } = await supabase.from("videos").insert({
      date: stamp,
      link: url,
      notes: noteText,
    });
    return !insertError;
  }

  async function uploadVideo(file, noteText) {
    if (!file || !date) {
      setSaveState("error");
      setSaveError("Record a video before saving.");
      return;
    }
    setSaveState("saving");
    setSaveError("");
    try {
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(`${date}.webm`, file);
      if (uploadError) {
        setSaveState("error");
        setSaveError(
          "Couldn't upload this recording. The storage service may be unavailable.",
        );
        return;
      }
      const vidURL = `${supabaseUrl}/storage/v1/object/public/videos/${date}.webm`;
      const stored = await storeData(vidURL, noteText ?? "", date);
      if (!stored) {
        setSaveState("error");
        setSaveError(
          "The video uploaded, but saving the notes failed. Try again.",
        );
        return;
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setSaveError(
        "Couldn't reach the storage service. Check your connection and try again.",
      );
    }
  }

  return (
    <div>
      <h2 id="recorder-heading">Video Recorder</h2>
      <div className="recorder-controls">
        {!permission && recordingStatus !== "recording" ? (
          <button
            onClick={getCameraPermission}
            type="button"
            disabled={isRequesting}
          >
            {isRequesting ? "Opening camera…" : "Get Camera"}
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

      <div className="preview-frame">
        {!recordedVideo ? (
          <video
            ref={liveVideoRef}
            autoPlay
            muted
            playsInline
            className="live-player"
          />
        ) : (
          <video className="recorded" src={recordedVideo} controls />
        )}
        {!permission && !recordedVideo ? (
          <p className="preview-hint">Camera preview will show here.</p>
        ) : null}
      </div>

      {recordedVideo ? (
        <div className="recorded-player">
          <div className="field">
            <label htmlFor="video-notes">Notes</label>
            <textarea
              id="video-notes"
              rows={3}
              placeholder="Enter notes here"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="recorder-controls">
            <button
              className="button-save"
              type="button"
              onClick={() => uploadVideo(videoFile, notes)}
              disabled={saveState === "saving"}
            >
              {saveState === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
          {saveState === "saving" ? (
            <p className="status" role="status">
              Uploading your recording…
            </p>
          ) : null}
          {saveState === "saved" ? (
            <p className="status status-ok" role="status">
              Saved. Find it on the <Link to="/logs">Logs</Link> page.
            </p>
          ) : null}
          {saveState === "error" ? (
            <p className="status status-error" role="alert">
              {saveError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default VideoRecorder;

VideoRecorder.propTypes = {
  onRecordingReady: PropTypes.func,
};
