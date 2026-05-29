const BLOB_URL = 'https://jsonblob.com/api/jsonBlob/019e73cb-0504-75eb-a61b-e086a917642c'

async function remoteGet() {
  try {
    const r = await fetch(BLOB_URL)
    return r.ok ? await r.json() : null
  } catch { return null }
}

function remotePut(data) {
  return fetch(BLOB_URL, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
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
