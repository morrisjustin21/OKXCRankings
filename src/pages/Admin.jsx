import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const CLASSIFICATIONS = ['6A', '5A', '4A', '3A', '2A', 'A']

// Times are always stored in the database as total seconds (for correct
// sorting), but should always be displayed as mm:ss.ss — this converts back.
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(2)
  return `${m}:${s.padStart(5, '0')}`
}

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
          className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-2 w-full text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-2 w-full text-sm"
        />
        {error && <p className="text-sm text-red-300 mb-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-red-700 text-white rounded px-4 py-2 text-sm w-full disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function AdminHome() {
  const [tab, setTab] = useState('single') // 'single' | 'bulk' | 'schools' | 'manage'

  return (
    <div className="flex justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-baseline mb-4">
          <h1 className="text-xl font-medium m-0">Admin</h1>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-500 hover:text-red-400"
          >
            Sign out
          </button>
        </div>

        <div className="flex gap-1 mb-5 border-b border-gray-800">
          <TabButton active={tab === 'single'} onClick={() => setTab('single')}>
            Enter one result
          </TabButton>
          <TabButton active={tab === 'bulk'} onClick={() => setTab('bulk')}>
            Paste results
          </TabButton>
          <TabButton active={tab === 'schools'} onClick={() => setTab('schools')}>
            Schools
          </TabButton>
          <TabButton active={tab === 'manage'} onClick={() => setTab('manage')}>
            Manage results
          </TabButton>
        </div>

        {tab === 'single' && <ResultEntryForm />}
        {tab === 'bulk' && <BulkPasteForm />}
        {tab === 'schools' && <SchoolManager />}
        {tab === 'manage' && <ManageResults />}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-3 py-2 border-b-2 -mb-px ${
        active ? 'border-red-500 text-red-400 font-medium' : 'border-transparent text-gray-500'
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
        className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-3 w-full text-sm"
      />

      <label className="block text-xs text-gray-500 mb-1">School</label>
      <select
        value={schoolChoice}
        onChange={(e) => setSchoolChoice(e.target.value)}
        className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-2 w-full text-sm"
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
          className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-3 w-full text-sm"
        />
      )}

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Grade</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 w-full text-sm"
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
            className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 w-full text-sm"
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
            className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 w-full text-sm"
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
        className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-3 w-full text-sm"
      />

      <label className="block text-xs text-gray-500 mb-1">Meet name (optional)</label>
      <input
        type="text"
        value={meetName}
        onChange={(e) => setMeetName(e.target.value)}
        className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-3 w-full text-sm"
      />

      <label className="block text-xs text-gray-500 mb-1">Meet date (optional)</label>
      <input
        type="date"
        value={meetDate}
        onChange={(e) => setMeetDate(e.target.value)}
        className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-4 w-full text-sm"
      />

      {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
      {success && <p className="text-sm text-green-400 mb-3">{success}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-red-700 text-white rounded px-4 py-2 text-sm w-full disabled:opacity-50"
      >
        {submitting ? 'Saving...' : 'Save result'}
      </button>
    </form>
  )
}

// Maps the class/grade tag used in results printouts to a grade number.
// Only FR/SO/JR/SR count as high school — this is what filters OUT middle
// school and elementary rows, since those use numeric grade tags instead.
const CLASS_TO_GRADE = { FR: 9, SO: 10, JR: 11, SR: 12 }

// --- Format 1: "Duncan Invite" style ---------------------------------------
// Flat "Overall Score Bib# Name Class Chip Time Team" lines, e.g.:
//   "10 (10) 128 Ginger West FR 00:23:56.56 Duncan High School"
// Section headers (e.g. "...Large School Girls") appear BEFORE their rows.
const DUNCAN_RESULT_LINE_RE =
  /^\d+\s+\(?\d+\)?\s+\d+\s+(.+?)\s+(FR|SO|JR|SR)\s+(\d{1,2}:\d{2}:\d{2}(?:\.\d{1,2})?)\s+(.+)$/

function parseDuncanResultLine(line) {
  const match = line.trim().match(DUNCAN_RESULT_LINE_RE)
  if (!match) return null
  const [, name, classTag, chipTime, team] = match
  return {
    athlete_name: name.trim(),
    grade: CLASS_TO_GRADE[classTag],
    time_seconds: parseFlexibleTime(chipTime),
    school_name_raw: team.trim(),
  }
}

// Finds "Last[, more words], First" starting at tokens[1], where the last
// name can itself be more than one word (e.g. "Soc Batz, Andrez") — some
// rows in the same document spell a name with a space instead of a hyphen
// inconsistently, so this can't assume the comma always lands on tokens[1].
function splitCommaName(tokens, maxLastNameWords = 4) {
  const limit = Math.min(maxLastNameWords, tokens.length - 2)
  for (let end = 1; end <= limit; end++) {
    if (tokens[end].endsWith(',')) {
      const lastName = tokens
        .slice(1, end + 1)
        .join(' ')
        .replace(/,$/, '')
      return { lastName, firstName: tokens[end + 1], nextIndex: end + 2 }
    }
  }
  return null
}

// --- Format 2: "DirectAthletics MeetPro" style -----------------------------
// Lines like:
//   "1 Hines, Hadley SR Yukon 1 19:32.4 --- 6:17.0 3:54.5"
//   "2 Pierce, Wesley Bartlesville 2 20:24.6 6.7 6:33.8 4:04.9"  (no YR tag)
// Columns (from the right) are always Score, Time, Gap, Avg Mile, Avg kM;
// from the left, Place, "Last,", First — whatever's left in the middle is
// an optional grade/YR tag followed by the (possibly multi-word) team name.
// A numeric YR tag (7th/8th grade etc.) marks a junior-high row to exclude.
// Section titles carrying gender/distance appear AFTER the rows they
// describe (a page footer), not before.
function parseDAResultLine(line) {
  const tokens = line.trim().split(/\s+/)
  if (tokens.length < 9) return null
  if (!/^\d+$/.test(tokens[0])) return null

  const nameSplit = splitCommaName(tokens)
  if (!nameSplit) return null
  const { lastName, firstName, nextIndex } = nameSplit
  if (tokens.length - nextIndex < 5) return null

  const last5 = tokens.slice(-5)
  const timeToken = last5[1]
  const middle = tokens.slice(nextIndex, tokens.length - 5)
  if (middle.length === 0) return null

  let grade = null
  let teamTokens = middle
  const yrCandidate = middle[0]
  if (/^(FR|SO|JR|SR)$/i.test(yrCandidate)) {
    grade = CLASS_TO_GRADE[yrCandidate.toUpperCase()]
    teamTokens = middle.slice(1)
  } else if (/^\d{1,2}$/.test(yrCandidate)) {
    return { isJuniorHigh: true } // numeric grade tag = JH/elementary row
  }

  const school_name_raw = teamTokens.join(' ').trim()
  if (!school_name_raw) return null
  const time_seconds = parseFlexibleTime(timeToken)
  if (time_seconds === null) return null

  return { athlete_name: `${firstName} ${lastName}`.trim(), grade, school_name_raw, time_seconds }
}

// --- Format 3: "Hy-Tek Meet Manager" style ----------------------------------
// Lines like:
//   " 1 Rosales, Alexa Perryton 13:03.46 1"       (place, name, school, time, points)
//   "23 Gonzalez, Ashley Gruver 14:43.22"          (no points column)
//   "106 Unknown 24:45.36"                         (placeholder — excluded, no comma in name)
// No grade/YR tag exists in this format at all. School word-count and whether
// a trailing points column is present both vary, so instead of counting from
// either end, the time token itself (the only one matching HH:MM.ss) is
// located and used as the boundary between school name and place/points.
// Section headers ("Event N Girls 3200 Meter Run CC HS GIRLS") appear BEFORE
// their rows, same direction as the Duncan format.
function parseHyTekResultLine(line) {
  const tokens = line.trim().split(/\s+/)
  if (tokens.length < 5) return null
  if (!/^\d+$/.test(tokens[0])) return null

  const nameSplit = splitCommaName(tokens)
  if (!nameSplit) return null
  const { lastName, firstName, nextIndex } = nameSplit

  const rest = tokens.slice(nextIndex)
  const timeIndex = rest.findIndex((t) => /^\d{1,2}:\d{2}\.\d{1,2}$/.test(t))
  if (timeIndex <= 0) return null // need at least one school-name token before the time

  const school_name_raw = rest.slice(0, timeIndex).join(' ').trim()
  const time_seconds = parseFlexibleTime(rest[timeIndex])
  if (time_seconds === null) return null

  return { athlete_name: `${firstName} ${lastName}`.trim(), grade: null, school_name_raw, time_seconds }
}

// Handles both "MM:SS.s" (DirectAthletics/Hy-Tek) and "H:MM:SS.ss" (Duncan) times.
function parseFlexibleTime(token) {
  const parts = token.split(':')
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10)
    const s = parseFloat(parts[1])
    return Number.isNaN(m) || Number.isNaN(s) ? null : m * 60 + s
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    const s = parseFloat(parts[2])
    return [h, m, s].some(Number.isNaN) ? null : h * 3600 + m * 60 + s
  }
  return null
}

