/* 저충실도 구조 확인용: 서버 연결·영구 저장을 수행하지 않는다. */
const editor = document.querySelector('#document-body');
const titleInput = document.querySelector('#document-title');
const statusText = document.querySelector('.save-status');
const saveButton = document.querySelector('.save-button');
const dialog = document.querySelector('#action-dialog');
const dialogContent = document.querySelector('#dialog-content');
const navigation = document.querySelector('#app-navigation');
const navigationToggle = document.querySelector('.nav-toggle');
let returnFocus;

function closeMenus() { document.querySelectorAll('details[open]').forEach(item => item.open = false); }
function showDialog(title, content) {
  returnFocus = document.activeElement;
  closeMenus();
  document.querySelector('#dialog-title').textContent = title;
  dialogContent.replaceChildren();
  if (typeof content === 'string') dialogContent.innerHTML = content;
  else dialogContent.append(content);
  dialog.showModal();
}
function setDirty() {
  statusText.textContent = '저장하지 않은 변경사항';
  saveButton.disabled = false;
  saveButton.classList.add('primary');
  document.querySelector('.empty-start')?.setAttribute('hidden', '');
}
function save() {
  if (!titleInput.value.trim()) {
    document.querySelector('#state-notice').hidden = false;
    document.querySelector('#state-message').textContent = '문서 제목을 입력하세요. 작성한 본문은 그대로 있습니다.';
    document.querySelector('#recovery-button').textContent = '제목 입력';
    document.querySelector('#recovery-button').onclick = () => titleInput.focus();
    titleInput.setAttribute('aria-invalid', 'true');
    return;
  }
  titleInput.removeAttribute('aria-invalid');
  document.querySelector('#state-notice').hidden = true;
  statusText.textContent = '저장 중…';
  saveButton.disabled = true;
  setTimeout(() => { statusText.textContent = '모든 변경사항 저장됨'; saveButton.disabled = false; }, 450);
}
saveButton.addEventListener('click', save);
editor.addEventListener('input', setDirty);
titleInput.addEventListener('input', () => {
  setDirty();
  const name = document.querySelector('#empty-document-name');
  if (name) name.textContent = titleInput.value.trim() || '새 문서';
});
document.querySelector('.empty-start')?.addEventListener('click', () => {
  document.querySelector('.empty-start').hidden = true;
  editor.focus();
});
navigationToggle.addEventListener('click', () => {
  const open = !navigation.classList.contains('open');
  navigation.classList.toggle('open', open);
  navigationToggle.setAttribute('aria-expanded', String(open));
  if (open) navigation.querySelector('.nav-close').focus();
});
document.querySelector('.nav-close').addEventListener('click', () => {
  navigation.classList.remove('open');
  navigationToggle.setAttribute('aria-expanded', 'false');
  navigationToggle.focus();
});
document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => returnFocus?.focus());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeMenus();
    if (navigation.classList.contains('open')) document.querySelector('.nav-close').click();
  }
});
const panels = {
  share: ['공유', '<label for="share-link">문서 링크</label><input id="share-link" value="입고 검사 매뉴얼 / 문서 링크" readonly><p class="muted">저장한 문서를 공유합니다.</p>'],
  comments: ['댓글', '<p>아직 댓글이 없습니다.</p><label for="comment">댓글 작성</label><textarea id="comment" rows="3" placeholder="검토 의견을 입력하세요"></textarea>'],
  history: ['버전 기록', '<p>현재 버전 · 모든 변경사항 저장됨</p>'],
  export: ['내보내기', '<label for="export-format">파일 형식</label><select id="export-format"><option>PDF</option><option>텍스트</option></select><button type="button" data-action="export-confirm">파일 내보내기</button>'],
  settings: ['문서 설정', '<label for="document-folder">저장 위치</label><select id="document-folder"><option>팀 폴더</option></select>'],
  info: ['문서 정보', '<dl><dt>저장 위치</dt><dd>팀 폴더</dd><dt>편집 권한</dt><dd>편집 가능</dd></dl>'],
  workspace: ['워크스페이스 전환', '<label for="workspace-choice">워크스페이스</label><select id="workspace-choice"><option>운영팀 워크스페이스</option></select>'],
  account: ['내 계정', '<p>편집 권한이 있는 담당자</p>'],
  recent: ['최근 문서', '<p><a href="editor.html">입고 검사 매뉴얼</a></p>'],
  folders: ['팀 폴더', '<p><a href="editor.html">입고 검사 매뉴얼</a></p>'],
  favorites: ['즐겨찾기', '<p>즐겨찾기에 등록한 문서가 없습니다.</p>'],
  templates: ['템플릿', '<p>템플릿을 선택하는 목록 영역</p>'],
  list: ['목록', '<button type="button" data-action="format-confirm">글머리 기호 목록</button><button type="button" data-action="format-confirm">번호 목록</button>'],
  link: ['링크 삽입', '<label for="link-label">표시할 텍스트</label><input id="link-label"><label for="link-url">주소</label><input id="link-url" type="url" placeholder="https://"><button type="button" data-action="format-confirm">링크 삽입</button>'],
  table: ['표 삽입', '<label for="table-rows">행</label><input id="table-rows" type="number" value="2" min="1"><label for="table-columns">열</label><input id="table-columns" type="number" value="2" min="1"><button type="button" data-action="format-confirm">표 삽입</button>']
};
document.addEventListener('click', event => {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  event.preventDefault();
  const action = actionElement.dataset.action;
  if (action === 'preview') {
    const preview = document.createElement('article');
    preview.className = 'editor';
    preview.innerHTML = editor.innerHTML || '<p>아직 작성한 본문이 없습니다.</p>';
    showDialog('미리보기', preview);
  } else if (action === 'search') {
    const query = document.querySelector('#body-search').value.trim();
    const count = query ? editor.textContent.split(query).length - 1 : 0;
    document.querySelector('#search-result').textContent = query ? `${count}곳 일치` : '검색어를 입력하세요';
  } else if (action === 'close-search') closeMenus();
  else if (action === 'format-confirm') { dialog.close(); editor.focus(); setDirty(); }
  else if (action === 'export-confirm') { dialog.close(); statusText.textContent = '내보내기 형식 선택됨'; }
  else if (panels[action]) showDialog(...panels[action]);
});
document.querySelectorAll('[data-format]').forEach(control => {
  control.addEventListener(control.tagName === 'SELECT' ? 'change' : 'click', () => {
    if (control.tagName === 'BUTTON') control.setAttribute('aria-pressed', control.getAttribute('aria-pressed') !== 'true' ? 'true' : 'false');
    editor.focus();
  });
});
document.querySelector('#zoom').addEventListener('change', event => {
  editor.style.fontSize = `${16 * Number(event.target.value)}px`;
});
const state = new URLSearchParams(location.search).get('state');
const stateMap = {
  error: ['저장하지 못했습니다. 작성한 내용은 이 화면에 남아 있습니다.', '다시 저장'],
  permission: ['편집 권한이 변경되었습니다. 내용을 확인할 수 있습니다.', '문서 정보'],
  stale: ['다른 버전이 있습니다. 작성한 내용을 확인한 뒤 버전을 비교하세요.', '버전 기록'],
  loading: ['문서를 불러오는 중입니다.', '불러오기 취소']
};
if (stateMap[state]) {
  document.querySelector('#state-notice').hidden = false;
  document.querySelector('#state-message').textContent = stateMap[state][0];
  const recovery = document.querySelector('#recovery-button');
  recovery.textContent = stateMap[state][1];
  if (state === 'error') { statusText.textContent = '저장 실패'; recovery.onclick = save; }
  if (state === 'permission') { statusText.textContent = '읽기 전용'; editor.contentEditable = 'false'; titleInput.readOnly = true; saveButton.disabled = true; recovery.onclick = () => showDialog(...panels.info); }
  if (state === 'stale') { statusText.textContent = '버전 확인 필요'; recovery.onclick = () => showDialog(...panels.history); }
  if (state === 'loading') { statusText.textContent = '불러오는 중…'; recovery.onclick = () => location.href = 'empty.html'; }
}
