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

The app calls `gemini-3.8-flash`, a current Gemini model that accepts video with audio and can return JSON that matches a response schema. Clips up to 10 MiB are sent inline, which keeps the base64 request under Gemini's 20MB limit. Larger recordings are uploaded with the Gemini Files API. Video uploads stay in a processing state after the bytes are stored, so Critiqify polls `files.get` until the file is `ACTIVE` before grading or starting the follow-up chat. That wait can take a few minutes and is shown as "Processing your video…". The page reports an error only if processing fails or that wait runs longer than five minutes.

`VITE_MOCK_GEMINI=true` shows a sample critique and chat without calling Gemini, which is useful if you do not have a key yet. Leave it unset once `VITE_API_KEY` is a real key. If both are set, mock mode is used.

## Scripts

```bash
npm install
npm run dev
npm run build
npm test
```
