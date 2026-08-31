# Audio credits

All effects and music below are free to use commercially with no attribution
required (CC0 / a file the user already owns). Listed here anyway for
traceability — nothing needs to ship in-app.

| File | Source | Original file | License | URL |
|---|---|---|---|---|
| `ui-click.m4a` | Kenney — Interface Sounds | `click_001.ogg` | CC0 | https://kenney.nl/assets/interface-sounds |
| `ui-denied.m4a` | Kenney — Interface Sounds | `error_004.ogg` | CC0 | https://kenney.nl/assets/interface-sounds |
| `ui-purchase.m4a` | Kenney — Interface Sounds | `confirmation_001.ogg` | CC0 | https://kenney.nl/assets/interface-sounds |
| `draft-open.m4a` | Kenney — Interface Sounds | `open_002.ogg` | CC0 | https://kenney.nl/assets/interface-sounds |
| `plinko-gate.m4a` | Kenney — Interface Sounds | `pluck_002.ogg` | CC0 | https://kenney.nl/assets/interface-sounds |
| `plinko-tick.m4a` | Kenney — Impact Sounds | `impactGlass_light_000.ogg` | CC0 | https://kenney.nl/assets/impact-sounds |
| `plinko-land.m4a` | Kenney — Impact Sounds | `impactTin_medium_002.ogg` | CC0 | https://kenney.nl/assets/impact-sounds |
| `hero-attack.m4a` | Kenney — Impact Sounds | `impactWood_light_002.ogg` | CC0 | https://kenney.nl/assets/impact-sounds |
| `enemy-melee.m4a` | Kenney — Impact Sounds | `impactPunch_heavy_001.ogg` | CC0 | https://kenney.nl/assets/impact-sounds |
| `enemy-ranged.m4a` | Kenney — Impact Sounds | `impactMetal_light_002.ogg` | CC0 | https://kenney.nl/assets/impact-sounds |
| `enemy-death.m4a` | "80 CC0 creature SFX" by rubberduck | `hurt_04.ogg` | CC0 | https://opengameart.org/content/80-cc0-creature-sfx |
| `victory.m4a` | Kenney — Music Jingles | `Steel jingles/jingles_STEEL00.ogg` | CC0 | https://kenney.nl/assets/music-jingles |
| `defeat.m4a` | Kenney — Music Jingles | `Steel jingles/jingles_STEEL16.ogg` | CC0 | https://kenney.nl/assets/music-jingles |
| `wheel-spin.m4a` | Provided by the project owner | `~/Documents/sfx-wheel.m4a` | — | — |
| `music-theme.m4a` | "Medieval: Exploration" by cynicmusic | `Exploration_0.mp3`, trimmed to the song body (dropped a ~2s intro fade and the tail silence) and re-encoded | CC0 | https://opengameart.org/content/medieval-exploration |

All Kenney packs (Interface Sounds, Impact Sounds, Music Jingles) ship under
`http://creativecommons.org/publicdomain/zero/1.0/` per each pack's own
`License.txt`; "80 CC0 creature SFX" is dedicated CC0 on its own OpenGameArt
page. Files were re-encoded from the source `.ogg`/`.mp3`/`.wav` to AAC
`.m4a` (mono ~64 kbps for one-shot effects, stereo ~96 kbps for the jingles
and the music loop) — no other content changes.

`enemy-death.m4a` was swapped from the original Kenney jingle (a musical
stinger, not a creature sound — read as a jarring non-sequitur against the
death VFX) to a short creature "hurt" vocalization instead.

`ui-click.m4a` is re-encoded **normalized to -6 dBFS peak**. Kenney mastered
`click_001.ogg` at -44.5 dBFS, which is quiet enough to vanish under the music
entirely; the whole file is signal (its quietest 10 ms window sits only 8 dB
below the peak), so there is no noise floor for the +38 dB lift to expose. The
gain was applied at 32-bit before the AAC encode. Standing per-clip trims for
the *loud* outliers live in `SFX_GAIN` in `src/game/audio/sfx.ts`, not in the
files, so the balance stays tunable without a re-encode.

The seven stereo sources were downmixed to mono before encoding (`afconvert`
refuses a channel downmix straight out of Vorbis, so they went
`.ogg` → 16-bit stereo WAV → mono WAV → AAC). `plinko-tick.m4a` is
deliberately one of the shortest impacts in the pack: the pachinko rattle is
built by retriggering it many times a second, so anything with a long tail
would smear into mud.
