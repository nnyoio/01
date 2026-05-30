if (localStorage.getItem('mt_dark') === 'true') document.body.classList.add('dark')

const ICON_MOON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
const ICON_SUN  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.93" y2="5.93"/><line x1="18.07" y1="18.07" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.93" y2="18.07"/><line x1="18.07" y1="5.93" x2="19.78" y2="4.22"/></svg>`

function toggleDark() {
  const on = document.body.classList.toggle('dark')
  localStorage.setItem('mt_dark', on ? 'true' : 'false')
  const btn = document.getElementById('darkbtn')
  if (btn) btn.innerHTML = on ? ICON_SUN : ICON_MOON
}

const BIN_URL = 'https://api.jsonbin.io/v3/b/6a19a3e0ddf5aa59f774b98e'
const BIN_KEY = '$2a$10$A4xozDf7hEofBvpQcaQzV.966f8BRivApOKjioGzuajdKzMN.raTq'

async function remoteGet() {
  try {
    const r = await fetch(`${BIN_URL}/latest?meta=false`, {
      headers: { 'X-Master-Key': BIN_KEY }
    })
    return r.ok ? await r.json() : null
  } catch { return null }
}

function remotePut(data) {
  return fetch(BIN_URL, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': BIN_KEY },
    body:    JSON.stringify(data)
  }).catch(() => {})
}

// 로컬 변경사항과 원격 데이터 병합
// 내 계정/라이브러리 → 로컬 우선, 나머지 → 원격 우선
function mergeDb(local, remote, currentUid) {
  if (!remote?.users) return local
  const merged = { lib: { ...remote.lib } }

  const allIds = new Set(remote.users.map(u => u.id))
  if (currentUid && local.users?.some(u => u.id === currentUid)) allIds.add(currentUid)

  merged.users = []
  for (const id of allIds) {
    const r = remote.users?.find(u => u.id === id)
    const l = local.users?.find(u => u.id === id)
    merged.users.push(id === currentUid ? (l || r) : (r || l))
  }

  if (currentUid && local.lib?.[currentUid]) {
    merged.lib[currentUid] = local.lib[currentUid]
  }
  for (const [id, lib] of Object.entries(local.lib || {})) {
    if (!merged.lib[id] && allIds.has(id)) merged.lib[id] = lib
  }

  return merged
}
