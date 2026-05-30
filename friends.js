const PAL = [
  {id:'t1',s:'#C4856A'},{id:'t2',s:'#8B1C22'},{id:'t3',s:'#FF819C'},
  {id:'t4',s:'#9EC0EB'},{id:'t5',s:'#BB8588'},{id:'t6',s:'#8BA3C5'},
  {id:'t7',s:'#CA7C4C'},{id:'t8',s:'#B37AD4'},{id:'t9',s:'#D39858'},
  {id:'t10',s:'#7F0303'},{id:'t11',s:'#575527'},{id:'t12',s:'#5AA371'},
]
const PAL_MIGRATE = {film:'t1',academia:'t2',candy:'t3',hydrangea:'t4',peony:'t5',arctic:'t6',vintage:'t7',ocean:'t8',amber:'t9',nautical:'t10',matcha:'t11',jungle:'t12'}
let curPal = localStorage.getItem('mt_pal') || 't1'
if (PAL_MIGRATE[curPal]) { curPal = PAL_MIGRATE[curPal]; localStorage.setItem('mt_pal', curPal) }

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
    `<button id="shuffle" onclick="shuffleTheme()" style="width:24px;height:24px;border-radius:50%;border:1.5px solid var(--b);color:var(--s);font-size:13px;display:flex;align-items:center;justify-content:center;transition:transform .4s ease;margin-left:3px">↻</button>` +
    `<button id="darkbtn" onclick="toggleDark()">${document.body.classList.contains('dark')?ICON_SUN:ICON_MOON}</button>`
}

let db = JSON.parse(localStorage.getItem('mt') || '{"users":[],"lib":{}}')
const save = () => localStorage.setItem('mt', JSON.stringify(db))
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
    : `<a href="index.html" class="login-btn" style="border:1px solid var(--bs);padding:4px 12px;border-radius:999px;color:var(--a);font-size:12px;text-decoration:none">로그인</a>`
}
function doLogout() { localStorage.removeItem('mt_uid'); location.href='index.html' }

function renderPage() {
  const others = db.users.filter(u => !u.isAdmin)
  document.getElementById('user-cards').innerHTML = others.length ? others.map(u => {
    const lib = db.lib[u.id] || {tracks:[]}
    return `<div onclick="location.href='profile.html?id=${u.id}'"
      style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--card);border:1px solid var(--b);border-radius:14px;cursor:pointer;transition:border-color .15s"
      onmouseover="this.style.borderColor='var(--bs)'" onmouseout="this.style.borderColor='var(--b)'">
      <div style="width:44px;height:44px;border-radius:50%;background:${u.color};display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;flex-shrink:0">${u.name[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:500;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u.name)}</div>
        <div style="font-size:11px;color:var(--s);margin-top:3px">${lib.tracks.length}트랙${u.todayPick?' · ✦':''}${u.libPublic===false?' · 🔒':' · 🔓'}</div>
      </div>
      <span style="font-size:18px;color:var(--s);opacity:.35">›</span>
    </div>`
  }).join('') : `<p class="empty" style="grid-column:1/-1">아직 친구가 없어</p>`
}

;(async () => {
  const remote = await remoteGet()
  if (remote) { db = mergeDb(db, remote, uid); save() }
  applyTheme(curPal)
  renderSwatches()
  renderHeader()
  renderPage()
})()
