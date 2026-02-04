#!/bin/bash
# ============================================
#   Claude Code Customizations Installer
#   Skills, Agents, Commands, Hooks 설치 스크립트
#   사용법: install.sh [--link | --unlink]
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

# 모드 결정
MODE="copy"
if [ "$1" = "--link" ]; then
    MODE="link"
elif [ "$1" = "--unlink" ]; then
    MODE="unlink"
fi

echo ""
echo "============================================"
if [ "$MODE" = "link" ]; then
    echo "  Claude Code Customizations Installer [LINK]"
elif [ "$MODE" = "unlink" ]; then
    echo "  Claude Code Customizations Unlinker"
else
    echo "  Claude Code Customizations Installer"
fi
echo "============================================"
echo ""

# Claude 폴더 확인
if [ ! -d "$CLAUDE_DIR" ]; then
    echo "[오류] Claude Code가 설치되어 있지 않습니다."
    echo "       $CLAUDE_DIR 폴더를 찾을 수 없습니다."
    exit 1
fi

# ============================================
#   --unlink 모드: 심볼릭 링크 제거 + settings.json 정리
# ============================================
if [ "$MODE" = "unlink" ]; then
    echo "[1/4] Skills 링크 제거 중..."
    if [ -d "$SCRIPT_DIR/skills" ]; then
        for skill_dir in "$SCRIPT_DIR/skills"/*/; do
            if [ -d "$skill_dir" ]; then
                skill_name=$(basename "$skill_dir")
                target="$CLAUDE_DIR/skills/$skill_name"
                if [ -L "$target" ]; then
                    echo "      - $skill_name [링크 제거]"
                    rm "$target"
                else
                    echo "      - $skill_name [링크 아님, 건너뜀]"
                fi
            fi
        done
    fi
    echo "      완료!"

    echo ""
    echo "[2/4] Agents 링크 제거 중..."
    if [ -L "$CLAUDE_DIR/agents" ]; then
        echo "      - agents [링크 제거]"
        rm "$CLAUDE_DIR/agents"
    else
        echo "      - agents [링크 아님, 건너뜀]"
    fi
    echo "      완료!"

    echo ""
    echo "[3/4] Commands 링크 제거 중..."
    if [ -L "$CLAUDE_DIR/commands" ]; then
        echo "      - commands [링크 제거]"
        rm "$CLAUDE_DIR/commands"
    else
        echo "      - commands [링크 아님, 건너뜀]"
    fi
    echo "      완료!"

    echo ""
    echo "[4/4] Hooks 링크 제거 + settings.json 정리 중..."
    if [ -L "$CLAUDE_DIR/hooks" ]; then
        echo "      - hooks [링크 제거]"
        rm "$CLAUDE_DIR/hooks"
    else
        echo "      - hooks [링크 아님, 건너뜀]"
    fi
    # settings.json에서 hooks 설정 제거
    node "$SCRIPT_DIR/install-hooks-config.js" "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/settings.json" --uninstall
    echo "      완료!"

    echo ""
    echo "============================================"
    echo "  링크 제거 완료!"
    echo "============================================"
    echo ""
    echo "  원본 파일은 그대로 유지됩니다."
    echo "  복사 모드로 재설치하려면: ./install.sh"
    echo "  링크 모드로 재설치하려면: ./install.sh --link"
    echo ""
    exit 0
fi

# ============================================
#   --link 모드: 심볼릭 링크 생성
# ============================================
if [ "$MODE" = "link" ]; then
    # Skills 링크 (개별 폴더)
    echo "[1/5] Skills 링크 중... (글로벌, symlink)"
    if [ -d "$SCRIPT_DIR/skills" ]; then
        mkdir -p "$CLAUDE_DIR/skills"
        for skill_dir in "$SCRIPT_DIR/skills"/*/; do
            if [ -d "$skill_dir" ]; then
                skill_name=$(basename "$skill_dir")
                target="$CLAUDE_DIR/skills/$skill_name"
                # 기존 항목이 있으면 제거 (링크든 일반 폴더든)
                if [ -L "$target" ]; then
                    rm "$target"
                elif [ -d "$target" ]; then
                    rm -rf "$target"
                fi
                ln -s "$skill_dir" "$target"
                echo "      - $skill_name [linked]"
            fi
        done
        echo "      완료!"
    else
        echo "      스킬 없음"
    fi

    # Agents 링크 (전체 폴더)
    echo ""
    echo "[2/5] Agents 링크 중... (글로벌, symlink)"
    if [ -d "$SCRIPT_DIR/agents" ]; then
        target="$CLAUDE_DIR/agents"
        if [ -L "$target" ]; then
            rm "$target"
        elif [ -d "$target" ]; then
            rm -rf "$target"
        fi
        ln -s "$SCRIPT_DIR/agents" "$target"
        echo "      - agents [linked]"
        echo "      완료!"
    else
        echo "      에이전트 없음"
    fi

    # Commands 링크 (전체 폴더)
    echo ""
    echo "[3/5] Commands 링크 중... (글로벌, symlink)"
    if [ -d "$SCRIPT_DIR/commands" ]; then
        target="$CLAUDE_DIR/commands"
        if [ -L "$target" ]; then
            rm "$target"
        elif [ -d "$target" ]; then
            rm -rf "$target"
        fi
        ln -s "$SCRIPT_DIR/commands" "$target"
        echo "      - commands [linked]"
        echo "      완료!"
    else
        echo "      명령어 없음"
    fi

    # Hooks 링크 (전체 폴더)
    echo ""
    echo "[4/5] Hooks 링크 중... (글로벌, symlink)"
    if [ -d "$SCRIPT_DIR/hooks" ]; then
        target="$CLAUDE_DIR/hooks"
        if [ -L "$target" ]; then
            rm "$target"
        elif [ -d "$target" ]; then
            rm -rf "$target"
        fi
        ln -s "$SCRIPT_DIR/hooks" "$target"
        echo "      - hooks [linked]"
        echo "      완료!"
    else
        echo "      훅 없음"
    fi
