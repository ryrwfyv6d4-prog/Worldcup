# Club audio (optional, not committed)

The draw plays a club's walkout tune when its card is turned over.

By default it streams Apple's public 30-second preview, whose URL is baked
into draw-night.html from scripts/club-audio.json. That needs a connection on
the night but keeps copyrighted audio out of this repository.

To run without a connection, put files here named by the club's three-letter
code — ARS.mp3, LIV.mp3 and so on. The page checks for a local file first and
only falls back to the stream if there isn't one. scripts/fetch-audio.py will
download and normalise them for you.

Audio files in this folder are gitignored on purpose. They are somebody else's
music: fine to hold a copy on the machine running the show, not something to
publish from a public site.
