export function locateNote(note, location, history) {
	history.push({
		pathname: location.pathname,
		query: {
			key: note,
			search: location.query.search || '',
			storage: location.query.storage || ''
		}
	})
}

export function locateSearch(search, location, history) {
	history.push({
		pathname: location.pathname,
		query: {
			key: location.query.key,
			search: encodeURIComponent(search),
			storage: location.query.storage || ''
		}
	})
}
