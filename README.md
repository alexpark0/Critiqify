# Critiqify

Practice interview answers on video and get a graded critique of how you delivered them.

Record a response in the browser, then Critiqify sends that video (picture and microphone audio) to Google Gemini. Gemini grades cadence, eye contact, filler words, and intonation, and you can keep asking follow-up questions about that same recording.

## Gemini API key

Critiqify reads the key from `VITE_API_KEY` via `import.meta.env.VITE_API_KEY`. Vite only exposes variables that start with `VITE_`.

1. Create a key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env` in the project root.
3. Set `VITE_API_KEY` to that key.
4. Restart the dev server so Vite picks up the new value.

Do not commit `.env` or a real key. `.env` is gitignored; `.env.example` only shows the variable name.

The app calls `gemini-3.5-flash-lite`. That model accepts video with audio and can return JSON that matches a response schema. `gemini-3.8-flash` is still listed, but free-tier `generateContent` calls to it come back HTTP 503, "This model is currently experiencing high demand," so critiques never start. Clips up to 10 MiB are sent inline, which keeps the base64 request under Gemini's 20MB limit. Larger recordings are uploaded with the Gemini Files API. Video uploads stay in a processing state after the bytes are stored, so Critiqify polls `files.get` until the file is `ACTIVE` before grading or starting the follow-up chat. That wait can take a few minutes and is shown as "Processing your video…". The page reports an error only if processing fails or that wait runs longer than five minutes.

`gemini-3.5-flash-lite` thinks by default, and those thinking tokens count toward the output limit. Critique requests set thinking to low and allow a larger output so the JSON is less likely to be cut off. Video parts ask for static processing, which keeps the frames and audio in one pass. That is the documented mode for a short clip. Leaving it unset means "whatever the model defaults to," and agentic navigation spends the same output budget on thought tokens.

If a response is empty, truncated, or not valid JSON, Critiqify retries a few times on its own before showing Try again. While that happens the status line says "Gemini's first answer couldn't be read. Trying again…". An HTTP error uses a different line, "Gemini returned an error. Trying again…", and the alert then quotes the API. A rejected model id, a rate limit, and a rejected request are named as such instead of a generic "couldn't finish." Open Error details on the page and the browser console if you need the raw payload. Every critique log line is prefixed with `[critiqify]` and includes the delivery mode (`inline` or `files`), the finish reason, and token counts.

Calls go to the Gemini Developer API `v1beta` endpoint, `POST /v1beta/models/gemini-3.5-flash-lite:generateContent`. If the alert says the model was rejected, compare that id with the model list in Google AI Studio. A 503 that says the model is experiencing high demand is the model being overloaded, not a wrong URL. If it says the request was rate-limited, check the project's quota at [rate limits](https://aistudio.google.com/docs/rate-limits). A free-tier key can be out of daily quota even when the model name is still valid. Invalid keys still say the key was rejected.

`VITE_MOCK_GEMINI=true` shows a sample critique and chat without calling Gemini, which is useful if you do not have a key yet. Leave it unset once `VITE_API_KEY` is a real key. If both are set, mock mode is used.

## Scripts

```bash
npm install
npm run dev
npm run build
npm test
```
