# Le Livre d'Hénoch : série vidéo verticale

Pipeline that turns AI-generated clips (Higgsfield), French narration (ElevenLabs)
and music into finished 9:16 episodes for TikTok / Reels / Shorts.

```
episodes/episode_01.yaml   shots, French narration texts, asset URLs, timing settings
assets/clips/              Higgsfield Kling 3.0 clips (5 s, 9:16, silent)
assets/stills/             start frames + Shemihaza character reference
assets/audio/narration/    shot_XX.mp3 (ElevenLabs) + shot_XX.words.json (word timings)
assets/audio/music.mp3     instrumental bed (Higgsfield, ElevenLabs Music v2.5)
src/download_assets.py     fetch the URLs in the YAML into assets/
src/tts.py                 narration: existing files > ElevenLabs API > edge-tts
src/build_episode.py       timing, slow-mo/Ken Burns fills, dissolves, grade, mix, subs, end card
output/                    episode_01.mp4, episode_01.srt, caption.txt
```

## Run

```bash
pip install -r requirements.txt          # ffmpeg with libass is also required
python src/download_assets.py episodes/episode_01.yaml
python src/tts.py             episodes/episode_01.yaml   # ELEVENLABS_API_KEY optional
python src/build_episode.py   episodes/episode_01.yaml
```

## Next episode

Copy `episodes/episode_01.yaml` to `episode_02.yaml`, replace the shot URLs,
texts and the end card, then run the three commands. Nothing in `src/` changes.

Voice: ElevenLabs **Justin Doré – Documentary Narrator** (`3BZLNrQEzQVYs6kPOW4S`),
deep, calm French documentary voice, model `eleven_multilingual_v2`.
Keep it for every episode so the series sounds consistent.

Subtitles use word timestamps from `shot_XX.words.json` (ElevenLabs Scribe or
whisper output); without them they're estimated from pauses in the audio.
