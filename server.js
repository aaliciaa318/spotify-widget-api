require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "https://spotify-widget.vercel.app/callback";
let accessToken = null;

// Step 1: Redirect user to Spotify login
app.get("/login", (req, res) => {
  const authURL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=user-read-currently-playing`;
  res.redirect(authURL);
});

// Step 2: Handle Spotify callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    accessToken = response.data.access_token;
    res.send("Authentication successful! You can now close this tab.");
  } catch (error) {
    console.error("Error getting access token:", error.response?.data || error);
    res.send("Authentication failed.");
  }
});

// Step 3: Fetch Now Playing Track
app.get("/current-track", async (req, res) => {
  if (!accessToken) return res.json({ error: "User not authenticated" });

  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.status === 200 && response.data) {
      const track = response.data.item;
      return res.json({
        track: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        album_art: track.album.images[0].url,
        progress_ms: response.data.progress_ms,
        duration_ms: track.duration_ms,
      });
    } else {
      return res.json({ error: "No track currently playing" });
    }
  } catch (error) {
    console.error("Error fetching track:", error.response?.data || error);
    res.json({ error: "Unable to fetch track" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
    console.log(`Server running at https://spotify-widget.vercel.app`);
});

// Export the app for deployment
module.exports = app;
