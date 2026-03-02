#!/bin/bash

append_assistant_entry() {
    local conv_file="$1"
    local timestamp="$2"
    local response="$3"

    if [ -z "$response" ] || [ ${#response} -lt 5 ]; then
        return 0
    fi

    local text="$response"
    # 4000자 제한
    if [ ${#text} -gt 4000 ]; then
        text="${text:0:4000}..."
    fi

    echo -e "\n## [$timestamp] Assistant\n\n$text\n" >> "$conv_file"
}
