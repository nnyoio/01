// ── JSONBin 설정 ───────────────────────────────────────
// 1. jsonbin.io 가입 → API Keys에서 Master Key 복사
// 2. Create Bin → 이름 hiraeth, 내용 {"users":[],"lib":{}} → 생성
// 3. Bin URL의 ID 부분 복사 (https://api.jsonbin.io/v3/b/여기)
const BIN_ID  = '여기에_BIN_ID_입력'
const BIN_KEY = '여기에_MASTER_KEY_입력'

const BIN_URL    = `https://api.jsonbin.io/v3/b/${BIN_ID}`
const REMOTE_ON  = !BIN_ID.includes('여기에')

async function remoteGet() {
  if (!REMOTE_ON) return null
  try {
    const r = await fetch(`${BIN_URL}/latest?meta=false`, {
      headers: { 'X-Master-Key': BIN_KEY }
    })
    return r.ok ? await r.json() : null
  } catch { return null }
}

function remotePut(data) {
  if (!REMOTE_ON) return Promise.resolve()
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

  // 내 라이브러리는 로컬 우선
  if (currentUid && local.lib?.[currentUid]) {
    merged.lib[currentUid] = local.lib[currentUid]
  }
  // 로컬에만 있는 라이브러리 보존
  for (const [id, lib] of Object.entries(local.lib || {})) {
    if (!merged.lib[id]) merged.lib[id] = lib
  }

  return merged
}
