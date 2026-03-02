#!/bin/bash

append_assistant_entry() {
    local conv_file="$1"
    local timestamp="$2"
    local response="$3"

    if [ -z "$response" ] || [ ${#response} -lt 5 ]; then
        return 0
    fi

    echo -e "\n## [$timestamp] Assistant\n\n$response\n" >> "$conv_file"
}