// Section headers like "...Girls" / "...Boys" carry gender; "5k" / "2 Mile" /
// "3200 Meter" (the standard metric substitute for 2 mile) carry distance;
// "JH" / "MS" / "Junior High" / "Middle School" mark a section to exclude.
const GENDER_HEADER_RE = /\b(girls|boys)\b/i
const DA_FORMAT_HINT_RE = /directathletics|avg\.?\s*mile/i
const PLAIN_FORMAT_HINT_RE = /firstname\s+lastname/i
const JH_HEADER_RE = /\bjh\b|\bms\b|junior high|middle school/i
const FIVE_K_RE = /\b5k\b/i
const TWO_MILE_RE = /2\s*mile/i
const THIRTY_TWO_HUNDRED_M_RE = /3200\s*meter/i

// --- Format 4: "Plain columns" style ----------------------------------------
// Lines like:
//   "1 Aaliyah Nix Wister 19:18.7 F 10"
//   "44 Lora Lynn Garrison Jay 29:44.9 F 9"        (multi-word first name)
//   "30 Alex Carmichael Cookson Hills Christian21:27.0 M 12"  (team glued to time)
//   "99 Braelyn Devorce-FletcherPryor 33:45.9 M 10"           (name glued to team)
// No comma anywhere, so name/team have no delimiter between them at all —
// unlike the other formats this can't be split by position or punctuation.
// It's resolved later, once the Schools list is available, by matching
// whichever known school name appears at the END of the combined text
// (this also transparently fixes the glued-together cases above, since a
// plain string search doesn't require a preceding space).
// Time is located by regex within the line rather than by token position,
// since it can end up glued to the preceding word. Gender+grade often wrap
// onto their own following line(s) in this source, so that's merged back
// onto the row first.
function mergeWrappedContinuationLines(lines) {
  const merged = []
  for (const line of lines) {
    const isContinuation = /^[MF]$/i.test(line) || /^\d{1,2}$/.test(line) || /^[MF]\s+\d{1,2}$/i.test(line)
    if (isContinuation && merged.length > 0) {
      merged[merged.length - 1] += ' ' + line
    } else {
      merged.push(line)
    }
  }
  return merged
}

