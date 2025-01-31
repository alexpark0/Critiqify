import './Videos.css';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://hngxaylgylmtakwbxzss.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZ3hheWxneWxtdGFrd2J4enNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NDQ4ODksImV4cCI6MjA1MjEyMDg4OX0.PfvbMIX6IByuf6kTWQgykjwHta6IdDmBioy-xJhTTJQ";
const supabase = createClient(supabaseUrl, supabaseKey);

const Logs = () =>  {
  const [ videos, setVideos ] = useState([]); // [video1, video2, video3]

  async function getVideos() {
    const { data, error } = await supabase
    .from('videos').select("*")

    if (data !== null) {
      setVideos(data);
    }
    else {
      console.log(error);
      alert("Error grabbing links from Supabase");
    }
  } 

  useEffect(() => {
    getVideos();
  }, [])

  console.log(videos);

  return (
    <div className="logs-container">
      {videos.map((video, index) => (
        <div key = {index} className="log-card">
          <h2> Date: {video.date} </h2>
          <video className="log-video" controls>
            <source src={video.link} type="video/webm" />
          </video>
          <div className="log-notes">Notes: {video.notes}</div>
        </div>
      ))}
    </div>
  );
}

export default Logs;