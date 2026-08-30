import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const CLASSIFICATIONS = ['6A', '5A', '4A', '3A', '2A', 'A']

export default function Rankings() {
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
    <div className="flex justify-center p-6 print:p-0">
      <div className="w-full max-w-3xl">
        {/* Header band (screen only) */}
        <div className="bg-blue-50 rounded-xl px-5 py-4 mb-4 print:hidden">
          <p className="text-xs text-blue-700 mb-0.5">Oklahoma</p>
          <h1 className="text-xl font-medium text-blue-700 m-0">Cross country rankings</h1>
        </div>

        {/* Print-only header — the sidebar filters are hidden when printing,
            so restate what's being printed here since it won't otherwise
            be visible on the page. */}
        <div className="hidden print:block mb-4">
          <p className="text-xs text-gray-500 mb-0.5">Oklahoma Cross Country Rankings</p>
          <h1 className="text-xl font-medium m-0">
            {gender === 'boys' ? 'Boys' : 'Girls'} {classification} · 5K
          </h1>
          <p className="text-xs text-gray-500 mt-1">Printed {new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex flex-col sm:grid sm:grid-cols-[140px_1fr] gap-4">
          {/* Sidebar filters (screen only) */}
          <div className="print:hidden sm:border-r border-gray-200 sm:pr-4 pb-3 sm:pb-0 border-b sm:border-b-0 border-gray-200">
            <div className="flex sm:block gap-4 sm:gap-0">
              <div>
                <p className="text-xs text-gray-400 mb-2">Gender</p>
                <div className="flex sm:block gap-1">
                  <button
                    onClick={() => setGender('boys')}
                    className={`text-left text-sm rounded px-2 py-1 mb-1 whitespace-nowrap ${
                      gender === 'boys' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'
                    }`}
                  >
                    Boys
                  </button>
                  <button
                    onClick={() => setGender('girls')}
                    className={`text-left text-sm rounded px-2 py-1 mb-1 sm:mb-4 whitespace-nowrap ${
                      gender === 'girls' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'
                    }`}
                  >
                    Girls
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2">Class</p>
                <div className="flex sm:block flex-wrap gap-1">
                  {CLASSIFICATIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setClassification(c)}
                      className={`text-left text-sm rounded px-2 py-1 mb-1 whitespace-nowrap ${
                        classification === c ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="min-w-0">
            <div className="flex items-baseline justify-between mb-2 print:hidden">
              <h2 className="text-base font-medium m-0">
                {gender === 'boys' ? 'Boys' : 'Girls'} {classification} · 5K
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Top 50</span>
                <button
                  onClick={() => window.print()}
                  className="text-xs text-blue-700 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50"
                >
                  Print
                </button>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-gray-500">No results yet for this category.</p>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1 print:overflow-visible print:mx-0 print:px-0">
                <table className="border-collapse min-w-[560px] w-full print:min-w-0">
                  <thead>
                    <tr>
                      <th className="text-left text-xs text-gray-400 font-normal py-1 pr-2 w-6 print:text-black">#</th>
                      <th className="text-left text-xs text-gray-400 font-normal py-1 pr-2 print:text-black">Athlete</th>
                      <th className="text-left text-xs text-gray-400 font-normal py-1 pr-2 print:text-black">School</th>
                      <th className="text-left text-xs text-gray-400 font-normal py-1 pr-2 w-9 print:text-black">Gr</th>
                      <th className="text-right text-xs text-gray-400 font-normal py-1 pr-2 w-[70px] print:text-black">
                        Time
                      </th>
                      <th className="text-left text-xs text-gray-400 font-normal py-1 print:text-black">Meet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.id} className="border-t border-gray-200 print:break-inside-avoid">
                        <td className="py-1.5 text-sm pr-2 whitespace-nowrap">{i + 1}</td>
                        <td className="py-1.5 text-sm pr-2 whitespace-nowrap">{r.athlete_name}</td>
                        <td className="py-1.5 text-sm text-gray-500 pr-2 whitespace-nowrap print:text-black">
                          {r.xc_schools?.name}
                        </td>
                        <td className="py-1.5 text-sm pr-2 whitespace-nowrap">{r.grade}</td>
                        <td className="py-1.5 text-sm text-right font-medium pr-2 whitespace-nowrap">
                          {formatTime(r.time_seconds)}
                        </td>
                        <td className="py-1.5 text-sm text-gray-500 whitespace-nowrap max-w-[160px] truncate print:text-black print:max-w-none print:whitespace-normal">
                          {r.meet_name || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
