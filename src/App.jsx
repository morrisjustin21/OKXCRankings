import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const CLASSIFICATIONS = ['6A', '5A', '4A', '3A', '2A', 'A']

export default function App() {
  const [gender, setGender] = useState('boys')
  const [classification, setClassification] = useState('5A')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchResults()
  }, [gender, classification])

  async function fetchResults() {
    setLoading(true)
    const { data, error } = await supabase
      .from('xc_best_results') // deduped view: one row per athlete
      .select('*, xc_schools(name)')
      .eq('gender', gender)
      .eq('classification', classification)
      .eq('event_type', '5K')
      .order('time_seconds', { ascending: true })
      .limit(50)

    if (error) console.error(error)
    setResults(data || [])
    setLoading(false)
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = (seconds % 60).toFixed(2)
    return `${m}:${s.padStart(5, '0')}`
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      {/* Header band */}
      <div className="bg-blue-50 rounded-xl px-5 py-4 mb-4 max-w-3xl">
        <p className="text-xs text-blue-700 mb-0.5">Oklahoma</p>
        <h1 className="text-xl font-medium text-blue-700 m-0">Cross country rankings</h1>
      </div>

      <div className="max-w-3xl grid grid-cols-[140px_1fr] gap-4">
        {/* Sidebar filters */}
        <div className="border-r border-gray-200 pr-4">
          <p className="text-xs text-gray-400 mb-2">Gender</p>
          <button
            onClick={() => setGender('boys')}
            className={`block w-full text-left text-sm rounded px-2 py-1 mb-1 ${
              gender === 'boys' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'
            }`}
          >
            Boys
          </button>
          <button
            onClick={() => setGender('girls')}
            className={`block w-full text-left text-sm rounded px-2 py-1 mb-4 ${
              gender === 'girls' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'
            }`}
          >
            Girls
          </button>

          <p className="text-xs text-gray-400 mb-2">Class</p>
          {CLASSIFICATIONS.map((c) => (
            <button
              key={c}
              onClick={() => setClassification(c)}
              className={`block w-full text-left text-sm rounded px-2 py-1 mb-1 ${
                classification === c ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Results table */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-base font-medium m-0">
              {gender === 'boys' ? 'Boys' : 'Girls'} {classification} · 5K
            </h2>
            <span className="text-xs text-gray-400">Top 50</span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500">No results yet for this category.</p>
          ) : (
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-400 font-normal py-1 w-6">#</th>
                  <th className="text-left text-xs text-gray-400 font-normal py-1">Athlete</th>
                  <th className="text-left text-xs text-gray-400 font-normal py-1">School</th>
                  <th className="text-left text-xs text-gray-400 font-normal py-1 w-9">Gr</th>
                  <th className="text-right text-xs text-gray-400 font-normal py-1 w-[70px]">Time</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.id} className="border-t border-gray-200">
                    <td className="py-1.5 text-sm">{i + 1}</td>
                    <td className="py-1.5 text-sm">{r.athlete_name}</td>
                    <td className="py-1.5 text-sm text-gray-500">{r.xc_schools?.name}</td>
                    <td className="py-1.5 text-sm">{r.grade}</td>
                    <td className="py-1.5 text-sm text-right font-medium">{formatTime(r.time_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
