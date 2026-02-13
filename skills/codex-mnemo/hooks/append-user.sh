#!/bin/bash

append_user_entry() {
    local conv_file="$1"
    local timestamp="$2"
    local user_text="$3"

    if [ -z "$user_text" ]; then
        return 0
    fi

    echo -e "\n## [$timestamp] User\n\n$user_text\n" >> "$conv_file"
}
