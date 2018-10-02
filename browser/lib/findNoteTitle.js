export function findNoteTitle (value) {
  const splitted = value.split('\n')
  let title = null
  let isInsideCodeBlock = false

  if (splitted[0] === '---') {
    let line = 0
    while (++line < splitted.length) {
      if (splitted[line] === '---') {
        splitted.splice(0, line + 1)

        break
      }
    }
  }

  splitted.some((line, index) => {
    let trimmedLine = line.trim()

    let match
    if (/$```/.test(trimmedLine)) {
      isInsideCodeBlock = !isInsideCodeBlock
    } else if ((match = /^\??>[> ]*\s*(.*)$/.exec(trimmedLine))) {
      trimmedLine = match[1]
    }

    const trimmedNextLine = splitted[index + 1] === undefined ? '' : splitted[index + 1].trim()
    if (!isInsideCodeBlock && ((match = /^#+ +(.*)/.exec(trimmedLine)) || /^=+$/.test(trimmedNextLine))) {
      title = match ? match[1] : trimmedLine
      return true
    }
  })

  if (title === null) {
    title = ''
    splitted.some((line) => {
      if (line.trim().length > 0) {
        title = line.trim()
        return true
      }
    })
  }

  return title
}

export default {
  findNoteTitle
}