else
    # ============================================
    #   기본 모드: 복사
    # ============================================

    # Skills 설치 (글로벌)
    echo "[1/5] Skills 설치 중... (글로벌)"
    if [ -d "$SCRIPT_DIR/skills" ]; then
        for skill_dir in "$SCRIPT_DIR/skills"/*/; do
            if [ -d "$skill_dir" ]; then
                skill_name=$(basename "$skill_dir")
                echo "      - $skill_name"
                mkdir -p "$CLAUDE_DIR/skills/$skill_name"
                cp -r "$skill_dir"* "$CLAUDE_DIR/skills/$skill_name/"
            fi
        done
        echo "      완료!"
    else
        echo "      스킬 없음"
    fi

    # Agents 설치 (글로벌)
    echo ""
    echo "[2/5] Agents 설치 중... (글로벌)"
    if [ -d "$SCRIPT_DIR/agents" ] && [ "$(ls -A "$SCRIPT_DIR/agents"/*.md 2>/dev/null)" ]; then
        mkdir -p "$CLAUDE_DIR/agents"
        for agent_file in "$SCRIPT_DIR/agents"/*.md; do
            if [ -f "$agent_file" ]; then
                echo "      - $(basename "$agent_file")"
                cp "$agent_file" "$CLAUDE_DIR/agents/"
            fi
        done
        echo "      완료!"
    else
        echo "      에이전트 없음"
    fi

    # Commands 설치 (글로벌)
    echo ""
    echo "[3/5] Commands 설치 중... (글로벌)"
    if [ -d "$SCRIPT_DIR/commands" ] && [ "$(ls -A "$SCRIPT_DIR/commands"/*.md 2>/dev/null)" ]; then
        mkdir -p "$CLAUDE_DIR/commands"
        for cmd_file in "$SCRIPT_DIR/commands"/*.md; do
            if [ -f "$cmd_file" ]; then
                echo "      - $(basename "$cmd_file")"
                cp "$cmd_file" "$CLAUDE_DIR/commands/"
            fi
        done
        echo "      완료!"
    else
        echo "      명령어 없음"
    fi

    # Hooks 설치 (글로벌)
    echo ""
    echo "[4/5] Hooks 설치 중... (글로벌)"
    if [ -d "$SCRIPT_DIR/hooks" ]; then
        mkdir -p "$CLAUDE_DIR/hooks"
        for hook_file in "$SCRIPT_DIR/hooks"/*.sh; do
            if [ -f "$hook_file" ]; then
                hook_name=$(basename "$hook_file")
                # 프로젝트 전용 훅 제외 (orchestrator)
                case "$hook_name" in
                    workpm-hook*|pmworker-hook*|orchestrator-mode*)
                        echo "      - $hook_name [스킵: 프로젝트 전용]"
                        ;;
                    *)
                        echo "      - $hook_name"
                        cp "$hook_file" "$CLAUDE_DIR/hooks/"
                        chmod +x "$CLAUDE_DIR/hooks/$hook_name"
                        ;;
                esac
            fi
        done
        for hook_file in "$SCRIPT_DIR/hooks"/*.ps1; do
            if [ -f "$hook_file" ]; then
                hook_name=$(basename "$hook_file")
                # 프로젝트 전용 훅 제외 (orchestrator)
                case "$hook_name" in
                    workpm-hook*|pmworker-hook*|orchestrator-mode*)
                        echo "      - $hook_name [스킵: 프로젝트 전용]"
                        ;;
                    *)
                        echo "      - $hook_name"
                        cp "$hook_file" "$CLAUDE_DIR/hooks/"
                        ;;
                esac
            fi
        done
        echo "      완료!"
    else
        echo "      훅 없음"
    fi
fi

# settings.json 훅 설정 (글로벌)
echo ""
echo "[5/5] settings.json 훅 설정 중... (글로벌)"
node "$SCRIPT_DIR/install-hooks-config.js" "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/settings.json" --bash

echo ""
echo "============================================"
if [ "$MODE" = "link" ]; then
    echo "  링크 설치 완료!"
else
    echo "  설치 완료!"
fi
echo "============================================"
echo ""
if [ "$MODE" = "link" ]; then
    echo "  글로벌 링크 완료 (symlink):"
    echo "  - Skills:   $CLAUDE_DIR/skills/ (개별 링크)"
    echo "  - Agents:   $CLAUDE_DIR/agents/ (전체 링크)"
    echo "  - Commands: $CLAUDE_DIR/commands/ (전체 링크)"
    echo "  - Hooks:    $CLAUDE_DIR/hooks/ (전체 링크)"
    echo ""
    echo "  git pull만으로 업데이트가 자동 반영됩니다."
    echo "  링크 제거: ./install.sh --unlink"
else
    echo "  글로벌 설치 완료:"
    echo "  - Skills:   $CLAUDE_DIR/skills/"
    echo "  - Agents:   $CLAUDE_DIR/agents/"
    echo "  - Commands: $CLAUDE_DIR/commands/"
    echo "  - Hooks:    $CLAUDE_DIR/hooks/"
fi
echo "  - settings.json 훅 설정 등록 완료"
echo ""
echo "  Claude Code를 재시작하면 적용됩니다."
echo ""
