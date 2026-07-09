@echo off
REM Opens the live RoboNexus site in Edge with autoplay fully unlocked, so the
REM voiceover starts automatically with zero clicks -- for kiosk/presentation
REM use on a machine you control. Uses a separate throwaway profile so it
REM never touches your normal Edge windows/history.
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --autoplay-policy=no-user-gesture-required --user-data-dir="%TEMP%\robonexus-kiosk" --start-fullscreen "https://pragathibhat.github.io/Robonexus/"
