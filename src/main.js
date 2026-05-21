const COLORS = ['#5C4033','#C4856A','#8B6F52','#7A8C6E','#9B7B6E','#6B8E7B','#A08060','#8E6B7A']

// ── 상태 ──────────────────────────────────────────────
let db = JSON.parse(localStorage.getItem('mixtune_v3') || '{"users":[],"tracks":{}}')
let currentUserId = localStorage.getItem('mixtune_current') || null

function save() { localStorage.setItem('mixtune_v3', JSON.stringify(db)) }
function saveSession() {
  if (currentUserId) localStorage.setItem('mixtune_current', currentUserId)
  else localStorage.removeItem('mixtune_current')
}
const currentUser = () => db.users.find(u => u.id === currentUserId) || null

// ── iTunes API ────────────────────────────────────────
async function searchItunes(q) {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=8&country=KR`)
  return (await res.json()).results
}
const bigArt = url => url?.replace('100x100bb','600x600bb') || ''

// ── 히어로 배경 ───────────────────────────────────────
async function loadHero() {
  try {
    const r = await searchItunes('wave to earth')
    const img = bigArt(r[0]?.artworkUrl100)
    if (img) document.getElementById('hero-bg').style.backgroundImage = `url(${img})`
  } catch {}
}

// ── 검색 ─────────────────────────────────────────────
let timer = null
const searchInput = document.getElementById('search-input')
const searchResults = document.getElementById('search-results')

searchInput.addEventListener('input', () => {
  clearTimeout(timer)
  const q = searchInput.value.trim()
  if (!q) { searchResults.style.display = 'none'; return }
  timer = setTimeout(() => doSearch(q), 350)
})
searchInput.addEventListener('blur', () => setTimeout(() => { searchResults.style.display = 'none' }, 160))
searchInput.addEventListener('focus', () => { if (searchResults.innerHTML) searchResults.style.display = 'block' })
searchInput.addEventListener('keydown', e => e.key === 'Escape' && (searchResults.style.display = 'none'))

async function doSearch(q) {
  try { renderResults(await searchItunes(q)) } catch {}
}

function renderResults(tracks) {
  if (!tracks.length) {
    searchResults.innerHTML = `<p style="padding:16px;text-align:center;color:rgba(139,111,82,0.5);font-size:13px">결과가 없어</p>`
  } else {
    window._searchTracks = tracks
    searchResults.innerHTML = tracks.map(t => `
      <div class="result-item fade-in" style="display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;transition:background 0.15s"
        onclick="addCurrentTrack(${t.trackId})">
        ${t.artworkUrl100 ? `<img src="${t.artworkUrl100.replace('100x100bb','60x60bb')}" style="width:38px;height:38px;border-radius:7px;object-fit:cover;flex-shrink:0">` : ''}
        <div style="min-width:0;flex:1">
          <p style="font-size:13px;color:#5C4033;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.trackName}</p>
          <p style="font-size:11px;color:rgba(139,111,82,0.65);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.artistName}</p>
        </div>
        <span style="font-size:11px;color:rgba(139,111,82,0.45)">+ 추가</span>
      </div>
    `).join('')
  }
  searchResults.style.display = 'block'
}

window.addCurrentTrack = function(trackId) {
  const u = currentUser()
  if (!u) { showToast('로그인 후 추가할 수 있어'); showLoginOverlay(); return }
  const track = window._searchTracks?.find(t => t.trackId === trackId)
  if (!track) return
  if (!(db.tracks[u.id] || []).some(t => t.trackId === trackId)) {
    track.addedAt = Date.now()
    db.tracks[u.id] = [track, ...(db.tracks[u.id] || [])]
    save()
    renderAll()
  }
  searchResults.style.display = 'none'
  searchInput.value = ''
}

window.removeTrack = function(userId, trackId) {
  db.tracks[userId] = (db.tracks[userId] || []).filter(t => t.trackId !== trackId)
  save()
  renderAll()
}

// ── 로그인 오버레이 ───────────────────────────────────
window.showLoginOverlay = function showLoginOverlay() {
  const overlay = document.getElementById('login-overlay')
  const body = document.getElementById('login-body')
  const title = document.getElementById('login-title')
  overlay.style.display = 'flex'

  if (!db.users.length) {
    // 첫 사용자 생성 화면
    title.textContent = '시작하기'
    body.innerHTML = `
      <p style="font-size:13px;color:rgba(139,111,82,0.7);margin-bottom:16px">첫 번째 사용자를 만들어봐</p>
      <input id="login-name" type="text" placeholder="이름 또는 아이디" class="input-base mb-3" />
      <input id="login-pin" type="password" placeholder="비밀번호 (숫자 4자리)" maxlength="4" class="input-base mb-5" />
      <button onclick="createFirstUser()" class="pill-btn text-cream" style="background:#5C4033">시작하기</button>
    `
    document.getElementById('login-name').focus()
    document.getElementById('login-pin').addEventListener('keydown', e => e.key === 'Enter' && createFirstUser())
  } else {
    // 사용자 선택 로그인
    title.textContent = '로그인'
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        ${db.users.map(u => `
          <button onclick="selectLoginUser('${u.id}')"
            style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:#E8D9C0;border:1px solid rgba(201,185,154,0.4);cursor:pointer;transition:border-color 0.15s;text-align:left"
            onmouseover="this.style.borderColor='${u.color}'" onmouseout="this.style.borderColor='rgba(201,185,154,0.4)'">
            <span style="width:10px;height:10px;border-radius:50%;background:${u.color};flex-shrink:0"></span>
            <span style="font-size:14px;color:#5C4033">${u.name}</span>
          </button>
        `).join('')}
      </div>
      <div id="pin-section" style="display:none">
        <input id="login-pin-input" type="password" placeholder="비밀번호" maxlength="4" class="input-base mb-3" />
        <button id="login-confirm-btn" onclick="confirmLogin()" class="pill-btn text-cream mb-2" style="background:#5C4033">로그인</button>
        <button onclick="showLoginOverlay()" class="pill-btn text-bark" style="border:1px solid rgba(201,185,154,0.6);background:transparent">뒤로</button>
      </div>
    `
  }
}

