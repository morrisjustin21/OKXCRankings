import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../supabaseClient'
import { standardEventType, eventTypeLabel } from '../eventTypeRules'

const CLASSIFICATIONS = ['6A', '5A', '4A', '3A', '2A', 'A']

// Cross country team scoring, applied to the season-best leaderboard as if
// it were one race: each athlete's rank on that leaderboard stands in for
// their finishing place. A team's score is the sum of its fastest 5
// runners' places (lower is better); a team needs 5 counted runners to
// score at all. Runners 6 and 7 are "displacers" — they don't add to the
// score but break ties, since they still occupy a place that could have
// pushed another team's runner back in a real race.
function scoreTeams(rankedResults) {
  const byTeam = new Map()
  rankedResults.forEach((r, i) => {
    const place = i + 1
    const teamName = r.xc_schools?.name || 'Unknown'
    if (!byTeam.has(teamName)) byTeam.set(teamName, [])
    byTeam.get(teamName).push({ ...r, place })
  })

  const teams = Array.from(byTeam.entries()).map(([teamName, runners]) => {
    const scorers = runners.slice(0, 5)
    const displacers = runners.slice(5, 7)
    const complete = runners.length >= 5
    const score = complete ? scorers.reduce((sum, r) => sum + r.place, 0) : null
    return { teamName, runners, scorers, displacers, complete, score }
  })

  const scoring = teams
    .filter((t) => t.complete)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      const aTie1 = a.displacers[0]?.place ?? Infinity
      const bTie1 = b.displacers[0]?.place ?? Infinity
      if (aTie1 !== bTie1) return aTie1 - bTie1
      const aTie2 = a.displacers[1]?.place ?? Infinity
      const bTie2 = b.displacers[1]?.place ?? Infinity
      return aTie2 - bTie2
    })

  const incomplete = teams.filter((t) => !t.complete).sort((a, b) => a.teamName.localeCompare(b.teamName))

  return { scoring, incomplete }
}

export default function TeamRankings() {
  const [gender, setGender] = useState('boys')
  const [classification, setClassification] = useState('5A')
  const [scoring, setScoring] = useState([])
  const [incomplete, setIncomplete] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const eventType = standardEventType(gender, classification)

  useEffect(() => {
    fetchAndScore()
  }, [gender, classification])

  async function fetchAndScore() {
    setLoading(true)
    setExpanded(null)
    const { data, error } = await supabase
      .from('xc_best_results') // deduped view: one row per athlete, season best
      .select('*, xc_schools(name)')
      .eq('gender', gender)
      .eq('classification', classification)
      .eq('event_type', standardEventType(gender, classification))
      .order('time_seconds', { ascending: true })
      .limit(1000)

    if (error) console.error(error)
    const { scoring: s, incomplete: inc } = scoreTeams(data || [])
    setScoring(s)
    setIncomplete(inc)
    setLoading(false)
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = (seconds % 60).toFixed(2)
    return `${m}:${s.padStart(5, '0')}`
  }

  return (
    <div className="flex justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="bg-red-950/40 border border-red-900/40 rounded-xl px-5 py-4 mb-4">
          <p className="text-xs text-red-400 mb-0.5">Oklahoma</p>
          <h1 className="text-xl font-medium text-red-400 m-0">Cross country team rankings</h1>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Based on each team's five fastest season-best times in this class, scored against the
          full season leaderboard as if it were one race — standard cross country scoring
          (lowest total place wins, 5 runners required to score, 6th/7th break ties).
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-4 mb-4 border-b border-gray-800">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Gender</p>
            <div className="flex gap-1">
              <button
                onClick={() => setGender('boys')}
                className={`text-sm rounded px-3 py-1 whitespace-nowrap ${
                  gender === 'boys' ? 'bg-red-950 text-red-400 font-medium' : 'text-gray-400'
                }`}
              >
                Boys
              </button>
              <button
                onClick={() => setGender('girls')}
                className={`text-sm rounded px-3 py-1 whitespace-nowrap ${
                  gender === 'girls' ? 'bg-red-950 text-red-400 font-medium' : 'text-gray-400'
                }`}
              >
                Girls
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1.5">Class</p>
            <div className="flex flex-wrap gap-1">
              {CLASSIFICATIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setClassification(c)}
                  className={`text-sm rounded px-3 py-1 whitespace-nowrap ${
                    classification === c ? 'bg-red-950 text-red-400 font-medium' : 'text-gray-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <h2 className="text-base font-medium mb-2 text-gray-100">
          {gender === 'boys' ? 'Boys' : 'Girls'} {classification} · {eventTypeLabel(eventType)} Team Scores
        </h2>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : scoring.length === 0 ? (
          <p className="text-sm text-gray-500">No teams have 5 scored runners yet in this class.</p>
        ) : (
          <table className="w-full border-collapse text-sm mb-6">
            <thead>
              <tr>
                <th className="text-left text-xs text-gray-500 font-normal py-1 w-6">#</th>
                <th className="text-left text-xs text-gray-500 font-normal py-1">Team</th>
                <th className="text-right text-xs text-gray-500 font-normal py-1">Score</th>
              </tr>
            </thead>
            <tbody>
              {scoring.map((t, i) => (
                <Fragment key={t.teamName}>
                  <tr
                    onClick={() => setExpanded(expanded === t.teamName ? null : t.teamName)}
                    className="border-t border-gray-800 cursor-pointer hover:bg-gray-800/40"
                  >
                    <td className="py-1.5">{i + 1}</td>
                    <td className="py-1.5">{t.teamName}</td>
                    <td className="py-1.5 text-right font-medium">{t.score}</td>
                  </tr>
                  {expanded === t.teamName && (
                    <tr className="border-t border-gray-800 bg-gray-800/20">
                      <td colSpan={3} className="py-2 px-2">
                        <table className="w-full text-xs">
                          <tbody>
                            {t.scorers.map((r) => (
                              <tr key={r.id}>
                                <td className="py-0.5 pr-3 text-gray-400 w-8">{r.place}</td>
                                <td className="py-0.5 pr-3">{r.athlete_name}</td>
                                <td className="py-0.5 text-right text-gray-400">{formatTime(r.time_seconds)}</td>
                              </tr>
                            ))}
                            {t.displacers.map((r) => (
                              <tr key={r.id} className="opacity-50">
                                <td className="py-0.5 pr-3 text-gray-500 w-8">{r.place}</td>
                                <td className="py-0.5 pr-3">{r.athlete_name} (displacer)</td>
                                <td className="py-0.5 text-right text-gray-500">{formatTime(r.time_seconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {incomplete.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 text-gray-400">
              Not enough runners to score (fewer than 5)
            </h3>
            <ul className="text-sm text-gray-500 space-y-1">
              {incomplete.map((t) => (
                <li key={t.teamName}>
                  {t.teamName} — {t.runners.length} runner{t.runners.length === 1 ? '' : 's'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
