# Critiqify

Practice interview answers on video and get a graded critique of how you delivered them.

Record a response in the browser. While you talk, Chrome or Edge builds a timestamped transcript with the Web Speech API. Critiqify sends that transcript to Jev, TypeSafe's System One model, which scores cadence and filler words. Eye contact and intonation stay blank, because Jev reads text and does not see the video or hear the voice. You can keep asking follow-up questions about that take.

## Jev API key

Grading calls `POST /api/jev` in this app. That route is a small proxy: the Vite dev server in local development, and a Netlify function in production. The proxy calls `POST https://api.typesafe.ai/v1/systemone` with `model` set to `jev-latest`.

The TypeSafe API rejects browser origins. A preflight from `http://localhost:5173`, `https://critiqify.netlify.app`, and `https://typesafe.ai` returns `400` with `Disallowed CORS origin` and no `Access-Control-Allow-Origin` header, so the page cannot call Jev directly. The proxy also keeps the API key off the client. Nothing in the React code reads the key, so Vite does not bundle it.

1. Create a key at [the TypeSafe console](https://console.typesafe.ai/keys).
2. Copy `.env.example` to `.env` in the project root.
3. Set `VITE_JEV_API_KEY` to that key. On Netlify you can set `VITE_JEV_API_KEY` or `JEV_API_KEY`.
4. Restart `npm run dev` so the dev proxy reloads the file.

Do not commit `.env` or a real key. `.env` is gitignored. `.env.example` only shows the variable name.

If the key is missing, grading stops with "Jev API key needed" and a link to the TypeSafe console. The proxy does not call Jev in that case.

Jev score questions return a continuous score, a confidence, and a probability for each rubric level. They do not return an explanation. Critiqify maps each five-level score onto the existing 1–10 grade, and it adds timestamps from the transcript (filler words it can see, and long gaps or crowded phrases between captions). Those stamps are not written by Jev.

## Transcript

There is no separate transcription step in the app today. Gemini used to watch the video itself. Jev cannot do that, and this change does not add a second speech-to-text account.

Captions are collected in the browser while you record:

- Chrome and Edge expose `webkitSpeechRecognition`. Each final phrase is stamped with the time since recording started.
- The recognizer restarts itself if the browser ends a session during a pause, and the clock keeps running.
- Firefox and browsers without the API still record video, then show that Jev needs a transcript and skip the grade.
- If no words were captured, the same message is shown. Retrying the grade does not help until you record again.

Chrome's speech recognizer sends audio to Google's speech service. That is a privacy trade-off of using the built-in API instead of uploading the video to another model.

## What Jev does not grade

Eye contact needs the picture. Intonation needs pitch. Both cards stay on the critique as "Not graded," with no score and no timeline markers. Saved practice averages use only cadence and filler words, so a blank category is not stored as 0.

A later change could send the video to a model that sees and hears, and keep Jev for the transcript scores. This pull request does not do that.

## Coach chat

The coach tab stays available after a grade.

- With `VITE_API_KEY` set, follow-ups go to Gemini as text. The prompt includes the transcript and the Jev grades, and it tells the model not to invent eye contact or intonation.
- Without that key, the coach answers from the grades already on the page, including a direct "not graded" reply for eye contact and intonation.
- Sample practice questions still use Gemini, or the built-in samples when mock mode is on.

## Demo and mock mode

Open `/record?demo=1` to load the sample recording and a preview critique. Demo mode does not call Jev or Gemini.

`VITE_MOCK_GEMINI=true` does the same for any recording, which is useful before the keys exist. Leave it unset once you want live grades. If mock mode is set, it wins over the keys.

## Scripts

```bash
npm install
npm run dev
npm run build
npm test
```

Netlify runs `npm run build`, publishes `dist`, and routes `/api/jev` to `netlify/functions/jev.js`.
