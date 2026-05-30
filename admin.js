const PAL = [
  {id:'film',s:'#C4856A'},{id:'academia',s:'#551F22'},{id:'candy',s:'#FF819C'},
  {id:'hydrangea',s:'#9EC0EB'},{id:'peony',s:'#BB8588'},{id:'arctic',s:'#8BA3C5'},
  {id:'vintage',s:'#CA7C4C'},{id:'ocean',s:'#B37AD4'},{id:'amber',s:'#D39858'},
  {id:'nautical',s:'#7F0303'},{id:'matcha',s:'#575527'},{id:'jungle',s:'#3EB9A8'},
]
let curPal = localStorage.getItem('mt_pal') || 'film'

function applyTheme(id) {
  document.body.classList.forEach(c => { if (c.startsWith('p-')) document.body.classList.remove(c) })
  document.body.classList.add(`p-${id}`)
  curPal = id; localStorage.setItem('mt_pal', id)
  document.querySelectorAll('.sw').forEach(e => e.classList.toggle('on', e.dataset.k === id))
  document.getElementById('hdr').style.background = ''
}
function shuffleTheme() {
  applyTheme(PAL[Math.floor(Math.random() * PAL.length)].id)
  const btn = document.getElementById('shuffle')
  if (btn) { btn.style.transform='rotate(360deg)'; setTimeout(()=>btn.style.transform='',400) }
}
function renderSwatches() {
  document.getElementById('swatches').innerHTML =
    PAL.map(p=>`<div class="sw${p.id===curPal?' on':''}" data-k="${p.id}" style="background:${p.s}" onclick="applyTheme('${p.id}')"></div>`).join('') +
    `<button id="shuffle" onclick="shuffleTheme()" style="width:24px;height:24px;border-radius:50%;border:1.5px solid var(--b);color:var(--s);font-size:13px;display:flex;align-items:center;justify-content:center;transition:transform .4s ease;margin-left:3px">↻</button>`
}

function genSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,'0')).join('')
}
async function hashPin(pin, salt) {
  if (!pin) return ''
  const enc = new TextEncoder()
  if (!salt) {
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(pin))
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
  }
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256)
  return Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('')
}

let db = JSON.parse(localStorage.getItem('mt') || '{"users":[],"lib":{}}')
const save = () => localStorage.setItem('mt', JSON.stringify(db))
const sync = () => { save(); remotePut(db) }
const uid  = localStorage.getItem('mt_uid')
const me   = () => db.users.find(u => u.id === uid) || null
const esc  = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

function toast(msg) {
  const el = document.createElement('div'); el.className='toast'; el.textContent=msg
  document.body.appendChild(el); setTimeout(()=>el.remove(),2200)
}

function renderHeader() {
  const u = me()
  document.getElementById('hdr-right').innerHTML = u
    ? `<span style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--t)">
         <span style="width:8px;height:8px;border-radius:50%;background:${u.color};display:inline-block"></span>${esc(u.name)}</span>
       <button onclick="doLogout()">로그아웃</button>`
    : ''
}
function doLogout() { localStorage.removeItem('mt_uid'); location.href='index.html' }

