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

  const allIds = new Set([
    ...(remote.users || []).map(u => u.id),
    ...(local.users  || []).map(u => u.id),
  ])
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
    if (!merged.lib[id]) merged.lib[id] = lib
  }

  return merged
}