function parsePlainResultLine(line) {
  const placeMatch = line.match(/^(\d+)\s+(.*)$/)
  if (!placeMatch) return null
  const remainder = placeMatch[2]

  const timeMatch = remainder.match(/(\d{1,2}:\d{2}\.\d{1,2})/)
  if (!timeMatch) return null
  const middleStr = remainder.slice(0, timeMatch.index).trim()
  if (!middleStr) return null
  const time_seconds = parseFlexibleTime(timeMatch[1])
  if (time_seconds === null) return null

  const afterTime = remainder.slice(timeMatch.index + timeMatch[0].length).trim()
  const afterMatch = afterTime.match(/^([MF])\s*(\d{1,2})/i)
  if (!afterMatch) return null
  const gradeNum = parseInt(afterMatch[2], 10)

  return {
    needsSchoolSplit: true,
    middleStr,
    time_seconds,
    grade: gradeNum >= 9 && gradeNum <= 12 ? gradeNum : null,
    gender: afterMatch[1].toUpperCase() === 'F' ? 'girls' : 'boys',
  }
}

function detectHeaderInfo(line) {
  const genderMatch = line.match(GENDER_HEADER_RE)
  const isJH = JH_HEADER_RE.test(line)
  let eventType = null
  if (FIVE_K_RE.test(line)) eventType = '5K'
  else if (TWO_MILE_RE.test(line) || THIRTY_TWO_HUNDRED_M_RE.test(line)) eventType = '2Mile'
  if (!genderMatch && !isJH && !eventType) return null
  return { gender: genderMatch ? genderMatch[1].toLowerCase() : null, eventType, isJH }
}

