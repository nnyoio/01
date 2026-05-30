if (localStorage.getItem('mt_dark') === 'true') document.body.classList.add('dark')

const ICON_MOON = '☽'
const ICON_SUN  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.93" y2="5.93"/><line x1="18.07" y1="18.07" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.93" y2="18.07"/><line x1="18.07" y1="5.93" x2="19.78" y2="4.22"/></svg>`

function toggleDark() {
  const on = document.body.classList.toggle('dark')
  localStorage.setItem('mt_dark', on ? 'true' : 'false')
  const btn = document.getElementById('darkbtn')
  if (btn) btn.innerHTML = on ? ICON_SUN : ICON_MOON
}

const SB_URL = 'https://xpwiywbqvgyzmwonpjkj.supabase.co/rest/v1/store'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwd2l5d2Jxdmd5em13b25wamtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzI0OTIsImV4cCI6MjA5NTY0ODQ5Mn0.RLh3WwJh-o3cIE0reO1z68_2dZ6oVj0nDhhu5wt5_3U'
const SB_HDR = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

async function remoteGet() {
  try {
    const r = await fetch(`${SB_URL}?id=eq.1&select=data`, { headers: SB_HDR })
    const json = await r.json()
    return r.ok && json[0] ? json[0].data : null
  } catch { return null }
}

function remotePut(data) {
  return fetch(`${SB_URL}?id=eq.1`, {
    method:  'PATCH',
    headers: SB_HDR,
    body:    JSON.stringify({ data })
  }).catch(() => {})
}

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
