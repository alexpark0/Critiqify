import { useState, useRef } from "react";
import { createClient } from '@supabase/supabase-js';
import { Form } from 'react-bootstrap';

const VideoRecorder = () => {
  const [permission, setPermission] = useState(false);
  const mediaRecorder = useRef(null);
  const liveVideoFeed = useRef(null);
  const [recordingStatus, setRecordingStatus] = useState("inactive");
  const [stream, setStream] = useState(null);
  const [videoChunks, setVideoChunks] = useState([]);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [date, setDate] = useState(null);
  const [value, setValue] = useState(),
    onInput = ({target:{value}}) => setValue(value);

  const supabaseUrl = "https://hngxaylgylmtakwbxzss.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZ3hheWxneWxtdGFrd2J4enNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NDQ4ODksImV4cCI6MjA1MjEyMDg4OX0.PfvbMIX6IByuf6kTWQgykjwHta6IdDmBioy-xJhTTJQ";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const getCameraPermission = async () => {
    setRecordedVideo(null);
    setVideoFile(null);
    setDate(null);
    if ("MediaRecorder" in window) {
      try {
        const videoConstraints = {
          audio: false,
          video: true,
        };
        const audioConstraints = { audio: true };
        // create audio and video streams separately
        const audioStream =
          await navigator.mediaDevices.getUserMedia(audioConstraints);
        const videoStream =
          await navigator.mediaDevices.getUserMedia(videoConstraints);
        setPermission(true);
        //combine both audio and video streams
        const combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);
        setStream(combinedStream);
        //set videostream to live feed player
        liveVideoFeed.current.srcObject = videoStream;
      } catch (err) {
        alert(err.message);
      }
    } else {
      alert("The MediaRecorder API is not supported in your browser.");
    }
  };

  const startRecording = async () => {
    setRecordingStatus("recording");
    const media = new MediaRecorder(stream, { mimeType });
    mediaRecorder.current = media;
    mediaRecorder.current.start();
    let localVideoChunks = [];
    mediaRecorder.current.ondataavailable = (event) => {
      if (typeof event.data === "undefined") return;
      if (event.data.size === 0) return;
      localVideoChunks.push(event.data);
    };
    setVideoChunks(localVideoChunks);
  };

  const stopRecording = () => {
    setPermission(false);
    setRecordingStatus("inactive");
    mediaRecorder.current.stop();
    mediaRecorder.current.onstop = () => {
      const videoBlob = new Blob(videoChunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(videoBlob);
      const file = new File([videoBlob], getDate() + '.webm', { type: 'video/webm' });
      setRecordedVideo(videoUrl);
      setVideoFile(file);
      setVideoChunks([]);
      setDate(getDate());
    };
  };

  function getDate() {
    const now = new Date();
    const month = now.getMonth() + 1; 
    const date = now.getDate();
    const year = now.getFullYear();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return `${month}-${date}-${year}-${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}`;
  }

  // async function uploadVideo(file, notes) {
  //   if (!file) {
  //     alert("No file available for upload.");
  //     return;
  //   }
  
  //   console.log("Uploading:", file.name);
  
  //   const { data, error } = await supabase.storage
  //     .from("videos")
  //     .upload(`videos/${file.name}`, file, {
  //       cacheControl: "3600",
  //       upsert: false, // Set to true if you want to replace existing files
  //     });
  
  //   if (error) {
  //     console.error("Upload Error:", error.message);
  //     alert("Error uploading link to Supabase: " + error.message);
  //     return;
  //   }
  
  //   const vidURL = `${supabaseUrl}/storage/v1/object/public/videos/videos/${file.name}`;
  //   console.log("Video uploaded successfully:", vidURL);
  
  //   // Store video metadata in Supabase database
  //   storeData(vidURL, notes);
  // }
  

  async function uploadVideo(file, notes) {
    console.log(file, notes)
    const { data, error } = await supabase.storage
      .from('videos').upload(date + '.webm', file);
    if (error) {
      console.log(error);
      alert("Error uploading link to Supabase");
    }
    const vidURL = `${supabaseUrl}/storage/v1/object/public/videos/` + date + '.webm';
    storeData(vidURL, notes);
  }

  async function storeData(url, notes) {
    const { data, error } = await supabase.from('videos').insert({
      date: date, link: url, notes: notes
    });
  
    if (error) {
      console.error('Error storing video metadata:', error.message);
    }
  };

  // async function storeData(url, notes) {
  //   const { data, error } = await supabase
  //     .from("videos") // Ensure this matches your actual table name
  //     .insert([{ date: date, link: url, notes: notes }]);
  
  //   if (error) {
  //     console.error("Error storing video metadata:", error.message);
  //     alert("Error saving metadata: " + error.message);
  //     return;
  //   }
  
  //   console.log("Video metadata stored successfully:", data);
  // }
  

  return (
    <div>
      <h2>Video Recorder</h2>
      <main>
        <div className="video-controls">
          {!permission ? (
            <button onClick={getCameraPermission} type="button">
              Get Camera
            </button>
          ) : null}
          {permission && recordingStatus === "inactive" ? (
            <button onClick={startRecording} type="button">
              Start Recording
            </button>
          ) : null}
          {recordingStatus === "recording" ? (
            <button onClick={stopRecording} type="button">
              Stop Recording
            </button>
          ) : null}
        </div>
      </main>

      <div className="video-player">
        {!recordedVideo ? (
          <video ref={liveVideoFeed} autoPlay className="live-player"></video>
        ) : null}
        {recordedVideo ? (
          <div className="recorded-player">
            <video className="recorded" src={recordedVideo} controls></video>
            <h2>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Notes:</Form.Label>
                  <br></br>
                  <Form.Control type ="text" placeholder="Enter notes here" 
                  as="textarea" rows={3} cols={100} onChange={onInput}/>
                </Form.Group>
              </Form>
            </h2>
            <button className="button-save" onClick={()=>uploadVideo(videoFile, value)}>
              Save
            </button>
          </div>
        ) : null}
      </div>
    </div>  
  );
};

export default VideoRecorder;
const mimeType = "video/webm";