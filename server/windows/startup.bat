:: steps needed for windows startup 
:: this file will be were we right the commands needed instead of harding coding in python arguments
:: for windows ONLY

cd ..
cd skybrush-server

:: Check if skybrush.jsonc exists
IF EXIST "skybrush.jsonc" (
    echo skybrush.jsonc exists HELLO.
) ELSE (
    echo Creating skybrush.jsonc...
    (
    echo {
    echo   "EXTENSIONS": {
    echo     "mavlink": {
    echo       "enabled": true,
    echo       "networks": {
    echo         "mav": {
    echo           "connections": [
    echo             "udp-listen://:14550?broadcast_port=14555"
    echo           ],
    echo           "id_format": "{0:02}",
    echo           "statustext_targets": [
    echo             "client",
    echo             "server"
    echo           ],
    echo           "system_id": 254
    echo         }
    echo       }
    echo     },
    echo     "rc": {
    echo       "enabled": true
    echo     }
    echo   }
    echo }
    ) > skybrush.jsonc
)

poetry run skybrushd