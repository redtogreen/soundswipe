// Cyanite — audio similarity layer.
// Goes beyond Last.fm's collaborative filtering by analyzing the actual
// audio signal (timbre, tempo, key, mood, valence, danceability).
//
// SETUP REQUIRED (Justin):
//   1. Sign up at https://cyanite.ai (free dev tier exists; paid for volume)
//   2. Get an API access token from your account dashboard
//   3. Add to Vercel env vars:
//        CYANITE_API_TOKEN=<your token>
//   4. Cyanite has a GraphQL API at https://api.cyanite.ai/graphql
//
// NOTE: This lib runs SERVER-SIDE only. The token should never reach the
// client. Use from inside Vercel serverless functions (e.g. api/artists.js)
// to enrich each result with sonic similarity data.

const CYANITE_API = 'https://api.cyanite.ai/graphql'

export function isCyaniteConfigured() {
  return Boolean(process.env.CYANITE_API_TOKEN)
}

async function cyaniteQuery(query, variables = {}) {
  if (!isCyaniteConfigured()) throw new Error('Cyanite not configured')
  const res = await fetch(CYANITE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CYANITE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Cyanite ${res.status}`)
  const data = await res.json()
  if (data.errors) throw new Error(data.errors[0]?.message || 'cyanite_error')
  return data.data
}

/**
 * Search Cyanite for a track by name/artist. Returns track ID + sonic tags.
 */
export async function findCyaniteTrack(artistName, trackName) {
  if (!isCyaniteConfigured()) return null
  const query = `
    query SearchTracks($query: String!) {
      libraryTrackSearch(query: $query, first: 1) {
        edges {
          node {
            id
            title
            artist { name }
            audioAnalysisV6 { result { genreTags subgenreTags moodTags } }
          }
        }
      }
    }
  `
  try {
    const data = await cyaniteQuery(query, { query: `${artistName} ${trackName}` })
    return data?.libraryTrackSearch?.edges?.[0]?.node || null
  } catch { return null }
}

/**
 * Get similar tracks to a seed track. Returns array of { id, title, artist }.
 * This is the actual audio-similarity move — Cyanite computes timbre + mood
 * similarity, not collaborative filtering.
 */
export async function getSimilarTracksByAudio(cyaniteTrackId, limit = 10) {
  if (!isCyaniteConfigured()) return []
  const query = `
    query Similar($id: ID!, $first: Int!) {
      libraryTrack(id: $id) {
        ... on LibraryTrack {
          similarTracks(target: { library: {} }, first: $first) {
            edges {
              node { id title artist { name } }
              musicalSimilarity { score }
            }
          }
        }
      }
    }
  `
  try {
    const data = await cyaniteQuery(query, { id: cyaniteTrackId, first: limit })
    const edges = data?.libraryTrack?.similarTracks?.edges || []
    return edges.map((e) => ({
      id: e.node.id,
      title: e.node.title,
      artist: e.node.artist?.name,
      sonicScore: e.musicalSimilarity?.score ?? null,
    }))
  } catch { return [] }
}
