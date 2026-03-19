; RGFX Hub - Custom NSIS installer script
; Adds Windows Firewall rules so the hub can communicate with ESP32 drivers

!include "MUI.nsh"

!macro customInstall
  ; Allow the app through Windows Firewall (UDP discovery + mDNS)
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="RGFX Hub" dir=in action=allow program="$INSTDIR\rgfx-hub.exe" enable=yes'
!macroend

!macro customUnInstall
  ; Remove firewall rule on uninstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="RGFX Hub"'
!macroend
