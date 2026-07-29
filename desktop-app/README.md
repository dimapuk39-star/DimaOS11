# DimaOS 11 — Windows application

`DimaOS11.exe` is a lightweight launcher for the entertainment edition of DimaOS.
It opens the published application in a separate Microsoft Edge application window
without an address bar. It does not replace Windows, install drivers, or change the
real operating system.

The executable is intentionally small and uses the Edge runtime already included
with Windows 10 and Windows 11. If Edge cannot be found, the launcher opens DimaOS
in the default browser.

Run `BUILD-APP.cmd` to rebuild the executable from `DimaOSLauncher.cs`.
