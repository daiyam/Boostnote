export function findNoteTitle (value, enableFrontMatterTitle, frontMatterTitleField = 'title') {
  const splitted = value.split('\n')

  if (splitted[0] === '---') {
    let line = 0
    while (++line < splitted.length) {
      if (enableFrontMatterTitle && splitted[line].startsWith(frontMatterTitleField + ':')) {
        return splitted[line].substring(frontMatterTitleField.length + 1).trim()
      } else if (splitted[line] === '---') {
        splitted.splice(0, line + 1)

        break
      }
    }
  }

  let index = -1
  let isInsideCodeBlock = false
  let codeBlockIndex
  let line
  let match
  while (++index < splitted.length) {
    line = splitted[index].trim()

    if (/^```/.test(line)) {
      if (isInsideCodeBlock) {
        isInsideCodeBlock = false

        const d = index - codeBlockIndex + 1
        splitted.splice(codeBlockIndex, d)

        index -= d
      } else {
        isInsideCodeBlock = true

        codeBlockIndex = index
      }

      continue
    } else if (isInsideCodeBlock) {
      continue
    } else if ((match = /^\??>[> ]*\s*(.*)$/.exec(line))) {
      line = match[1]
    }

    if ((match = /^#+ +(.*)/.exec(line))) {
      return match[1]
    } else if (index + 1 < splitted.length && /^=+$/.test(splitted[index + 1].trim())) {
      return line
    }

    splitted[index] = line
  }

  index = -1
  while (++index < splitted.length) {
    if (splitted[index].length > 0) {
      return splitted[index]
    }
  }

  return null
}

export default {
  findNoteTitle
}
