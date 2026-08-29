import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const CLASSIFICATIONS = ['6A', '5A', '4A', '3A', '2A', 'A']

export default function Admin() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCheckingSession(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (checkingSession) return null
  return session ? <AdminHome /> : <Login />
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Enter your email and password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="flex justify-center p-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm mt-12">
        <h1 className="text-xl font-medium mb-4">Admin login</h1>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 mb-2 w-full text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 mb-2 w-full text-sm"
        />
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 text-white rounded px-4 py-2 text-sm w-full disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function AdminHome() {
  const [tab, setTab] = useState('single') // 'single' | 'bulk' | 'schools'

  return (
    <div className="flex justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-baseline mb-4">
          <h1 className="text-xl font-medium m-0">Admin</h1>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-500 hover:text-blue-700"
          >
            Sign out
          </button>
        </div>

        <div className="flex gap-1 mb-5 border-b border-gray-200">
          <TabButton active={tab === 'single'} onClick={() => setTab('single')}>
            Enter one result
          </TabButton>
          <TabButton active={tab === 'bulk'} onClick={() => setTab('bulk')}>
            Paste results
          </TabButton>
          <TabButton active={tab === 'schools'} onClick={() => setTab('schools')}>
            Schools
          </TabButton>
        </div>

        {tab === 'single' && <ResultEntryForm />}
        {tab === 'bulk' && <BulkPasteForm />}
        {tab === 'schools' && <SchoolManager />}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-3 py-2 border-b-2 -mb-px ${
        active ? 'border-blue-700 text-blue-700 font-medium' : 'border-transparent text-gray-500'
      }`}
    >
      {children}
    </button>
  )
}

// Accepts "15:42.10" or "15:42" and returns total seconds, or null if invalid
function parseTime(input) {
  const match = input.trim().match(/^(\d{1,2}):([0-5]\d)(\.\d{1,2})?$/)
  if (!match) return null
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  const fraction = match[3] ? parseFloat(match[3]) : 0
  return minutes * 60 + seconds + fraction
}

function ResultEntryForm() {
  const [schools, setSchools] = useState([])
  const [schoolChoice, setSchoolChoice] = useState('')
  const [newSchoolName, setNewSchoolName] = useState('')
  const [athleteName, setAthleteName] = useState('')
  const [grade, setGrade] = useState('9')
  const [gender, setGender] = useState('boys')
  const [classification, setClassification] = useState('5A')
  const [timeInput, setTimeInput] = useState('')
  const [meetName, setMeetName] = useState('')
  const [meetDate, setMeetDate] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSchools()
  }, [])

  async function fetchSchools() {
    const { data, error } = await supabase.from('xc_schools').select('id, name').order('name')
    if (!error) setSchools(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!athleteName.trim()) {
      setError('Enter the athlete\u2019s name.')
      return
    }
    if (!schoolChoice && !newSchoolName.trim()) {
      setError('Choose a school or enter a new one.')
      return
    }
    const timeSeconds = parseTime(timeInput)
    if (timeSeconds === null) {
      setError('Enter time as mm:ss or mm:ss.ss, e.g. 15:42.10')
      return
    }

    setSubmitting(true)

    let schoolId = schoolChoice
    if (!schoolId) {
      const { data: newSchool, error: schoolErr } = await supabase
        .from('xc_schools')
        .insert({ name: newSchoolName.trim(), classification })
        .select('id')
        .single()
      if (schoolErr) {
        setError(`Could not create school: ${schoolErr.message}`)
        setSubmitting(false)
        return
      }
      schoolId = newSchool.id
      fetchSchools()
    }

    const { error: insertErr } = await supabase.from('xc_results').insert({
      athlete_name: athleteName.trim(),
      school_id: schoolId,
      grade: parseInt(grade, 10),
      gender,
      classification,
      event_type: '5K',
      time_seconds: timeSeconds,
      meet_name: meetName.trim() || null,
      meet_date: meetDate || null,
    })

    setSubmitting(false)

    if (insertErr) {
      setError(`Could not save result: ${insertErr.message}`)
      return
    }

    setSuccess(`Saved ${athleteName.trim()}'s time.`)
    setAthleteName('')
    setTimeInput('')
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <label className="block text-xs text-gray-500 mb-1">Athlete name</label>
      <input
        type="text"
        value={athleteName}
        onChange={(e) => setAthleteName(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 mb-3 w-full text-sm"
      />

      <label className="block text-xs text-gray-500 mb-1">School</label>
      <select
        value={schoolChoice}
        onChange={(e) => setSchoolChoice(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 mb-2 w-full text-sm"
      >
        <option value="">Add a new school below\u2026</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {!schoolChoice && (
        <input
          type="text"
          placeholder="New school name"
          value={newSchoolName}
          onChange={(e) => setNewSchoolName(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 mb-3 w-full text-sm"
        />
      )}

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Grade</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
          >
            <option value="9">9</option>
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
          >
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Class</label>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
          >
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="block text-xs text-gray-500 mb-1">Time (mm:ss.ss)</label>
      <input
        type="text"
        placeholder="15:42.10"
        value={timeInput}
        onChange={(e) => setTimeInput(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 mb-3 w-full text-sm"
      />

      <label className="block text-xs text-gray-500 mb-1">Meet name (optional)</label>
      <input
        type="text"
        value={meetName}
        onChange={(e) => setMeetName(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 mb-3 w-full text-sm"
      />

      <label className="block text-xs text-gray-500 mb-1">Meet date (optional)</label>
      <input
        type="date"
        value={meetDate}
        onChange={(e) => setMeetDate(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 mb-4 w-full text-sm"
      />

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {success && <p className="text-sm text-green-700 mb-3">{success}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-700 text-white rounded px-4 py-2 text-sm w-full disabled:opacity-50"
      >
        {submitting ? 'Saving...' : 'Save result'}
      </button>
    </form>
  )
}

// PLACEHOLDER: parsing logic depends on your copy/paste source format.
// Once you share a sample block of pasted text, this function gets replaced
// with real column parsing (name / grade / school / time, in whatever order
// and spacing your source actually uses).
function parsePastedText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return lines.map((line, i) => ({
    lineNumber: i + 1,
    raw: line,
    athlete_name: null,
    grade: null,
    school_name: null,
    time_seconds: null,
    error: 'Parser not yet configured for your results format',
  }))
}

function BulkPasteForm() {
  const [pastedText, setPastedText] = useState('')
  const [gender, setGender] = useState('boys')
  const [classification, setClassification] = useState('5A')
  const [meetName, setMeetName] = useState('')
  const [meetDate, setMeetDate] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  function handlePreview() {
    setSaveError('')
    setSaveSuccess('')
    setParsedRows(parsePastedText(pastedText))
  }

  async function handleSaveAll() {
    setSaving(true)
    setSaveError('')
    const validRows = parsedRows.filter((r) => !r.error)
    let savedCount = 0

    for (const row of validRows) {
      // Look up or create the school
      let { data: school } = await supabase
        .from('xc_schools')
        .select('id')
        .eq('name', row.school_name)
        .single()

      if (!school) {
        const { data: newSchool, error: schoolErr } = await supabase
          .from('xc_schools')
          .insert({ name: row.school_name, classification })
          .select('id')
          .single()
        if (schoolErr) continue
        school = newSchool
      }

      const { error: insertErr } = await supabase.from('xc_results').insert({
        athlete_name: row.athlete_name,
        school_id: school.id,
        grade: row.grade,
        gender,
        classification,
        event_type: '5K',
        time_seconds: row.time_seconds,
        meet_name: meetName.trim() || null,
        meet_date: meetDate || null,
      })
      if (!insertErr) savedCount += 1
    }

    setSaving(false)
    setSaveSuccess(`Saved ${savedCount} of ${validRows.length} result(s).`)
    setParsedRows([])
    setPastedText('')
  }

  return (
    <div className="max-w-2xl">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
          >
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Class</label>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
          >
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Meet name (optional)</label>
          <input
            type="text"
            value={meetName}
            onChange={(e) => setMeetName(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Meet date (optional)</label>
          <input
            type="date"
            value={meetDate}
            onChange={(e) => setMeetDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
          />
        </div>
      </div>

      <label className="block text-xs text-gray-500 mb-1">Paste results</label>
      <textarea
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
        rows={10}
        placeholder="Paste a block of results here..."
        className="border border-gray-300 rounded px-3 py-2 mb-3 w-full text-sm font-mono"
      />

      <button
        type="button"
        onClick={handlePreview}
        disabled={!pastedText.trim()}
        className="bg-gray-100 text-gray-700 rounded px-4 py-2 text-sm mb-4 disabled:opacity-50"
      >
        Preview
      </button>

      {parsedRows.length > 0 && (
        <div className="mb-4">
          <table className="w-full border-collapse text-sm mb-3">
            <thead>
              <tr>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Line</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Athlete</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">School</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Time</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.map((r) => (
                <tr key={r.lineNumber} className={`border-t border-gray-200 ${r.error ? 'bg-red-50' : ''}`}>
                  <td className="py-1.5">{r.lineNumber}</td>
                  <td className="py-1.5">{r.athlete_name || '—'}</td>
                  <td className="py-1.5">{r.school_name || '—'}</td>
                  <td className="py-1.5">{r.time_seconds ?? '—'}</td>
                  <td className="py-1.5 text-xs">
                    {r.error ? <span className="text-red-600">{r.error}</span> : <span className="text-green-700">Ready</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || parsedRows.every((r) => r.error)}
            className="bg-blue-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Save ${parsedRows.filter((r) => !r.error).length} valid result(s)`}
          </button>
        </div>
      )}

      {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
      {saveSuccess && <p className="text-sm text-green-700 mb-3">{saveSuccess}</p>}
    </div>
  )
}

function SchoolManager() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [bulkNames, setBulkNames] = useState('')
  const [defaultClassification, setDefaultClassification] = useState('5A')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')
  const [adding, setAdding] = useState(false)
  const [savingRowId, setSavingRowId] = useState(null)

  useEffect(() => {
    fetchSchools()
  }, [])

  async function fetchSchools() {
    setLoading(true)
    const { data, error } = await supabase
      .from('xc_schools')
      .select('id, name, classification')
      .order('classification')
      .order('name')
    if (error) setError(error.message)
    setSchools(data || [])
    setLoading(false)
  }

  // Each line is a school name. Optionally override the default classification
  // for that line by adding a comma, e.g. "Duncan, 5A" — otherwise the
  // dropdown's classification is used for every line.
  function parseBulkSchools(text) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [namePart, classPart] = line.split(',').map((s) => s.trim())
        const classification =
          classPart && CLASSIFICATIONS.includes(classPart.toUpperCase())
            ? classPart.toUpperCase()
            : defaultClassification
        return { name: namePart, classification }
      })
  }

  async function handleAddBulk(e) {
    e.preventDefault()
    setError('')
    setSummary('')

    const rows = parseBulkSchools(bulkNames)
    if (rows.length === 0) {
      setError('Enter at least one school name.')
      return
    }

    setAdding(true)
    const existingNames = new Set(schools.map((s) => s.name.toLowerCase()))
    let added = 0
    let skipped = 0
    const failures = []

    for (const row of rows) {
      if (existingNames.has(row.name.toLowerCase())) {
        skipped += 1
        continue
      }
      const { error: insertErr } = await supabase
        .from('xc_schools')
        .insert({ name: row.name, classification: row.classification })
      if (insertErr) {
        failures.push(`${row.name}: ${insertErr.message}`)
      } else {
        added += 1
        existingNames.add(row.name.toLowerCase())
      }
    }

    setAdding(false)
    setSummary(
      `Added ${added} school(s).` +
        (skipped ? ` Skipped ${skipped} already in the list.` : '') +
        (failures.length ? ` ${failures.length} failed.` : '')
    )
    if (failures.length) setError(failures.join('; '))
    setBulkNames('')
    fetchSchools()
  }

  async function handleClassificationChange(schoolId, classification) {
    setSavingRowId(schoolId)
    const { error: updateErr } = await supabase
      .from('xc_schools')
      .update({ classification })
      .eq('id', schoolId)
    setSavingRowId(null)
    if (updateErr) {
      setError(`Could not update classification: ${updateErr.message}`)
      return
    }
    fetchSchools()
  }

  return (
    <div className="max-w-lg">
      <form onSubmit={handleAddBulk} className="mb-5">
        <label className="block text-xs text-gray-500 mb-1">Default classification for this batch</label>
        <select
          value={defaultClassification}
          onChange={(e) => setDefaultClassification(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm mb-2 w-40"
        >
          {CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="block text-xs text-gray-500 mb-1">School names, one per line</label>
        <textarea
          value={bulkNames}
          onChange={(e) => setBulkNames(e.target.value)}
          rows={6}
          placeholder={'Duncan\nArdmore\nElk City, 4A'}
          className="border border-gray-300 rounded px-3 py-2 mb-1 w-full text-sm font-mono"
        />
        <p className="text-xs text-gray-400 mb-3">
          Every line uses the classification above by default. Add a comma and a different
          classification on a line to override it just for that school (e.g. "Elk City, 4A").
        </p>

        <button
          type="submit"
          disabled={adding || !bulkNames.trim()}
          className="bg-blue-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {adding ? 'Adding...' : 'Add schools'}
        </button>
      </form>

      {summary && <p className="text-sm text-green-700 mb-3">{summary}</p>}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading schools...</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-gray-400 font-normal py-1">School</th>
              <th className="text-left text-xs text-gray-400 font-normal py-1 w-24">Class</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr key={s.id} className="border-t border-gray-200">
                <td className="py-1.5">{s.name}</td>
                <td className="py-1.5">
                  <select
                    value={s.classification}
                    onChange={(e) => handleClassificationChange(s.id, e.target.value)}
                    disabled={savingRowId === s.id}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {CLASSIFICATIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
