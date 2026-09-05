// Girls racing in the three smallest classifications (3A, 2A, A) run the
// standard 2 Mile race instead of 5K. Everyone else — boys at every
// classification, and girls at 6A/5A/4A — runs 5K. Keeping this rule in one
// place means the public rankings query and the admin entry forms can't
// drift out of sync with each other.
export function standardEventType(gender, classification) {
  if (gender === 'girls' && ['3A', '2A', 'A'].includes(classification)) {
    return '2Mile'
  }
  return '5K'
}

export function eventTypeLabel(eventType) {
  return eventType === '2Mile' ? '2 Mile' : '5K'
}
