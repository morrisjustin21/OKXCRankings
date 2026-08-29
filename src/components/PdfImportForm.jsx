import { useState } from 'react'
import { supabase } from '../supabaseClient'

const CLASSIFICATIONS = ['6A', '5A', '4A', '3A', '2A', 'A']

export default function PdfImportForm() {
  const [file, setFile] = useState(null)
  const [gender, setGender] = useState('boys')
  const [classification, setClassification] = useState('5A')
  const [meetName, setMeetName] = useState('')
  const [meetDate, setMeetDate] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [failures, setFailures] = useState([])
  const [importing, setImporting] = useState(false)

  // Placeholder parser — plug in your existing PDF text-extraction logic from OKTFtop10's
  // PdfImportForm.jsx here. Expected row shape: { athlete_name, school_name, grade, time_seconds }
  function parsePdfText(text) {
    const rows = []
    const errors = []
    // ... reuse your existing parsing regex/logic from track, adapted for XC result sheets
    return { rows, errors }
  }

  async function handleImport() {
    setImporting(true)
    setFailures([])

    const successes = []
    const rowFailures = []

    for (const row of parsedRows) {
      // Look up or create school
      let { data: school, error: schoolErr } = await supabase
        .from('xc_schools')
        .select('id')
        .eq('name', row.school_name)
        .single()

      if (schoolErr || !school) {
        const { data: newSchool, error: createErr } = await supabase
          .from('xc_schools')
          .insert({ name: row.school_name, classification })
          .select('id')
          .single()
        if (createErr) {
          rowFailures.push({ row, reason: `School creation failed: ${createErr.message}` })
          continue
        }
        school = newSchool
      }

      const { error: insertErr } = await supabase.from('xc_results').insert({
        athlete_name: row.athlete_name,
        school_id: school.id,
        grade: row.grade,
        gender, // passed through explicitly, same pattern as track PdfImportForm
        classification,
        event_type: '5K',
        time_seconds: row.time_seconds,
        meet_name: meetName,
        meet_date: meetDate || null,
      })

      if (insertErr) {
        rowFailures.push({ row, reason: insertErr.message })
      } else {
        successes.push(row)
      }
    }

    setFailures(rowFailures)
    setImporting(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Import Meet Results (PDF)</h2>

      <div className="flex gap-4 mb-4">
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="border rounded px-3 py-2">
          <option value="boys">Boys</option>
          <option value="girls">Girls</option>
        </select>
        <select value={classification} onChange={(e) => setClassification(e.target.value)} className="border rounded px-3 py-2">
          {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <input
        type="text"
        placeholder="Meet name"
        value={meetName}
        onChange={(e) => setMeetName(e.target.value)}
        className="border rounded px-3 py-2 mb-2 w-full"
      />
      <input
        type="date"
        value={meetDate}
        onChange={(e) => setMeetDate(e.target.value)}
        className="border rounded px-3 py-2 mb-4 w-full"
      />

      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} className="mb-4" />

      <button
        onClick={handleImport}
        disabled={importing || !parsedRows.length}
        className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {importing ? 'Importing...' : 'Import Results'}
      </button>

      {failures.length > 0 && (
        <div className="mt-4 border border-red-300 bg-red-50 p-4 rounded">
          <h3 className="font-semibold text-red-700 mb-2">{failures.length} row(s) failed:</h3>
          <ul className="text-sm text-red-600 list-disc pl-5">
            {failures.map((f, i) => (
              <li key={i}>{f.row.athlete_name || 'Unknown athlete'}: {f.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
