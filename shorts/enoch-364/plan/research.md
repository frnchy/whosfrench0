# Research: "The Book of Enoch says a year is 364 days. What if Earth agreed?"

Every number on screen or in the voice-over, with its source. Derived values come from `sim/bake.ts` and are checked by `sim/validate.ts`.

| Claim (where it appears) | Value | Source |
|---|---|---|
| The Book of Enoch gives a 364-day year (line 1, HUD) | "the year is completed in three hundred and sixty-four days" | 1 Enoch 82:6 (also 72:32, 74:12), R. H. Charles translation, 1917, public domain: https://sacred-texts.com/bib/boe/boe085.htm · https://en.wikisource.org/wiki/The_Book_of_Enoch_(Charles) |
| The same 364-day calendar was used at Qumran / in Jubilees (context, not on screen) | 12 months, 4 quarters of 91 days | https://en.wikipedia.org/wiki/Qumran_calendrical_texts · https://www.biblicalarchaeology.org/daily/news/qumran-community-364-day-calendar/ |
| Earth's year (line 2, HUD) | 365.24219 days (mean tropical year, J2000) | Meeus & Savoie 1992 / Astronomical Almanac, summarised at https://en.wikipedia.org/wiki/Tropical_year · https://www.timeanddate.com/astronomy/tropical-year.html |
| Calendar slips "a day and a quarter" a year (lines 3–4) | 365.24219 − 364 = 1.24219 days/yr | derived |
| "In ten years… twelve days early" (line 4, HUD) | 12.4 days | derived |
| "After 147 years, midsummer falls in winter" (line 5, HUD) | half a year / 1.24219 = 147.0 years | derived |
| Earth–Sun distance (HUD) | 1 au = 149,597,870.7 km (exact) | IAU 2012 Resolution B2: https://arxiv.org/pdf/1511.01546 · https://observatoiredeparis.psl.eu/the-new-definition-of-the-astronomical-unit.html |
| Kepler's third law (HUD) | T² ∝ a³ → a' = a·(364/365.24219)^(2/3) | standard orbital mechanics: https://ssd.jpl.nasa.gov/glossary/semimajor_axis.html |
| "339,000 km closer" (line 8, HUD) | 339,381 km | derived from the two rows above |
| "Almost the distance to the Moon" (line 8, HUD) | Moon mean distance 384,400 km (shift = 88% of it) | NASA via https://space.com/18145-how-far-is-the-moon.html |
| Earth radius / Moon radius (local scene scale) | 6,371 km / 1,737.4 km | NASA fact sheets: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| Axial tilt (Earth model) | 23.44° | NASA Earth fact sheet (above) |
| "Half a percent stronger" sunlight (line 10, HUD) | inverse-square: (a/a')² − 1 = +0.455% | derived |
| Solar constant (HUD) | 1,360.8 W/m² → +6.2 W/m² | Kopp & Lean 2011, GRL: https://espo.nasa.gov/node/30086 |
| Bond albedo (forcing calc) | 0.306 | NASA Earth fact sheet (above) |
| Global-mean forcing (HUD) | ΔF = 6.2 × (1 − 0.306) / 4 = +1.07 W/m² | derived |
| "About forty percent of the warming push humans have added since 1750" (line 10, HUD) | 1.07 / 2.72 = 39.5% | IPCC AR6 WG1 total anthropogenic ERF 1750–2019 = 2.72 W/m²: https://www.ipcc.ch/report/ar6/wg1/figures/chapter-7/figure-7-6 (value as reported by https://thesourcemagazine.org/?p=9373) |

## ESTIMATED / simplified (said plainly)
- **Circular orbit.** The calculation treats Earth's orbit as circular and scales the semimajor axis only. Earth's real eccentricity (0.0167) does not change the result at this precision.
- **Tropical vs sidereal year.** Kepler's law governs the sidereal year (365.25636 d); the calendar cares about the tropical year. Using either ratio changes the shift by under 0.01%, so the 339,000 km figure holds.
- **Sun brightening on screen is illustrative.** The real change (+0.46%) is invisible to the eye; the glow is boosted 12% so the beat reads, and the HUD gives the true value.
- **No temperature number is claimed.** Converting +1.07 W/m² into °C needs a climate-sensitivity estimate, so the video compares forcing to forcing instead.

## Not used
- The IPCC CO₂-only figure (≈2.16 W/m²) could not be confirmed from a primary page in this session, so the video compares to the total anthropogenic forcing (2.72 W/m²) instead.
