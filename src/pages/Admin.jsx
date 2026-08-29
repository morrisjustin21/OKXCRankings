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
  return session ? <ResultEntryForm /> : <Login />
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

  // Accepts "15:42.10" or "15:42" and returns total seconds, or null if invalid
  function parseTime(input) {
    const match = input.trim().match(/^(\d{1,2}):([0-5]\d)(\.\d{1,2})?$/)
    if (!match) return null
    const minutes = parseInt(match[1], 10)
    const seconds = parseInt(match[2], 10)
    const fraction = match[3] ? parseFloat(match[3]) : 0
    return minutes * 60 + seconds + fraction
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
    <div className="flex justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="flex justify-between items-baseline mb-4">
          <h1 className="text-xl font-medium m-0">Enter a result</h1>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-500 hover:text-blue-700"
          >
            Sign out
          </button>
        </div>

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
    </div>
  )
}