let loginTargetId = null
window.selectLoginUser = function(userId) {
  loginTargetId = userId
  document.getElementById('pin-section').style.display = 'block'
  document.getElementById('login-pin-input').focus()
  document.getElementById('login-pin-input').addEventListener('keydown', e => e.key === 'Enter' && confirmLogin())
}

window.confirmLogin = function() {
  const u = db.users.find(u => u.id === loginTargetId)
  if (!u) return
  const pin = document.getElementById('login-pin-input').value
  if (u.pin && pin !== u.pin) {
    document.getElementById('login-pin-input').style.borderColor = '#C4856A'
    document.getElementById('login-pin-input').placeholder = '비밀번호가 틀렸어'
    document.getElementById('login-pin-input').value = ''
    return
  }
  currentUserId = u.id
  saveSession()
  document.getElementById('login-overlay').style.display = 'none'
  renderHeader()
  renderAll()
}

window.createFirstUser = function() {
  const name = document.getElementById('login-name').value.trim()
  const pin = document.getElementById('login-pin').value.trim()
  if (!name) return
  const u = { id: Date.now().toString(), name, pin, color: COLORS[0] }
  db.users.push(u)
  db.tracks[u.id] = []
  save()
  currentUserId = u.id
  saveSession()
  document.getElementById('login-overlay').style.display = 'none'
  renderHeader()
  renderAll()
}

// ── 사용자 추가 ───────────────────────────────────────
window.openAddUser = function() {
  document.getElementById('add-user-overlay').style.display = 'flex'
  document.getElementById('new-name').value = ''
  document.getElementById('new-pin').value = ''
  document.getElementById('new-name').focus()
}
window.closeAddUser = function() {
  document.getElementById('add-user-overlay').style.display = 'none'
}
document.getElementById('new-pin').addEventListener('keydown', e => e.key === 'Enter' && confirmAddUser())

window.confirmAddUser = function() {
  const name = document.getElementById('new-name').value.trim()
  const pin = document.getElementById('new-pin').value.trim()
  if (!name) return
  const u = {
    id: Date.now().toString(), name, pin,
    color: COLORS[db.users.length % COLORS.length],
  }
  db.users.push(u)
  db.tracks[u.id] = []
  save()
  closeAddUser()
  renderAll()
}

window.logout = function() {
  currentUserId = null
  saveSession()
  renderHeader()
  renderAll()
  showLoginOverlay()
}

window.removeUser = function(userId) {
  if (!confirm('이 사용자를 삭제할까?')) return
  db.users = db.users.filter(u => u.id !== userId)
  delete db.tracks[userId]
  save()
  if (currentUserId === userId) { currentUserId = null; saveSession(); showLoginOverlay() }
  renderHeader()
  renderAll()
}

// ── 토스트 ────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div')
  t.textContent = msg
  t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#5C4033;color:#F2EAD9;padding:10px 20px;border-radius:999px;font-size:13px;z-index:999;opacity:0;transition:opacity 0.2s'
  document.body.appendChild(t)
  requestAnimationFrame(() => { t.style.opacity = '1' })
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300) }, 2200)
}

