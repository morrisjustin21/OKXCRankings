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
    return \`\${m}:\${s.padStart(5, '0')}\`
  }

  return (
    <div className="flex justify-center p-6 print:p-0 print:bg-white">
      <div className="w-full max-w-3xl">
        {/* Header band (screen only) */}
        <div className="bg-red-950/40 border border-red-900/40 rounded-xl px-5 py-4 mb-4 print:hidden">
          <p className="text-xs text-red-400 mb-0.5">Oklahoma</p>
          <h1 className="text-xl font-medium text-red-400 m-0">Cross country rankings</h1>
        </div>

        {/* Print-only header — filters are hidden when printing, so restate
            what's being printed here since it won't otherwise be visible. */}
        <div className="hidden print:block mb-4">
          <p className="text-xs text-gray-500 mb-0.5">Oklahoma Cross Country Rankings</p>
          <h1 className="text-xl font-medium m-0 text-black">
            {gender === 'boys' ? 'Boys' : 'Girls'} {classification} · 5K
          </h1>
          <p className="text-xs text-gray-500 mt-1">Printed {new Date().toLocaleDateString()}</p>
        </div>

        {/* Filter bar (screen only) */}
        <div className="print:hidden flex flex-wrap items-center gap-x-6 gap-y-3 pb-4 mb-4 border-b border-gray-800">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Gender</p>
            <div className="flex gap-1">
              <button
                onClick={() => setGender('boys')}
                className={\`text-sm rounded px-3 py-1 whitespace-nowrap \${
                  gender === 'boys' ? 'bg-red-950 text-red-400 font-medium' : 'text-gray-400'
                }\`}
              >
                Boys
              </button>
              <button
                onClick={() => setGender('girls')}
                className={\`text-sm rounded px-3 py-1 whitespace-nowrap \${
                  gender === 'girls' ? 'bg-red-950 text-red-400 font-medium' : 'text-gray-400'
                }\`}
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
                  className={\`text-sm rounded px-3 py-1 whitespace-nowrap \${
                    classification === c ? 'bg-red-950 text-red-400 font-medium' : 'text-gray-400'
                  }\`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results table */}
        <div className="min-w-0">
          <div className="flex items-baseline justify-between mb-2 print:hidden">
            <h2 className="text-base font-medium m-0 text-gray-100">
              {gender === 'boys' ? 'Boys' : 'Girls'} {classification} · 5K
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Top 50</span>
              <button
                onClick={() => window.print()}
                className="text-xs text-red-400 border border-red-900/50 rounded px-2 py-1 hover:bg-red-950/40"
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
                    <th className="text-left text-xs text-gray-500 font-normal py-1 pr-2 w-6 print:text-black">#</th>
                    <th className="text-left text-xs text-gray-500 font-normal py-1 pr-2 print:text-black">Athlete</th>
                    <th className="text-left text-xs text-gray-500 font-normal py-1 pr-2 print:text-black">School</th>
                    <th className="text-left text-xs text-gray-500 font-normal py-1 pr-2 w-9 print:text-black">Gr</th>
                    <th className="text-right text-xs text-gray-500 font-normal py-1 pr-2 w-[70px] print:text-black">
                      Time
                    </th>
                    <th className="text-left text-xs text-gray-500 font-normal py-1 print:text-black">Meet</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.id} className="border-t border-gray-800 print:border-gray-300 print:break-inside-avoid">
                      <td className="py-1.5 text-sm pr-2 whitespace-nowrap text-gray-100 print:text-black">{i + 1}</td>
                      <td className="py-1.5 text-sm pr-2 whitespace-nowrap text-gray-100 print:text-black">
                        {r.athlete_name}
                      </td>
                      <td className="py-1.5 text-sm text-gray-400 pr-2 whitespace-nowrap print:text-black">
                        {r.xc_schools?.name}
                      </td>
                      <td className="py-1.5 text-sm pr-2 whitespace-nowrap text-gray-100 print:text-black">{r.grade}</td>
                      <td className="py-1.5 text-sm text-right font-medium pr-2 whitespace-nowrap text-gray-100 print:text-black">
                        {formatTime(r.time_seconds)}
                      </td>
                      <td className="py-1.5 text-sm text-gray-400 whitespace-nowrap max-w-[160px] truncate print:text-black print:max-w-none print:whitespace-normal">
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
  )
}
