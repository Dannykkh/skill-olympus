#!/bin/bash

append_assistant_entry() {
    local conv_file="$1"
    local timestamp="$2"
    local response="$3"

    if [ -z "$response" ] || [ ${#response} -lt 5 ]; then
        return 0
    fi

    local text="$response"
    text="$(echo "$text" | perl -0777 -pe 's/```.*?```/[code block]/gs' 2>/dev/null || echo "$text")"

    if [ ${#text} -gt 2000 ]; then
        text="${text:0:2000}..."
    fi

    echo -e "\n## [$timestamp] Assistant\n\n$text\n" >> "$conv_file"
}
