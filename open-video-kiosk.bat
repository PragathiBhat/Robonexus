@echo off
REM Opens the live Robonexus video display in Edge with autoplay-with-sound
REM fully unlocked, so scenario videos play immediately with zero clicks --
REM for the dedicated video-display device at the venue. Uses a separate
REM throwaway profile so it never touches your normal Edge windows/history.
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --autoplay-policy=no-user-gesture-required --user-data-dir="%TEMP%\robonexus-video-kiosk" --start-fullscreen "https://pragathibhat.github.io/Robonexus/video.html"