// --- Format 5: "Webscorer" style --------------------------------------------
// Rows like:
//   "1 1658 Morgan Brown Sulphur - 12 High School Boys M 17:10.3 -"
//   "10 1296 Collin Garner Lone Grove - 9 High School Boys M 19:25.4 +2:15.1"
// This source is sometimes copied with NO line breaks at all — the whole
// results table lands as one continuous block of text alongside page
// headers, dates, and a source URL. Per-line parsing can't work here, so
// this scans the raw text directly for the row pattern wherever it occurs;
// junk in between (dates, "Place Bib Name..." column headers, page numbers,
// the webscorer.com URL) simply won't match and is skipped automatically.
// Name and team have no delimiter between them ("Morgan Brown Sulphur"), so
// — same as the Plain format — that split is deferred to preview time
// against the Schools list. Distance ("5000" meters = 5K) comes from a
// "<distance> - High School Boys" section title elsewhere in the text;
// gender and JH/HS come straight from each row's own Category field, which
// is more reliable here than relying on section headers.
const WEBSCORER_HINT_RE = /webscorer/i
const WEBSCORER_SECTION_RE = /(\d{3,5})\s*-\s*(?:High School|Middle School)\s+(?:Boys|Girls)/g
const WEBSCORER_ROW_RE =
  /(\d{1,4})\s+(\d{1,5})\s+([A-Za-z.' -]{2,60}?)\s*-\s*(\d{1,2})\s+(High School|Middle School)\s+(?:Boys|Girls)\s+([MF])\s+(\d{1,2}:\d{2}\.\d)\s+(?:[+-][\d:.]+|-)/g
const WEBSCORER_DISTANCE_TO_EVENT = { 5000: '5K', 3200: '2Mile' }

function parseWebscorerFormat(text) {
  const sections = []
  let m
  const sectionRe = new RegExp(WEBSCORER_SECTION_RE)
  while ((m = sectionRe.exec(text))) {
    sections.push({ index: m.index, distance: m[1] })
  }

  const rows = []
  const rowRe = new RegExp(WEBSCORER_ROW_RE)
  while ((m = rowRe.exec(text))) {
    const [, , , blob, gradeStr, level, genderLetter, timeStr] = m
    if (/middle school/i.test(level)) continue // JH/MS excluded outright

    const time_seconds = parseFlexibleTime(timeStr)
    if (time_seconds === null) continue
    const grade = parseInt(gradeStr, 10)

    let distance = null
    for (const s of sections) {
      if (s.index <= m.index) distance = s.distance
      else break
    }

    rows.push({
      lineNumber: rows.length + 1,
      needsSchoolSplit: true,
      middleStr: blob.trim(),
      grade: grade >= 9 && grade <= 12 ? grade : null,
      gender: genderLetter.toUpperCase() === 'F' ? 'girls' : 'boys',
      eventType: WEBSCORER_DISTANCE_TO_EVENT[distance] || null,
      time_seconds,
    })
  }
  return rows
}

function parsePastedText(rawText) {
  if (WEBSCORER_HINT_RE.test(rawText)) {
    // This source can arrive with no line breaks at all, so it parses the
    // raw text directly rather than going through the line-based paths below.
    return parseWebscorerFormat(rawText)
  }

  // Some source PDFs have a stray space before the comma in "Last , First"
  // — normalize that away first so those rows don't silently fail to parse.
  const text = rawText.replace(/\s+,/g, ',')
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  if (PLAIN_FORMAT_HINT_RE.test(text)) {
    // Plain columns style: headers precede rows (forward scan), but gender
    // and grade frequently wrap onto their own following line(s) in this
    // source, so merge those back first.
    const mergedLines = mergeWrappedContinuationLines(lines)
    let currentGender = null
    let currentEventType = null
    let currentIsJH = false
    const rows = []
    mergedLines.forEach((line, i) => {
      const parsed = parsePlainResultLine(line)
      if (parsed) {
        if (!currentIsJH) {
          rows.push({
            lineNumber: i + 1,
            raw: line,
            gender: parsed.gender || currentGender,
            eventType: currentEventType,
            grade: parsed.grade,
            time_seconds: parsed.time_seconds,
            needsSchoolSplit: true,
            middleStr: parsed.middleStr,
          })
        }
        return
      }
      const info = detectHeaderInfo(line)
      if (info) {
        if (info.gender) currentGender = info.gender
        if (info.eventType) currentEventType = info.eventType
        currentIsJH = info.isJH
      }
    })
    return rows
  }

  if (DA_FORMAT_HINT_RE.test(text)) {
    // DirectAthletics: each section's title appears AFTER its rows (as a
    // page footer), so tag rows by scanning from the bottom up and carrying
    // the nearest header BELOW each row backward onto it.
    const entries = lines.map((line, i) => {
      const parsed = parseDAResultLine(line)
      if (parsed && !parsed.isJuniorHigh) return { type: 'row', lineNumber: i + 1, raw: line, ...parsed }
      if (parsed && parsed.isJuniorHigh) return { type: 'skip' }

      const info = detectHeaderInfo(line)
      return info ? { type: 'header', ...info } : { type: 'ignore' }
    })

    let nextGender = null
    let nextEventType = null
    let nextIsJH = false
    const rows = []
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i]
      if (e.type === 'header') {
        if (e.gender) nextGender = e.gender
        if (e.eventType) nextEventType = e.eventType
        nextIsJH = e.isJH
        continue
      }
      if (e.type === 'row') {
        rows.push({ ...e, gender: nextGender, eventType: nextEventType, isJH: nextIsJH })
      }
    }
    rows.reverse()
    return rows.filter((r) => !r.isJH)
  }

  // Duncan Invite / Hy-Tek Meet Manager style: section headers appear BEFORE
  // their rows, so a plain forward scan works. Both line formats are tried
  // per line (they can't collide — Duncan requires a literal FR/SO/JR/SR tag
  // that Hy-Tek lines never have). Distance defaults to 5K unless a header
  // says otherwise, matching your Duncan data where distance is never stated.
  let currentGender = null
  let currentEventType = '5K'
  let currentIsJH = false
  const rows = []
  lines.forEach((line, i) => {
    const parsed = parseDuncanResultLine(line) || parseHyTekResultLine(line)
    if (parsed) {
      if (!currentIsJH) {
        rows.push({ lineNumber: i + 1, raw: line, gender: currentGender, eventType: currentEventType, ...parsed })
      }
      return
    }
    const info = detectHeaderInfo(line)
    if (info) {
      if (info.gender) currentGender = info.gender
      if (info.eventType) currentEventType = info.eventType
      currentIsJH = info.isJH
    }
  })
  return rows
}