function renderPage() {
  const totalTracks = Object.values(db.lib).reduce((a,l)=>a+l.tracks.length,0)
  const totalPicks  = db.users.filter(u=>u.todayPick).length

  document.getElementById('page').innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat"><b>${db.users.length}</b>사용자</div>
      <div class="admin-stat"><b>${totalTracks}</b>총 트랙</div>
      <div class="admin-stat"><b>${totalPicks}</b>오늘의 추천</div>
    </div>
    <div id="user-list">
      ${db.users.map(u => userCard(u)).join('')}
    </div>`
}

function userCard(u) {
  const lib = db.lib[u.id] || {folders:[],tracks:[]}
  return `
    <div class="admin-user" id="acard-${u.id}">
      <div class="admin-user-top">
        <span class="admin-user-dot" style="background:${u.color}"></span>
        <span class="admin-user-name">${esc(u.name)}</span>
        ${u.isAdmin ? `<span class="p-badge">관리자</span>` : ''}
      </div>
      ${u.bio ? `<div class="admin-user-bio">${esc(u.bio)}</div>` : ''}
      <div class="admin-user-meta">${lib.tracks.length}트랙 · ${lib.folders.length}폴더${u.todayPick?' · ✦ 추천 중':''}</div>
      <div class="admin-btns">
        <a href="profile.html?id=${u.id}" class="admin-btn">프로필 보기</a>
        ${!u.isAdmin ? `
          <button class="admin-btn" onclick="toggleForm('${u.id}','edit')">프로필 편집</button>
          <button class="admin-btn" onclick="toggleForm('${u.id}','pw')">비밀번호 재설정</button>
          ${u.todayPick ? `<button class="admin-btn" onclick="removePick('${u.id}')">추천 내리기</button>` : ''}
          <button class="admin-btn danger" onclick="deleteUser('${u.id}')">계정 삭제</button>` : ''}
      </div>
      <div id="aform-${u.id}" style="display:none"></div>
    </div>`
}

function closeAllForms() {
  document.querySelectorAll('[id^="aform-"]').forEach(el => { el.style.display='none'; el.innerHTML='' })
}

function toggleForm(userId, type) {
  const form = document.getElementById(`aform-${userId}`)
  const isOpen = form.style.display !== 'none'
  closeAllForms()
  if (isOpen) return
  const u = db.users.find(u => u.id === userId); if (!u) return
  form.style.display = 'block'
  form.innerHTML = type === 'edit' ? editForm(u) : pwForm(userId, u.name)
}

function editForm(u) {
  return `<div class="admin-form">
    <textarea class="inp" id="ef-bio-${u.id}"      placeholder="자기소개"          maxlength="80" rows="2" style="resize:none">${esc(u.bio||'')}</textarea>
    <input class="inp"   id="ef-insta-${u.id}"     type="text" placeholder="인스타 아이디"         value="${esc(u.insta||'')}"/>
    <input class="inp"   id="ef-artist-${u.id}"    type="text" placeholder="좋아하는 아티스트"      value="${esc(u.artist||'')}"/>
    <input class="inp"   id="ef-song-${u.id}"      type="text" placeholder="좋아하는 노래"          value="${esc(u.song||'')}"/>
    <input class="inp"   id="ef-playlist-${u.id}"  type="url"  placeholder="플리 링크"             value="${esc(u.playlist||'')}"/>
    <div style="display:flex;gap:8px">
      <button class="btn-p" style="flex:1" onclick="saveEdit('${u.id}')">저장</button>
      <button class="btn-g" style="flex:1" onclick="closeAllForms()">취소</button>
    </div>
  </div>`
}

function pwForm(userId, name) {
  return `<div class="admin-form">
    <p style="font-size:12px;color:var(--s);margin-bottom:10px">${esc(name)}의 새 비밀번호</p>
    <input class="inp" id="ef-pw-${userId}" type="password" placeholder="새 비밀번호" maxlength="20"/>
    <div style="display:flex;gap:8px">
      <button class="btn-p" style="flex:1" onclick="savePw('${userId}')">재설정</button>
      <button class="btn-g" style="flex:1" onclick="closeAllForms()">취소</button>
    </div>
  </div>`
}

function saveEdit(userId) {
  const i = db.users.findIndex(u => u.id === userId); if (i < 0) return
  db.users[i].bio      = document.getElementById(`ef-bio-${userId}`).value.trim()
  db.users[i].insta    = document.getElementById(`ef-insta-${userId}`).value.trim()
  db.users[i].artist   = document.getElementById(`ef-artist-${userId}`).value.trim()
  db.users[i].song     = document.getElementById(`ef-song-${userId}`).value.trim()
  db.users[i].playlist = document.getElementById(`ef-playlist-${userId}`).value.trim()
  sync(); closeAllForms()
  const bioEl = document.querySelector(`#acard-${userId} .admin-user-bio`)
  if (bioEl) bioEl.textContent = db.users[i].bio
  else if (db.users[i].bio) {
    const top = document.querySelector(`#acard-${userId} .admin-user-top`)
    if (top) top.insertAdjacentHTML('afterend',`<div class="admin-user-bio">${esc(db.users[i].bio)}</div>`)
  }
  toast('저장됐어')
}

async function savePw(userId) {
  const raw = document.getElementById(`ef-pw-${userId}`).value
  if (!raw) { toast('비밀번호를 입력해줘'); return }
  const i = db.users.findIndex(u => u.id === userId); if (i < 0) return
  const salt = genSalt()
  db.users[i].pin  = await hashPin(raw, salt)
  db.users[i].salt = salt
  sync(); closeAllForms(); toast(`${db.users[i].name} 비밀번호 재설정 완료`)
}

function removePick(userId) {
  const i = db.users.findIndex(u => u.id === userId); if (i < 0) return
  db.users[i].todayPick = null
  sync(); renderPage(); toast(`${db.users[i].name} 추천곡 내렸어`)
}

function deleteUser(userId) {
  const u = db.users.find(u => u.id === userId); if (!u || u.isAdmin) return
  if (!confirm(`"${u.name}" 계정을 삭제할까요?`)) return
  db.users = db.users.filter(u => u.id !== userId)
  delete db.lib[userId]; sync()
  document.getElementById(`acard-${userId}`)?.remove()
  toast(`${u.name} 계정 삭제됨`)
  const totalTracks = Object.values(db.lib).reduce((a,l)=>a+l.tracks.length,0)
  document.querySelector('.admin-stats').innerHTML =
    `<div class="admin-stat"><b>${db.users.length}</b>사용자</div>
     <div class="admin-stat"><b>${totalTracks}</b>총 트랙</div>
     <div class="admin-stat"><b>${db.users.filter(u=>u.todayPick).length}</b>오늘의 추천</div>`
}

;(async () => {
  const remote = await remoteGet()
  if (remote) { db = mergeDb(db, remote, uid); save() }
  if (!me()?.isAdmin) { location.href = 'index.html'; return }
  applyTheme(curPal)
  renderSwatches()
  renderHeader()
  renderPage()
})()
