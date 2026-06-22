// Fire-and-forget POST to /api/amplify so global leaderboard tallies update.
// Never blocks the UI — if the call fails we just record locally.

export async function postAmplify(artist, action) {
  try {
    await fetch('/api/amplify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist: {
          name: artist.name,
          photo: artist.photo || null,
          spotifyUrl: artist.spotifyUrl || null,
        },
        action,
      }),
    })
  } catch {
    // best-effort; local count still happened
  }
}

export async function fetchRising({ limit = 20 } = {}) {
  const res = await fetch(`/api/rising?limit=${limit}`)
  if (!res.ok) throw new Error(`Couldn't load Rising (${res.status})`)
  return res.json()
}
