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
#   --unlink 모드: 심볼릭 링크 제거
# ============================================
if [ "$MODE" = "unlink" ]; then
    echo "[1/2] Skills 링크 제거 중..."
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
    echo "[2/2] Agents 링크 제거 중..."
    if [ -L "$CLAUDE_DIR/agents" ]; then
        echo "      - agents [링크 제거]"
        rm "$CLAUDE_DIR/agents"
    else
        echo "      - agents [링크 아님, 건너뜀]"
    fi
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
    echo "[1/4] Skills 링크 중... (글로벌, symlink)"
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
    echo "[2/4] Agents 링크 중... (글로벌, symlink)"
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
else
    # ============================================
    #   기본 모드: 복사
    # ============================================

    # Skills 설치 (글로벌)
    echo "[1/4] Skills 설치 중... (글로벌)"
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
    echo "[2/4] Agents 설치 중... (글로벌)"
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
fi

# Commands 안내 (프로젝트별)
echo ""
echo "[3/4] Commands 안내... (프로젝트별 설치 필요)"
if [ -d "$SCRIPT_DIR/commands" ]; then
    echo "      Commands는 프로젝트별로 설치해야 합니다."
    echo "      프로젝트 폴더에서 다음 명령 실행:"
    echo ""
    echo "      mkdir -p .claude/commands"
    echo "      cp $SCRIPT_DIR/commands/*.md .claude/commands/"
    echo ""
    echo "      포함된 Commands:"
    for cmd_file in "$SCRIPT_DIR/commands"/*.md; do
        if [ -f "$cmd_file" ]; then
            echo "      - $(basename "$cmd_file")"
        fi
    done
else
    echo "      명령어 없음"
fi

# Hooks 안내 (프로젝트별)
echo ""
echo "[4/4] Hooks 안내... (프로젝트별 설치 필요)"
if [ -d "$SCRIPT_DIR/hooks" ]; then
    echo "      Hooks는 프로젝트별로 설치해야 합니다."
    echo "      프로젝트 폴더에서 다음 명령 실행:"
    echo ""
    echo "      mkdir -p .claude/hooks"
    echo "      cp $SCRIPT_DIR/hooks/*.sh .claude/hooks/"
    echo ""
    echo "      그리고 hooks/settings.example.json을 참고하여"
    echo "      .claude/settings.json에 hooks 설정을 추가하세요."
else
    echo "      훅 없음"
fi

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
    echo "  - Skills: $CLAUDE_DIR/skills/ (개별 링크)"
    echo "  - Agents: $CLAUDE_DIR/agents/ (전체 링크)"
    echo ""
    echo "  git pull만으로 업데이트가 자동 반영됩니다."
    echo "  링크 제거: ./install.sh --unlink"
else
    echo "  글로벌 설치 완료:"
    echo "  - Skills: $CLAUDE_DIR/skills/"
    echo "  - Agents: $CLAUDE_DIR/agents/"
fi
echo ""
echo "  프로젝트별 설치 필요:"
echo "  - Commands: .claude/commands/"
echo "  - Hooks: .claude/hooks/ + settings.json"
echo ""
echo "  Claude Code를 재시작하면 적용됩니다."
echo ""
