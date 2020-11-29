import moment from 'moment'

const REM_REGEX = /\n\t+~\s+([\d\.]+)g\s+\([\d\.]+(?:,\s+([\d\.]+)g?)?\)[ \t]*/g
const TEST_REGEX = /\n\t+~\s+([\d\.]+)g\s+\([\d\.]+(?:,\s+([\d\.]+)g?)?\)[ \t]*/
const USAGE_REGEX = /\n\|\s+(?:\d+\.)?\d+\.\d+\s+\|\s+[\w\+]+\s+\|\s+(?:\d+ml)?\s+\|\s+([\d\.]+)g/g

function getRemaining(note) {
  let last = null

  let match
  while((match = REM_REGEX.exec(note.content))) {
    last = parseFloat(match[1])
  }

  return last
}

function getTag(rem) {
  if(rem < 5) {
    return '⚖00'
  }
  else if(rem < 10) {
    return '⚖05'
  }
  else if(rem < 15) {
    return '⚖10'
  }
  else if(rem < 20) {
    return '⚖15'
  }
  else if(rem >= 100) {
    return '⚖99'
  }
  else {
    return `⚖${parseInt(rem / 10)}0`
  }
}

function isRemaining(note) {
  return !note.tags.includes('⃠⃠⃠') && TEST_REGEX.test(note.content)
}

function notifyRemaining(notes) {
  let available = 0
  let unknown = 0

  const rem = notes
    .filter((note) => {
      if(note.tags.includes('⃠⃠⃠')) {
        return false
      }
      else if(!TEST_REGEX.test(note.content)) {
        ++unknown
        return false
      }
      else {
        ++available
        return true
      }
    })
    .map((note) => getRemaining(note))
    .reduce((acc, value) => acc + value, 0)

  alert(`Remaining: ${new Intl.NumberFormat('en-US').format(rem)}g / ${available}${unknown ? `  (${unknown})` : ``}`)
}

function updateRemaining(note) {
  if(note.tags.includes('⃠⃠⃠')) {
    return note
  }

  let initial = null
  let last = null
  let index = -1

  let match
  while((match = REM_REGEX.exec(note.content))) {
    if(initial === null) {
      initial = parseFloat(match[1])
    }

    index = match.index + match[0].length
    last = parseFloat(match[1])
  }

  if(initial != null) {
    let consumption = 0
    while((match = USAGE_REGEX.exec(note.content))) {
      consumption += parseFloat(match[1])
    }

    const rem = Math.max(initial - consumption, 0)

    if(Math.abs(last - rem) > 1) {
      note.tags = note.tags.filter((tag) => !tag.startsWith('⚖'))

      note.tags.push(getTag(rem))

      const content = note.content.slice(0, index) + `\n\t~ ${new Intl.NumberFormat('en-US').format(rem)}g (${moment(new Date()).format('DD.MM.YY')}, ${new Intl.NumberFormat('en-US').format(consumption)}g)` + note.content.slice(index)

      note.content = content
    }
  }

  return note
}

export {
  isRemaining,
  notifyRemaining,
  updateRemaining
}