// Strips common school-name suffixes/punctuation so "Duncan High School" and
// "Duncan" resolve to the same key. This handles the common case for free;
// genuine one-off mismatches (typos, "HS (Town)" tags) are handled by
// per-school aliases instead, since guessing those generically risks false
// matches between different schools.
function normalizeSchoolName(name) {
  return name
    .toLowerCase()
    .replace(/\b(high school|junior high|middle school|elementary school|h\.?s\.?)\b/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function BulkPasteForm() {
  const [pastedText, setPastedText] = useState('')
  const [meetName, setMeetName] = useState('')
  const [meetDate, setMeetDate] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  // Neither gender nor classification is picked here. Gender comes from
  // whichever "...Girls" / "...Boys" section header appeared above each row
  // in the pasted text. Classification comes from that school's own record
  // in the Schools tab — race groupings like "Large School" / "Small School"
  // at an invite don't match real OSSAA classification.
  async function handlePreview() {
    setSaveError('')
    setSaveSuccess('')
    setPreviewing(true)

    const rawRows = parsePastedText(pastedText)
    const { data: schools } = await supabase.from('xc_schools').select('id, name, classification, aliases')

    // Map every known name variant — canonical name, its normalized form, and
    // any saved aliases (also normalized) — to the school it belongs to.
    const schoolByKey = new Map()
    // Separately, raw (non-normalized) name/alias strings sorted longest-first,
    // used only to split "name+team" text with no delimiter between them —
    // matching against the un-stripped name catches teams however they're
    // actually spelled in that source, and endsWith() works even if the
    // school name ended up glued directly onto the preceding word.
    const suffixCandidates = []
    for (const school of schools || []) {
      schoolByKey.set(school.name.trim().toLowerCase(), school)
      schoolByKey.set(normalizeSchoolName(school.name), school)
      suffixCandidates.push({ key: school.name.trim().toLowerCase(), school })
      for (const alias of school.aliases || []) {
        schoolByKey.set(alias.trim().toLowerCase(), school)
        schoolByKey.set(normalizeSchoolName(alias), school)
        suffixCandidates.push({ key: alias.trim().toLowerCase(), school })
      }
    }
    suffixCandidates.sort((a, b) => b.key.length - a.key.length)

    const resolved = rawRows.map((row) => {
      if (!row.gender) {
        return {
          ...row,
          error: 'Gender unknown — make sure the "...Girls"/"...Boys" section header for this result was included in the paste',
        }
      }
      if (!row.eventType) {
        return {
          ...row,
          error: 'Distance unknown — make sure the section header ("...5k..." or "...2 Mile...") for this result was included in the paste',
        }
      }

      if (row.needsSchoolSplit) {
        const lower = row.middleStr.toLowerCase()
        const match = suffixCandidates.find((c) => lower.endsWith(c.key))
        if (!match) {
          return {
            ...row,
            error: `Could not find a known school at the end of "${row.middleStr}" — add it (or an alias) in the Schools tab`,
          }
        }
        const athlete_name = row.middleStr
          .slice(0, row.middleStr.length - match.key.length)
          .trim()
          .replace(/[-,]+$/, '')
          .trim()
        if (!athlete_name) {
          return { ...row, error: `Could not separate an athlete name from "${row.middleStr}"` }
        }
        return {
          ...row,
          athlete_name,
          school_name_raw: match.school.name,
          school_id: match.school.id,
          classification: match.school.classification,
          error: null,
        }
      }

      const match =
        schoolByKey.get(row.school_name_raw.trim().toLowerCase()) ||
        schoolByKey.get(normalizeSchoolName(row.school_name_raw))
      if (!match) {
        return {
          ...row,
          error: `School "${row.school_name_raw}" not found — add it (or an alias for it) in the Schools tab`,
        }
      }
      return { ...row, school_id: match.id, classification: match.classification, error: null }
    })

    setParsedRows(resolved)
    setPreviewing(false)
  }

  async function handleSaveAll() {
    setSaving(true)
    setSaveError('')
    const validRows = parsedRows.filter((r) => !r.error)
    let savedCount = 0
    const failures = []

    for (const row of validRows) {
      const { error: insertErr } = await supabase.from('xc_results').insert({
        athlete_name: row.athlete_name,
        school_id: row.school_id,
        grade: row.grade,
        gender: row.gender,
        classification: row.classification,
        event_type: row.eventType,
        time_seconds: row.time_seconds,
        meet_name: meetName.trim() || null,
        meet_date: meetDate || null,
      })
      if (insertErr) {
        failures.push(`${row.athlete_name}: ${insertErr.message}`)
      } else {
        savedCount += 1
      }
    }

    setSaving(false)
    setSaveSuccess(`Saved ${savedCount} of ${validRows.length} result(s).`)
    if (failures.length) setSaveError(failures.join('; '))
    setParsedRows([])
    setPastedText('')
  }

  const readyCount = parsedRows.filter((r) => !r.error).length
  const errorCount = parsedRows.length - readyCount

  return (
    <div className="max-w-2xl">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Meet name (optional)</label>
          <input
            type="text"
            value={meetName}
            onChange={(e) => setMeetName(e.target.value)}
            className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Meet date (optional)</label>
          <input
            type="date"
            value={meetDate}
            onChange={(e) => setMeetDate(e.target.value)}
            className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 w-full text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Paste as many sections as you want at once — boys and girls together is fine.
        Duncan-style results, DirectAthletics MeetPro, Hy-Tek Meet Manager, and plain
        FirstName/LastName/Team/Time reports are all recognized automatically. Gender and
        distance (5K, 2 Mile, or the equivalent 3200 Meter) are read from each section's
        header text, classification comes from each school's record in the Schools tab, and
        junior-high/middle-school results are always skipped.
      </p>

      <label className="block text-xs text-gray-500 mb-1">Paste results</label>
      <textarea
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
        rows={12}
        placeholder="Paste the results page here — team summaries and headers are ignored automatically."
        className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-3 w-full text-sm font-mono"
      />

      <button
        type="button"
        onClick={handlePreview}
        disabled={!pastedText.trim() || previewing}
        className="bg-gray-800 text-gray-300 rounded px-4 py-2 text-sm mb-4 disabled:opacity-50"
      >
        {previewing ? 'Matching schools...' : 'Preview'}
      </button>

      {parsedRows.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">
            {readyCount} ready to save{errorCount > 0 ? `, ${errorCount} need attention` : ''}
          </p>
          {parsedRows.some((r) => r.eventType === '2Mile') && (
            <p className="text-xs text-amber-300 bg-amber-950/40 rounded px-2 py-1.5 mb-2">
              This batch includes 2 Mile results. They'll save correctly tagged as 2 Mile, but
              won't show up on the public rankings page yet since that only displays 5K.
            </p>
          )}
          <table className="w-full border-collapse text-sm mb-3">
            <thead>
              <tr>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Athlete</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">School</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Gr</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Gender</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Event</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Time</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.map((r) => (
                <tr key={r.lineNumber} className={`border-t border-gray-800 ${r.error ? 'bg-red-950/40' : ''}`}>
                  <td className="py-1.5">{r.athlete_name}</td>
                  <td className="py-1.5">{r.school_name_raw}</td>
                  <td className="py-1.5">{r.grade ?? '—'}</td>
                  <td className="py-1.5 capitalize">{r.gender || '—'}</td>
                  <td className="py-1.5">{r.eventType || '—'}</td>
                  <td className="py-1.5">{formatTime(r.time_seconds)}</td>
                  <td className="py-1.5 text-xs">
                    {r.error ? <span className="text-red-300">{r.error}</span> : <span className="text-green-400">Ready ({r.classification})</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || parsedRows.every((r) => r.error)}
            className="bg-red-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Save ${parsedRows.filter((r) => !r.error).length} valid result(s)`}
          </button>
        </div>
      )}

      {saveError && <p className="text-sm text-red-300 mb-3">{saveError}</p>}
      {saveSuccess && <p className="text-sm text-green-400 mb-3">{saveSuccess}</p>}
    </div>
  )
}

function AliasEditor({ school, onSave, disabled }) {
  const [value, setValue] = useState((school.aliases || []).join(', '))
  const [dirty, setDirty] = useState(false)

  return (
    <div className="flex gap-1">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setDirty(true)
        }}
        placeholder="e.g. Central HS (Marlow), Marlow"
        disabled={disabled}
        className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-2 py-1 text-sm w-full"
      />
      <button
        type="button"
        onClick={() => {
          onSave(value)
          setDirty(false)
        }}
        disabled={disabled || !dirty}
        className="text-xs px-2 rounded bg-gray-800 text-gray-300 disabled:opacity-40 whitespace-nowrap"
      >
        Save
      </button>
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
      .select('id, name, classification, aliases')
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
    setError('')
    const { data, error: updateErr } = await supabase
      .from('xc_schools')
      .update({ classification })
      .eq('id', schoolId)
      .select()
    setSavingRowId(null)
    if (updateErr) {
      setError(`Could not update classification: ${updateErr.message}`)
      return
    }
    if (!data || data.length === 0) {
      setError(
        'Classification was not saved — this usually means the database is missing an UPDATE permission for xc_schools.'
      )
      return
    }
    fetchSchools()
  }

  async function handleAliasesChange(schoolId, aliasesText) {
    const aliases = aliasesText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
    setSavingRowId(schoolId)
    setError('')
    const { data, error: updateErr } = await supabase
      .from('xc_schools')
      .update({ aliases })
      .eq('id', schoolId)
      .select()
    setSavingRowId(null)
    if (updateErr) {
      setError(`Could not update aliases: ${updateErr.message}`)
      return
    }
    if (!data || data.length === 0) {
      setError(
        'Aliases were not saved — this usually means the database is missing an UPDATE permission for xc_schools (see the SQL policy needed for this).'
      )
      return
    }
    fetchSchools()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleAddBulk} className="mb-5">
        <label className="block text-xs text-gray-500 mb-1">Default classification for this batch</label>
        <select
          value={defaultClassification}
          onChange={(e) => setDefaultClassification(e.target.value)}
          className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 text-sm mb-2 w-40"
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
          className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-3 py-2 mb-1 w-full text-sm font-mono"
        />
        <p className="text-xs text-gray-400 mb-3">
          Every line uses the classification above by default. Add a comma and a different
          classification on a line to override it just for that school (e.g. "Elk City, 4A").
        </p>

        <button
          type="submit"
          disabled={adding || !bulkNames.trim()}
          className="bg-red-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {adding ? 'Adding...' : 'Add schools'}
        </button>
      </form>

      {summary && <p className="text-sm text-green-400 mb-3">{summary}</p>}
      {error && <p className="text-sm text-red-300 mb-3">{error}</p>}

      <p className="text-xs text-gray-400 mb-2">
        "Duncan" already matches "Duncan High School" automatically in pasted results. Use
        Aliases below only for names a plain match won't catch — typos in results printouts,
        or tags like "Central HS (Marlow)".
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading schools...</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-gray-400 font-normal py-1">School</th>
              <th className="text-left text-xs text-gray-400 font-normal py-1 w-20">Class</th>
              <th className="text-left text-xs text-gray-400 font-normal py-1">Aliases</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr key={s.id} className="border-t border-gray-800">
                <td className="py-1.5 align-top">{s.name}</td>
                <td className="py-1.5 align-top">
                  <select
                    value={s.classification}
                    onChange={(e) => handleClassificationChange(s.id, e.target.value)}
                    disabled={savingRowId === s.id}
                    className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-2 py-1 text-sm"
                  >
                    {CLASSIFICATIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 align-top">
                  <AliasEditor
                    school={s}
                    disabled={savingRowId === s.id}
                    onSave={(text) => handleAliasesChange(s.id, text)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ManageResults() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)

  const [genderFilter, setGenderFilter] = useState('all')
  const [classificationFilter, setClassificationFilter] = useState('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [meetFilter, setMeetFilter] = useState('')

  useEffect(() => {
    fetchResults()
  }, [genderFilter, classificationFilter, eventTypeFilter])

  async function fetchResults() {
    setLoading(true)
    setError('')
    let query = supabase
      .from('xc_results')
      .select('id, athlete_name, grade, gender, classification, event_type, time_seconds, meet_name, meet_date, xc_schools(name)')
      .order('meet_date', { ascending: false })
      .limit(300)

    if (genderFilter !== 'all') query = query.eq('gender', genderFilter)
    if (classificationFilter !== 'all') query = query.eq('classification', classificationFilter)
    if (eventTypeFilter !== 'all') query = query.eq('event_type', eventTypeFilter)

    const { data, error: fetchErr } = await query
    if (fetchErr) setError(fetchErr.message)
    setRows(data || [])
    setSelected(new Set())
    setLoading(false)
  }

  const visibleRows = meetFilter.trim()
    ? rows.filter((r) => (r.meet_name || '').toLowerCase().includes(meetFilter.trim().toLowerCase()))
    : rows

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const allSelected = visibleRows.every((r) => prev.has(r.id))
      if (allSelected) return new Set()
      return new Set(visibleRows.map((r) => r.id))
    })
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return
    const confirmed = window.confirm(
      `Delete ${selected.size} result(s)? This can't be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')
    setSummary('')

    const { error: deleteErr, data } = await supabase
      .from('xc_results')
      .delete()
      .in('id', Array.from(selected))
      .select()

    setDeleting(false)

    if (deleteErr) {
      setError(`Could not delete: ${deleteErr.message}`)
      return
    }
    if (!data || data.length === 0) {
      setError(
        'Nothing was deleted — this usually means the database is missing a DELETE permission for xc_results.'
      )
      return
    }

    setSummary(`Deleted ${data.length} result(s).`)
    fetchResults()
  }

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selected.has(r.id))

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Gender</label>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-2 py-1.5 text-sm w-full"
          >
            <option value="all">All</option>
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Class</label>
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-2 py-1.5 text-sm w-full"
          >
            <option value="all">All</option>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Event type</label>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-2 py-1.5 text-sm w-full"
          >
            <option value="all">All</option>
            <option value="5K">5K</option>
            <option value="2Mile">2 Mile</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Meet name contains</label>
          <input
            type="text"
            value={meetFilter}
            onChange={(e) => setMeetFilter(e.target.value)}
            placeholder="e.g. Duncan Invite"
            className="border border-gray-700 rounded bg-gray-800 text-gray-100 px-2 py-1.5 text-sm w-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">
          Showing {visibleRows.length} result(s){selected.size > 0 ? ` \u00b7 ${selected.size} selected` : ''}
        </p>
        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={selected.size === 0 || deleting}
          className="bg-red-600 text-white rounded px-3 py-1.5 text-xs disabled:opacity-40"
        >
          {deleting ? 'Deleting...' : `Delete ${selected.size || ''} selected`}
        </button>
      </div>

      {summary && <p className="text-sm text-green-400 mb-2">{summary}</p>}
      {error && <p className="text-sm text-red-300 mb-2">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading results...</p>
      ) : visibleRows.length === 0 ? (
        <p className="text-sm text-gray-500">No results match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left py-1 w-6">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                </th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Athlete</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">School</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Gender</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Class</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Event</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Time</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Meet</th>
                <th className="text-left text-xs text-gray-400 font-normal py-1">Date</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className={`border-t border-gray-800 ${selected.has(r.id) ? 'bg-red-950/40' : ''}`}>
                  <td className="py-1.5">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} />
                  </td>
                  <td className="py-1.5">{r.athlete_name}</td>
                  <td className="py-1.5 text-gray-500">{r.xc_schools?.name}</td>
                  <td className="py-1.5 capitalize">{r.gender}</td>
                  <td className="py-1.5">{r.classification}</td>
                  <td className="py-1.5">{r.event_type}</td>
                  <td className="py-1.5">{formatTime(r.time_seconds)}</td>
                  <td className="py-1.5 text-gray-500">{r.meet_name || '—'}</td>
                  <td className="py-1.5 text-gray-500">{r.meet_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
