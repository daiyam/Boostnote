import { hashHistory } from 'react-router'
import dataApi from 'browser/main/lib/dataApi'
import ee from 'browser/main/lib/eventEmitter'
import { locateNote } from 'browser/lib/location'

export function createMarkdownNote (storage, folder, dispatch, location, params, config) {
  let tags = []
  if (config.ui.tagNewNoteWithFilteringTags && location.pathname.match(/\/tags/)) {
    tags = params.tagname.split(' ')
  }

  return dataApi
    .createNote(storage, {
      type: 'MARKDOWN_NOTE',
      folder: folder,
      title: '',
      tags,
      content: ''
    })
    .then(note => {
      const noteHash = note.key
      dispatch({
        type: 'UPDATE_NOTE',
        note: note
      })

      locateNote(noteHash, location, hashHistory)

      ee.emit('list:jump', noteHash)
      ee.emit('detail:focus')
    })
}

export function createSnippetNote (storage, folder, dispatch, location, params, config) {
  let tags = []
  if (config.ui.tagNewNoteWithFilteringTags && location.pathname.match(/\/tags/)) {
    tags = params.tagname.split(' ')
  }

  return dataApi
    .createNote(storage, {
      type: 'SNIPPET_NOTE',
      folder: folder,
      title: '',
      tags,
      description: '',
      snippets: [
        {
          name: '',
          mode: config.editor.snippetDefaultLanguage || 'text',
          content: ''
        }
      ]
    })
    .then(note => {
      const noteHash = note.key
      dispatch({
        type: 'UPDATE_NOTE',
        note: note
      })

      locateNote(noteHash, location, hashHistory)

      ee.emit('list:jump', noteHash)
      ee.emit('detail:focus')
    })
}
