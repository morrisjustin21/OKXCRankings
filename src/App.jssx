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
      .from('xc_results')
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
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6">
      <h1 className="text-3xl font-bold mb-4">OK Cross Country Rankings</h1>

      <div className="flex gap-4 mb-6">
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="border rounded px-3 py-2">
          <option value="boys">Boys</option>
          <option value="girls">Girls</option>
        </select>
        <select value={classification} onChange={(e) => setClassification(e.target.value)} className="border rounded px-3 py-2">
          {CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-2">#</th>
              <th>Athlete</th>
              <th>School</th>
              <th>Grade</th>
              <th>Time</th>
              <th>Meet</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{i + 1}</td>
                <td>{r.athlete_name}</td>
                <td>{r.xc_schools?.name}</td>
                <td>{r.grade}</td>
                <td>{formatTime(r.time_seconds)}</td>
                <td>{r.meet_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
