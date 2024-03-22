::THIS VERSION IS RAN WHEN WE DON'T HAVE SKYBRUSH INSTALLED

pip install poetry
cd ..
cd skybrush-server

:: Check if skybrush.jsonc exists
IF EXIST "skybrush.jsonc" (
    echo skybrush.jsonc exists..
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

poetry install
poetry run skybrushd