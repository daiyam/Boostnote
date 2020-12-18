export const TagState = {
	NEGATIVE: 'negative',
	POSITIVE: 'positive'
}

export class TagQuery {
	constructor(path) {
		this.includes = []
		this.excludes = []

		if(typeof path === 'string' && path.length) {
			for(const tag of decodeURIComponent(path.substr(6)).split(' ')) {
				if(tag[0] === '+') {
					this.includes.push(tag.substr(1))
				}
				else if(tag[0] === '-') {
					this.excludes.push(tag.substr(1))
				}
			}
		}
	}

	addNegativeTag(...tags) {
		this.excludes.push(...tags)

		return this
	}

	addPositiveTag(...tags) {
		this.includes.push(...tags)

		return this
	}

	filter(filter) {
		this.includes = this.includes.filter(filter)
		this.excludes = this.excludes.filter(filter)
	}

	forEachNegatives(fn) {
		this.excludes.forEach(fn)
	}

	getTagState(tag) {
		if(this.isPositiveTag(tag)) {
			return TagState.POSITIVE
		}
		else if(this.isNegativeTag(tag)) {
			return TagState.NEGATIVE
		}
		else {
			return null
		}
	}

	isEmpty() {
		return this.includes.length === 0 && this.excludes.length === 0
	}

	isMatchedBy(tags) {
		for(const tag of this.includes) {
			if(!tags.includes(tag)) {
				return false
			}
		}

		for(const tag of this.excludes) {
			if(tags.includes(tag)) {
				return false
			}
		}

		return true
	}

	isNegativeTag(tag) {
		return this.excludes.includes(tag)
	}

	isPositiveTag(tag) {
		return this.includes.includes(tag)
	}

	static isTagQuery(path) {
		return /^\/tags\//.test(path)
	}

	listMatchingNotes(noteMap) {
		return noteMap.filter((note) => this.isMatchedBy(note.tags))
	}

	static listMatchingNotes(path, noteMap) {
		const query = new TagQuery(path)

		return query.listMatchingNotes(noteMap)
	}

	static listPositiveTags(path) {
		const query = new TagQuery(path)

		return query.includes
	}

	listRelatedTags(noteMap) {
		const relatedTags = new Set()

		noteMap
			.filter((note) => this.isMatchedBy(note.tags))
			.forEach((note) => note.tags.map(tag => relatedTags.add(tag)))

		return relatedTags
	}

	navigate(location, router) {
		router.push({
			pathname: this.toPath(),
			query: {
			key: location.query.key || '',
			search: location.query.search || '',
			storage: location.query.storage || ''
			}
		})
	}

	static navigate(tags, location, router) {
		const query = new TagQuery()

		if(Array.isArray(tags)) {
			query.addPositiveTag(...tags)
		}
		else {
			query.addPositiveTag(tags)
		}

		query.navigate(location, router)
	}

	removeNegativeTag(tag) {
		const index = this.excludes.indexOf(tag)
		if(index >= 0) {
			this.excludes.splice(index, 1)
		}

		return this
	}

	removePositiveTag(tag) {
		const index = this.includes.indexOf(tag)
		if(index >= 0) {
			this.includes.splice(index, 1)
		}

		return this
	}

	removeTag(tag) {
		let index = this.includes.indexOf(tag)
		if(index >= 0) {
			this.includes.splice(index, 1)

			return true
		}
		else if((index = this.excludes.indexOf(tag)) >= 0) {
			this.excludes.splice(index, 1)

			return true
		}

		return false
	}

	renameTag(oldName, newName) {
		let index = this.includes.indexOf(oldName)
		if(index >= 0) {
			this.includes[index] = newName
		}
		else if((index = this.excludes.indexOf(oldName)) >= 0) {
			this.excludes[index] = newName
		}
	}

	toPath() {
		let path = `/tags/${this.includes.reduce((acc, val) => `${acc}${acc.length ? ' ' : ''}+${encodeURIComponent(val)}`, '')}`

		if(this.excludes.length !== 0) {
			if(path.length > 6) {
				path += this.excludes.reduce((acc, val) => `${acc} -${encodeURIComponent(val)}`, '')
			}
			else {
				path += this.excludes.reduce((acc, val) => `${acc}${acc.length ? ' ' : ''}-${encodeURIComponent(val)}`, '')
			}
		}

		return path
	}
}
