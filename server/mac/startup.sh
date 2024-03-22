#! /bin/bash
cd skybrush-server

# Check if skybrush.jsonc exists in the current directory
if [ ! -f "skybrush.jsonc" ]; then
    echo "Creating skybrush.jsonc..."
    printf '{\n  "EXTENSIONS": {\n    "mavlink": {\n      "enabled": true,\n      "networks": {\n        "mav": {\n          "connections": [\n            "udp-listen://:14550?broadcast_port=14555"\n          ],\n          "id_format": "{0:02}",\n          "statustext_targets": [\n            "client",\n            "server"\n          ],\n          "system_id": 254\n        }\n      }\n    },\n    "rc": {\n      "enabled": true\n    }\n  }\n}' > skybrush.jsonc
else
    echo "skybrush.jsonc exists."
fi

cd .venv
cd bin
source activate
python3 skybrushd