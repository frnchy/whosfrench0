"""Master timeline for "499 — What If the Sun Vanished".

Everything that is timed lives here. Times are seconds on the final 60 s
timeline (30 fps, frame = round(t * 30)). Tweak a number, run
`python3 build/build.py all` and the whole video re-renders.

VO-first workflow: each VO line is its own wav in audio/vo/. `prep_vo`
trims the leading silence so the file starts on the first syllable, which
means `at` below *is* the moment the first syllable is heard. Captions and
counter keys reference VO lines by id (plus an offset into the line, measured
from the processed wav), so moving a line moves everything tied to it.
"""

FPS = 30
DURATION = 60.0
W, H = 1080, 1920

# ---------------------------------------------------------------- clips ----
# (source file, source in, source out, speed). Laid end to end; the frame
# counts are chosen so the total is exactly 1800 frames.
#   clip3 is trimmed by 1.5 s so its "Earth fully dark -> flies off" moment
#   (source t=11.5) lands on 40.0 s = the spoken "Zero", then the fly-off is
#   played at 0.6x so it is still on screen while the VO says "flies off".
#   clip4 loses its first 0.875 s so it still ends on the bright new star.
CLIPS = [
    dict(src="clips/clip1.mp4", t_in=0.0, frames=450, speed=1.0),
    dict(src="clips/clip2.mp4", t_in=0.0, frames=450, speed=1.0),
    dict(src="clips/clip3.mp4", t_in=1.5, frames=300, speed=1.0, grade=True),
    dict(src="clips/clip3.mp4", t_in=11.5, frames=175, speed=0.6, grade=True),
    dict(src="clips/clip4.mp4", t_in=0.875, frames=425, speed=1.0),
]
WHIP_AT = 30.0          # 4-frame horizontal whip blur centred on this cut

# ------------------------------------------------------------------- VO ----
# id -> (file, at). `at` = timeline time of the first syllable.
VO = {
    "gone":     ("audio/vo/l00_gone.wav",        0.00),
    "lookup":   ("audio/vo/l01_lookup.wav",      6.35),
    "light":    ("audio/vo/l02_light.wav",       8.90),
    "fight":    ("audio/vo/l03_fight.wav",      13.55),
    "no":       ("audio/vo/l04_no.wav",         17.40),
    "merger":   ("audio/vo/l05_merger.wav",     21.75),
    "orbit":    ("audio/vo/l06_empty_orbit.wav", 27.80),
    # the countdown wav is split per word by prep_vo; each word is placed
    # on its own beat so the counter can snap exactly on it
    "ten":      ("audio/vo/l07_countdown.wav#0", 34.50),
    "five":     ("audio/vo/l07_countdown.wav#1", 35.60),
    "three":    ("audio/vo/l07_countdown.wav#2", 36.70),
    "two":      ("audio/vo/l07_countdown.wav#3", 37.80),
    "one":      ("audio/vo/l07_countdown.wav#4", 38.90),
    "zero":     ("audio/vo/l08_zero.wav",       40.00),
    "after":    ("audio/vo/l09_zero_after.wav", 41.00),
    "week":     ("audio/vo/l10_week.wav",       46.30),
    "argue":    ("audio/vo/l11_argue.wav",      54.30),
}

# --------------------------------------------------------------- captions --
# (text, start, end). start/end can be a number, ("vo_id", seconds after the
# first syllable), ("vo_id", "end") = end of that line's speech, or
# ("vo_id", "wN") = onset of measured speech chunk N in that line (see the
# `words` list printed by `build.py prep`). "eight" is 1.22 s into the light line,
# after/w1 = "Earth flies off". A caption with no
# explicit end runs until the next caption starts.
CAPTIONS = [
    ("☀ GONE",          ("gone", 0.0),        ("gone", "end")),
    ("STILL SHINING",   ("lookup", 0.0),      None),
    ("8 MIN 20 SEC",    ("light", 1.22),    ("light", "end")),
    ("INSTANT?",        ("fight", 0.0),       ("fight", "end")),
    ("SPEED OF LIGHT",  ("no", 0.0),          None),
    ("GW170817",        ("merger", 0.0),      ("merger", "end")),
    ("EMPTY ORBIT",     ("orbit", 0.0),       ("orbit", "end")),
    # 35-40 s: no caption, the counter is the caption
    ("0",               ("zero", 0.0),        ("after", "w1")),
    ("STRAIGHT LINE",   ("after", "w1"), ("after", "end")),
    ("DAY 7 · BELOW 0°C", ("week", 0.0),      ("week", "end")),
    ("👇 COMMENT",      ("argue", 0.0),       59.70),
]
CAPTION_TAIL = 0.35  # how long a caption lingers after its line's speech ends

# ---------------------------------------------------------------- counter --
# Keyframes (time, value, mode). mode "ease" = ease-in-out from the previous
# key, "snap" = jump to value on that exact frame and hold.
COUNTER = [
    (0.0,               499, "snap"),
    (("gone", "end"),   499, "snap"),     # hold 499 while the hook is spoken
    (("light", "end"),  440, "ease"),
    (("fight", "end"),  340, "ease"),
    (("merger", "end"), 180, "ease"),
    (34.10,              11, "ease"),
    (("ten", 0.0),       10, "snap"),
    (("five", 0.0),       5, "snap"),
    (("three", 0.0),      3, "snap"),
    (("two", 0.0),        2, "snap"),
    (("one", 0.0),        1, "snap"),
    (("zero", 0.0),       0, "snap"),
    (59.70,             499, "snap"),     # loop: last 9 frames already read 499
]
PULSE_FROM = 30.0        # tick pulse on integer change in the final stretch
RED_AT = ("zero", 0.0)
FLASH_AT = ("zero", 0.0)  # 1-frame white flash
SHAKE_AT = ("zero", 0.0)  # 6-frame camera shake

# ----------------------------------------------------------------- scrim ---
# Left-side dark gradient that guarantees counter legibility.
# (start, end, strength) – strength = opacity at the left edge.
SCRIM = [
    (0.0, 4.6, 0.35),
    (4.6, 15.0, 0.80),     # clip1 close-up: the face sits in the left third
    (15.0, 30.0, 0.55),    # clip2: wavefront ring overlaps the left third
    (30.0, 60.0, 0.40),
]

# ------------------------------------------------------------------- SFX ---
SFX = dict(
    drone=(0.0, 40.0),
    heart_from=27.0,
    heart_to=40.0,
    hit_at=("zero", 0.0),
    wind_from=46.0,
)
