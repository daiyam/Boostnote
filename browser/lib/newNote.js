import { hashHistory } from 'react-router'
import dataApi from 'browser/main/lib/dataApi'
import ee from 'browser/main/lib/eventEmitter'
import { locateNote } from 'browser/lib/location'
import { TagQuery } from 'browser/main/lib/TagQuery'

export function createMarkdownNote (storage, folder, dispatch, location, params, config) {
  const tags = config.ui.tagNewNoteWithFilteringTags ? TagQuery.listPositiveTags(location.pathname) : []

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
  const tags = config.ui.tagNewNoteWithFilteringTags ? TagQuery.listPositiveTags(location.pathname) : []

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