// ── 헤더 렌더링 ───────────────────────────────────────
function renderHeader() {
  const el = document.getElementById('header-right')
  const u = currentUser()
  if (u) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:${u.color};display:inline-block"></span>
        <span style="font-size:13px;color:#5C4033">${u.name}</span>
      </div>
      <button onclick="openAddUser()" style="font-size:12px;color:#8B6F52;border:1px solid rgba(201,185,154,0.6);padding:4px 12px;border-radius:999px;cursor:pointer;background:transparent" onmouseover="this.style.borderColor='#8B6F52'" onmouseout="this.style.borderColor='rgba(201,185,154,0.6)'">+ 사용자</button>
      <button onclick="logout()" style="font-size:12px;color:rgba(139,111,82,0.55);cursor:pointer;background:none;border:none">로그아웃</button>
    `
  } else {
    el.innerHTML = `
      <button onclick="showLoginOverlay()" style="font-size:12px;color:#5C4033;border:1px solid rgba(92,64,51,0.4);padding:4px 14px;border-radius:999px;cursor:pointer;background:transparent" onmouseover="this.style.background='#E8D9C0'" onmouseout="this.style.background='transparent'">로그인</button>
    `
  }
}

// ── 카드 렌더링 ───────────────────────────────────────
function renderCard(track, userId, color) {
  const img = bigArt(track.artworkUrl100)
  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(track.trackName + ' ' + track.artistName)}`
  const isMine = userId === currentUserId

  const card = document.createElement('div')
  card.className = 'fade-in'
  card.style.cssText = 'border-radius:16px;overflow:hidden;background:#E8D9C0;border:1px solid rgba(201,185,154,0.4)'
  card.innerHTML = `
    <div style="display:flex">
      ${img ? `<img src="${img}" style="width:86px;height:86px;object-fit:cover;flex-shrink:0">` : ''}
      <div style="padding:11px 13px;flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
          <div style="min-width:0">
            <p style="font-size:13px;color:#5C4033;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${track.trackName}</p>
            <p style="font-size:11px;color:rgba(139,111,82,0.65);margin-top:2px">${track.artistName}</p>
          </div>
          ${isMine ? `
            <button onclick="removeTrack('${userId}',${track.trackId})"
              style="color:rgba(139,111,82,0.3);font-size:16px;cursor:pointer;background:none;border:none;padding:0;flex-shrink:0"
              onmouseover="this.style.color='#C4856A'" onmouseout="this.style.color='rgba(139,111,82,0.3)'">×</button>
          ` : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          ${track.previewUrl
            ? `<audio controls src="${track.previewUrl}" style="height:26px;flex:1;min-width:0;accent-color:${color}"></audio>`
            : `<span style="font-size:11px;color:rgba(139,111,82,0.35)">미리듣기 없음</span>`
          }
          <a href="${spotifyUrl}" target="_blank"
            style="font-size:10px;color:rgba(139,111,82,0.5);text-decoration:none;border:1px solid rgba(139,111,82,0.2);padding:3px 8px;border-radius:999px;white-space:nowrap;flex-shrink:0"
            onmouseover="this.style.color='#5C4033'" onmouseout="this.style.color='rgba(139,111,82,0.5)'">Spotify ↗</a>
        </div>
      </div>
    </div>
  `
  return card
}

// ── 전체 렌더링 ───────────────────────────────────────
function renderAll() {
  const grid = document.getElementById('users-grid')
  const noUsers = document.getElementById('no-users')
  const togetherSection = document.getElementById('together-section')
  const feedTogether = document.getElementById('feed-together')

  if (!db.users.length) {
    grid.innerHTML = ''
    noUsers.style.display = 'block'
    togetherSection.style.display = 'none'
    return
  }
  noUsers.style.display = 'none'

  const cols = Math.min(db.users.length, 3)
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`
  grid.innerHTML = ''

  db.users.forEach(u => {
    const tracks = db.tracks[u.id] || []
    const isMe = u.id === currentUserId
    const col = document.createElement('div')

    col.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:10px;height:10px;border-radius:50%;background:${u.color}"></span>
          <span style="color:${u.color};font-size:14px">${u.name}${isMe ? ' (나)' : ''}</span>
          ${tracks.length ? `<span style="color:rgba(139,111,82,0.4);font-size:11px">${tracks.length}곡</span>` : ''}
        </div>
        <button onclick="removeUser('${u.id}')"
          style="color:rgba(139,111,82,0.25);font-size:12px;cursor:pointer;background:none;border:none"
          onmouseover="this.style.color='#C4856A'" onmouseout="this.style.color='rgba(139,111,82,0.25)'">삭제</button>
      </div>
    `

    const feed = document.createElement('div')
    feed.style.cssText = 'display:flex;flex-direction:column;gap:10px'

    if (!tracks.length) {
      feed.innerHTML = `<p style="color:rgba(139,111,82,0.4);font-size:13px;text-align:center;padding:32px 0">${isMe ? '검색해서 곡을 추가해봐' : '아직 곡이 없어'}</p>`
    } else {
      tracks.forEach(t => feed.appendChild(renderCard(t, u.id, u.color)))
    }
    col.appendChild(feed)
    grid.appendChild(col)
  })

  // 함께 듣는 중
  const all = db.users.flatMap(u => (db.tracks[u.id] || []).map(t => ({ ...t, _uid: u.id, _color: u.color })))
  if (all.length >= 2 && db.users.length >= 2) {
    togetherSection.style.display = 'block'
    feedTogether.innerHTML = ''
    all.sort((a, b) => b.addedAt - a.addedAt).forEach(t => feedTogether.appendChild(renderCard(t, t._uid, t._color)))
  } else {
    togetherSection.style.display = 'none'
  }
}

// ── 초기화 ────────────────────────────────────────────
loadHero()

// 이전 세션 유효하면 자동 로그인, 아니면 그냥 구경 모드
if (!currentUserId || !db.users.find(u => u.id === currentUserId)) {
  currentUserId = null
  saveSession()
}

document.getElementById('login-overlay').style.display = 'none'
renderHeader()
renderAll()
