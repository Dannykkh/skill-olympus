const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");

// cmd.exe는 배치 파일을 바이트 단위로 읽으면서 파일 위치를 문자 수 기준으로 되돌린다.
// `chcp 65001` 상태에서 멀티바이트(한글, 박스 드로잉) 줄을 만나면 그 오프셋이 어긋나
// 다음 실행 지점이 줄 중간에 떨어진다. 그러면 REM 주석의 뒷토막이 명령으로 실행돼
// "'깔리는' is not recognized ..." / ". was unexpected at this time." 로 설치가 죽는다.
// 재현 여부가 콘솔 코드 페이지(CP949 vs UTF-8)에 좌우돼 PC마다 다르게 터지므로,
// 배치 파일은 주석까지 포함해 ASCII만 허용한다. 한국어 설명은 docs/ 나 .js/.sh 로.
test("배치 파일은 ASCII만 포함한다 (cmd.exe UTF-8 파서 버그 방지)", () => {
  const listed = spawnSync("git", ["ls-files", "*.bat", "*.cmd"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(listed.status, 0, "git ls-files failed");

  const files = listed.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  assert.ok(files.length > 0, "no .bat/.cmd files tracked");

  const offenders = [];
  for (const relative of files) {
    const contents = fs.readFileSync(path.join(repoRoot, relative), "utf8");
    contents.split(/\r?\n/).forEach((line, index) => {
      if (/[^\x00-\x7F]/.test(line)) {
        offenders.push(`${relative}:${index + 1}: ${line.trim().slice(0, 80)}`);
      }
    });
  }

  assert.deepEqual(offenders, [], `non-ASCII characters in batch files:\n${offenders.join("\n")}`);
});

// Windows PowerShell 5.1은 BOM 없는 파일을 ANSI 코드 페이지(한국어 환경은 CP949)로 읽는다.
// UTF-8 한국어 바이트(0xE0~0xED ...)가 CP949 lead byte로 해석되면 뒤따르는 바이트를
// 삼켜버려서, 운이 나쁘면 닫는 따옴표까지 먹고 파스가 통째로 실패한다
// (실측: launch.ps1 parseErrors=28). 파스에 성공해도 한국어 출력·생성 템플릿·AI
// 프롬프트가 mojibake가 된다("| 목표 | 상태 |" -> "| 紐⑺몴 | ?곹깭 |").
// 훅은 pwsh가 아니라 `powershell`(5.1)로 실행되므로 BOM이 필수다.
test("비ASCII를 포함한 .ps1은 UTF-8 BOM을 가진다 (PowerShell 5.1 CP949 오독 방지)", () => {
  const listed = spawnSync("git", ["ls-files", "*.ps1", "*.psm1"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(listed.status, 0, "git ls-files failed");

  const files = listed.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  assert.ok(files.length > 0, "no .ps1 files tracked");

  const offenders = [];
  for (const relative of files) {
    const bytes = fs.readFileSync(path.join(repoRoot, relative));
    const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    if (/[^\x00-\x7F]/.test(bytes.toString("utf8")) && !hasBom) {
      offenders.push(relative);
    }
  }

  assert.deepEqual(offenders, [], `non-ASCII .ps1 without UTF-8 BOM:\n${offenders.join("\n")}`);
});
