import { createHash } from 'crypto'
import dataApi from 'browser/main/lib/dataApi'
import ee from 'browser/main/lib/eventEmitter'
import moment from 'moment'

const AFTER_LAST_REGEX = /(\|[ \t]*\n)\n/
const BREW_REGEX = /\n\|\s+(?:\d+\.)?(\d+\.\d+)\s+\|\s+[\w\+]*\s+\|\s+(?:\d+ml)?\s+\|\s+(?:([\d\.]+)g|\[(#[\w\-]+)\])/g
const DEFLIST_LINK_REGEX = /\n\[([\w\-]+)\][ \t]*\n\t~[ \t]+\[[^\]]+\]\(:note:([\w\-]+)\)/g
const LINK_REGEX = /\n\[([^\]]+)\]:\s+:note:([\w\-]+)/g
const MIX_BREW_REGEX = /\n\|\s+(?:\d+\.)?(\d+\.\d+)\s+\|\s+[\w\+]*\s+\|\s+(?:\d+ml)?\s+\|\s+\[(#?[\w\-]+)\]/g
const MIX_DEF_BEGIN_REGEX = /\n\[(#?[\w\-]+)\][ \t]*\n\t~[ \t]+\-[ \t]+([\d\.]+)g[ \t]+\[([\w\-]+|#)\][ \t]*\n/g
const MIX_DEF_LINE_REGEX = /^\n[ \t]{2,}\-[ \t]+([\d\.]+)g[ \t]+\[([\w\-]+)\][ \t]*\n/
const MIX_RUN_REGEX = /\n\|\s+(\d+\.\d+)\s+\|\s+\|\s+\|\s+([\d\.]+)g\s+\|\s+\|\s+\|\s+\|\s+\|\s+\[([^\]\|]+)\]\s+\|/g
const NAME_REGEX = /^#+[ \t]+(?:\[([^\]]+)\]|([^\n]+))/
const REM_REGEX = /\n\t+~\s+([\d\.]+)g\s+\([\d\.]+(?:,\s+([\d\.]+)g?)?\)[ \t]*/g
const REPORT_HEADER_REGEX = /\|\s+(\d+\.\d+\.\d+)\s+\|/g
const TEST_BREW_REGEX = /\s+Date\s+\|\s+Wat\s+\|\s+Volum\s+\|\s+Weyt\s+\|\s+Brew\s+\|\s+Time\s+\|\s+Temptr\s+\|\s+Rating\s+\|\s+Tasting Notes\s+\|/
const TEST_MIX_REGEX = /\n\|\s+(?:\d+\.)?\d+\.\d+\s+\|\s+[\w\+]*\s+\|\s+(?:\d+ml)?\s+\|\s+\[#?[\w\-]+\]/
const TEST_REM_REGEX = /\n\t+~\s+([\d\.]+)g\s+\([\d\.]+(?:,\s+([\d\.]+)g?)?\)[ \t]*/

function buildConsumptionContent(contexts) { // {{{
	let content = `## Tea Consumption\n\n`

	for (const context of contexts) {
		content = buildConsumptionTable(content, context)
	}

	return content
} // }}}

function buildConsumptionTable(content, { year, context: { rows, searchs, max } }) { // {{{
	const headers = searchs
		.map(({ consumptions }) => Object.keys(consumptions))
		.reduce((val, acc) => [...val, ...acc], [])
		.filter((val, i, arr) => arr.indexOf(val) === i)
		.sort((a, b) => a.substr(3, 2) === b.substr(3, 2) ? a.substr(0, 2) - b.substr(0, 2) : a.substr(3, 2) - b.substr(3, 2))

	content += `\n## 20${year}\n\n\n`

	content += `|${' '.repeat(max.reduce((val, acc) => acc + val + 2, 0))}|||`

	const maxHeaders = {}

	for (const header of headers) {
		let max = 5

		for (const row of rows) {
			if (row.search && row.search.consumptions[header]) {
				max = Math.max(max, row.search.consumptions[header].weight.toFixed(1).length + 1)
			}
		}

		maxHeaders[header] = max

		content += `| ${' '.repeat(max - 5)}${header} `
	}
	content += `| ${' '.repeat(7)} |\n`

	for (const m of max) {
		content += `| ${'-'.repeat(m)} `
	}

	for (const header of headers) {
		content += `| ${'-'.repeat(maxHeaders[header])}:`
	}

	content += `| ${'-'.repeat(7)}:|\n`

	for (const row of rows) {
		let colspan = 0
		let sum = 0

		for (let i = 0; i < 4; ++i) {
			if (row.cells[i].length) {
				content += `| ${row.cells[i]}${' '.repeat(max[i] - row.cells[i].length)} `

				if (row.cells[i] === '^^' && i < 3 && row.cells[i + 1].length === 0) {
					content += `|`

					--colspan
				}
			}
			else if (i === 0) {
				content += `| ${' '.repeat(max[i])} `
			}
			else {
				content += ' '.repeat(max[i] + 2)

				++colspan
			}
		}

		if (colspan != 0) {
			content += '|'.repeat(colspan)
		}

		if (row.search) {
			for (const header of headers) {
				if (row.search.consumptions[header]) {
					const weight = row.search.consumptions[header].weight.toFixed(1)

					content += `| ${' '.repeat(maxHeaders[header] - weight.length - 1)}${weight}g `

					sum += row.search.consumptions[header].weight
				}
				else {
					content += `| ${' '.repeat(maxHeaders[header])} `
				}
			}
		}
		else {
			for (const header of headers) {
				content += `| ${' '.repeat(maxHeaders[header])} `
			}
		}

		content += `| ${' '.repeat(7 - sum.toFixed(1).length - 1)}${sum.toFixed(1)}g |\n`
	}

	content += '\n'

	return content
} // }}}

function buildReserveContent({ headers, rows, max }) { // {{{
	let content = `## Tea Reserve\n\n\n`

	content += `|${' '.repeat(max.reduce((val, acc) => acc + val + 2, 0))}|||`

	const today = moment(new Date()).format('DD.MM.YY')
	const newColumn = headers[headers.length - 1] !== today
	const maxCells = newColumn ? rows[0].cells.length : rows[0].cells.length - 1

	for (const header of headers) {
		content += `| ${header} `
	}
	if (newColumn) {
		content += `| ${today} `
	}
	content += '|\n'

	for (const m of max) {
		content += `| ${'-'.repeat(m)} `
	}
	for (const header of headers) {
		content += `| ${'-'.repeat(8)}:`
	}
	if (newColumn) {
		content += `| ${'-'.repeat(8)}:`
	}
	content += '|\n'

	for (const row of rows) {
		let colspan = 0

		for (let i = 0; i < 4; ++i) {
			if (row.cells[i].length) {
				content += `| ${row.cells[i]}${' '.repeat(max[i] - row.cells[i].length)} `

				if (row.cells[i] === '^^' && i < 3 && row.cells[i + 1].length === 0) {
					content += `|`

					--colspan
				}
			}
			else if (i === 0) {
				content += `| ${' '.repeat(max[i])} `
			}
			else {
				content += ' '.repeat(max[i] + 2)

				++colspan
			}
		}

		if (colspan != 0) {
			content += '|'.repeat(colspan)
		}

		for (let i = 4; i < maxCells; ++i) {
			content += `| ${' '.repeat(8 - row.cells[i].length)}${row.cells[i]} `
		}

		if (row.search) {
			const remaining = row.search.remaining.toFixed(1)
			content += `| ${' '.repeat(8 - remaining.length - 1)}${remaining}g `
		}
		else {
			content += `| ${' '.repeat(8)} `
		}

		content += '|\n'
	}

	content += '\n'

	return content
} // }}}

function buildTableContext(content, tagNoteMap, newSearch) { // {{{
	let match

	const lines = content.split(/\n/)

	const headers = []
	while ((match = REPORT_HEADER_REGEX.exec(lines[3]))) {
		headers.push(match[1])
	}

	let style, country, shop, type, p3

	const last = lines.length - 1
	const searchs = []
	const rows = []
	const max = [1, 1, 1, 1]

	let l = 5
	while (l <= last && lines[l][0] === '|') {
		const cells = lines[l].replace(/^\|\s*(.*?)\s*\|\s*$/, '$1').split(/\s*\|\s*/)

		let search = true

		if (cells[0].length === 0) {
			style = null
		}
		else if (cells[0] !== '^^') {
			style = cells[0] && `\`${cells[0].toLowerCase()}` || null

			style && (max[0] = Math.max(max[0], cells[0].length))
		}
		if (cells[1].length === 0) {
			country = null
		}
		else if (cells[1] !== '^^') {
			country = cells[1] || null

			style && (max[1] = Math.max(max[1], cells[1].length))
		}
		if (cells[2] === '^^') {
			if (!(type || shop)) {
				search = false
			}
		}
		else {
			p3 = ''

			if (cells[2].length === 0) {
				type = null
				shop = null
			}
			else if (tagNoteMap.has(`≈${cells[2]}`)) {
				shop = `≈${cells[2]}`
				p3 = 's'
			}
			else if (tagNoteMap.has(cells[2].toLowerCase())) {
				type = cells[2].toLowerCase()
				p3 = 't'
			}
			else {
				search = false
			}

			max[2] = Math.max(max[2], cells[2].length)
		}
		if (search && cells[3] !== '^^') {
			if (cells[3].length === 0) {
				if (p3 === 's') {
					type = null
				}
				else if (p3 === 't') {
					shop = null
				}
				else {
					type = null
					shop = null
				}
			}
			else if (tagNoteMap.has(`≈${cells[3]}`)) {
				shop = `≈${cells[3]}`
			}
			else if (tagNoteMap.has(cells[3].toLowerCase())) {
				type = cells[3].toLowerCase()
			}
			else {
				search = false
			}

			max[3] = Math.max(max[3], cells[3].length)
		}
		else {
			max[3] = Math.max(max[3], cells[3].length)
		}

		const row = {
			line: l,
			cells
		}

		if (search) {
			const tags = []

			if (style) {
				tags.push(style)
			}
			if (country) {
				tags.push(country)
			}
			if (shop) {
				tags.push(shop)
			}
			if (type) {
				tags.push(type)
			}

			row.search = newSearch(tags)

			searchs.push(row.search)
		}

		rows.push(row)

		++l
	}

	return {
		headers,
		rows,
		searchs,
		max
	}
} // }}}

function duplicateConsumptionContext(context) { // {{{
	const copy = {
		max: [...context.max],
		rows: [],
		searchs: []
	}

	for (const row of context.rows) {
		const search = row.search ? {
			tags: row.search.tags,
			consumptions: {}
		} : null

		copy.rows.push({
			cells: row.cells,
			line: row.line,
			search
		})

		search && copy.searchs.push(search)
	}

	return copy
} // }}}

function findNote(title, noteMap) { // {{{
	for (const [key, note] of noteMap) {
		if (!note.isTrashed && note.title === title) {
			return note
		}
	}

	return null
} // }}}

function generateConsumption(noteMap, tagNoteMap, dispatch) { // {{{
	for (const [key, note] of noteMap) {
		if (isMix(note)) {
			updateMix(note, noteMap, dispatch)
		}
	}

	const mainNote = findNote('Tea Consumption', noteMap)
	if(!mainNote) {
		return alert('No consumption note')
	}

	const contexts = mainNote.content
		.split(/(?=##\s+\d+)/)
		.filter((val, i) => i != 0)
		.map((content) => ({
			year: /^##\s+(\d+)/.exec(content)[1].substr(2, 2),
			context: buildTableContext(content, tagNoteMap, (tags) => ({ tags, consumptions: {} }))
		}))

	const byYear = contexts.reduce((acc, val) => {
		acc[val.year] = val.context

		return acc
	}, {})

	const years = Object.keys(byYear).sort((a, b) => b - a)
	const last = contexts.length - 1

	years.splice(last, 1)

	const defaultContext = duplicateConsumptionContext(contexts[last].context)

	for (const [key, note] of noteMap) {
		if (TEST_BREW_REGEX.test(note.content)) {
			const consumptions = getConsumptions(note)

			for (let i = 0; i < last; ++i) {
				const context = contexts[i]

				for (const search of context.context.searchs) {
					let match = true

					for (const tag of search.tags) {
						if (!note.tags.includes(tag)) {
							match = false

							break
						}
					}

					if (match) {
						for (const date in consumptions) {
							if (date.substr(3, 2) === context.year) {
								if (search.consumptions[date]) {
									search.consumptions[date].weight += consumptions[date].weight
								}
								else {
									search.consumptions[date] = Object.assign({}, consumptions[date])
								}
							}
						}
					}
				}
			}

			for (const [index, search] of defaultContext.searchs.entries()) {
				let match = true

				for (const tag of search.tags) {
					if (!note.tags.includes(tag)) {
						match = false

						break
					}
				}

				if (match) {
					for (const date in consumptions) {
						const year = date.substr(3, 2)

						if (years.includes(year)) {
							continue
						}

						if (!byYear[year]) {
							const context = duplicateConsumptionContext(defaultContext)

							contexts.push({
								year,
								context
							})

							byYear[year] = context
						}

						const search = byYear[year].searchs[index]

						if (search.consumptions[date]) {
							search.consumptions[date].weight += consumptions[date].weight
						}
						else {
							search.consumptions[date] = Object.assign({}, consumptions[date])
						}
					}
				}
			}
		}
	}

	const content = buildConsumptionContent(contexts.sort(({ year: a }, { year: b }) => b - a))

	mainNote.content = content

	dataApi
		.updateNote(mainNote.storage, mainNote.key, mainNote)
		.then((note) => {
			dispatch({
				type: 'UPDATE_NOTE',
				note
			})
		})
		.then(() => ee.emit('note:refresh'))
} // }}}

function generateReserve(noteMap, tagNoteMap, dispatch) { // {{{
	for (const [key, note] of noteMap) {
		if (isMix(note)) {
			updateMix(note, noteMap, dispatch)
		}
	}

	const mainNote = findNote('Tea Reserve', noteMap)
	if(!mainNote) {
		return alert('No reserve note')
	}

	const context = buildTableContext(mainNote.content, tagNoteMap, (tags) => ({ tags, remaining: 0 }))

	for (const [key, note] of noteMap) {
		if (isRemaining(note)) {
			updateRemaining(note, dispatch)

			const rem = getRemaining(note)

			for (const search of context.searchs) {
				let match = true

				for (const tag of search.tags) {
					if (!note.tags.includes(tag)) {
						match = false

						break
					}
				}

				if (match) {
					search.remaining += rem
				}
			}
		}
	}

	const content = buildReserveContent(context)

	mainNote.content = content

	dataApi
		.updateNote(mainNote.storage, mainNote.key, mainNote)
		.then((note) => {
			dispatch({
				type: 'UPDATE_NOTE',
				note
			})
		})
		.then(() => ee.emit('note:refresh'))
} // }}}

function getConsumptions(note) { // {{{
	const consumptions = {}

	let mixes = null

	let match, weight
	while ((match = BREW_REGEX.exec(note.content))) {
		if (match[2]) {
			weight = parseFloat(match[2])
		}
		else {
			// hybrid mix
			if (mixes === null) {
				mixes = loadMixes(note)
			}

			const mix = mixes[match[3]]
			if (mix) {
				weight = mix['#']
			}
			else {
				weight = 0
			}
		}

		if (consumptions[match[1]]) {
			consumptions[match[1]].weight += weight
		}
		else {
			if (match[2]) {
			}
			consumptions[match[1]] = {
				date: match[1],
				weight
			}
		}
	}

	return consumptions
} // }}}

function getRemaining(note) { // {{{
	let last = null

	let match
	while ((match = REM_REGEX.exec(note.content))) {
		last = parseFloat(match[1])
	}

	return last
} // }}}

function getTag(rem) { // {{{
	if (rem < 5) {
		return '⚖00'
	}
	else if (rem < 10) {
		return '⚖05'
	}
	else if (rem < 15) {
		return '⚖10'
	}
	else if (rem < 20) {
		return '⚖15'
	}
	else if (rem >= 100) {
		return '⚖99'
	}
	else {
		return `⚖${parseInt(rem / 10)}0`
	}
} // }}}

function isMix(note) { // {{{
	return !note.isTrashed && TEST_MIX_REGEX.test(note.content)
} // }}}

function isRemaining(note) { // {{{
	return !note.isTrashed && !note.tags.includes('⃠⃠⃠') && TEST_REM_REGEX.test(note.content)
} // }}}

function loadMixes(note) { // {{{
	let match

	const ingredients = {}
	while ((match = DEFLIST_LINK_REGEX.exec(note.content))) {
		ingredients[match[1]] = match[2]
	}

	const mixes = {}
	while ((match = MIX_DEF_BEGIN_REGEX.exec(note.content))) {
		const name = match[1]
		const mix = {}

		if (match[3] === '#') {
			mix['#'] = parseFloat(match[2])
		}
		else if (ingredients[match[3]]) {
			mix[ingredients[match[3]]] = parseFloat(match[2])
		}

		let content = note.content.substr(match.index + match[0].length - 1)

		while ((match = MIX_DEF_LINE_REGEX.exec(content))) {
			if (ingredients[match[2]]) {
				mix[ingredients[match[2]]] = parseFloat(match[1])
			}

			content = content.substr(match.index + match[0].length - 1)
		}

		mixes[name] = mix
	}

	return mixes
} // }}}

function notifyRemaining(notes) { // {{{
	let available = 0
	let unknown = 0

	const rem = notes
		.filter((note) => {
			if (note.tags.includes('⃠⃠⃠')) {
				return false
			}
			else if (!TEST_REM_REGEX.test(note.content)) {
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

	alert(`Remaining: ${rem.toFixed(1)}g / ${available}${unknown ? `  (${unknown})` : ``}`)
} // }}}

function sha256(data) { // {{{
	return createHash('sha256').update(data).digest('hex')
} // }}}

function updateMix(note, noteMap, dispatch) { // {{{
	let match = NAME_REGEX.exec(note.content)

	const name = match[1] || match[2]
	const mixKey = note.key

	const mixes = loadMixes(note)

	const brews = {}
	while ((match = MIX_BREW_REGEX.exec(note.content))) {
		const date = match[1]

		const mix = mixes[match[2]]
		if (mix) {
			for (const ingr in mix) {
				if (ingr !== '#') {
					brews[ingr] = brews[ingr] || {}
					brews[ingr][date] = (brews[ingr][date] || 0) + mix[ingr]
				}
			}
		}
	}

	for (const key in brews) {
		const note = noteMap.get(key)
		if (!note) {
			continue
		}

		const old = sha256(note.content)

		let content = note.content

		let delta = 0
		while ((match = MIX_RUN_REGEX.exec(note.content))) {
			if (match[3] === name) {
				const date = match[1]

				if (brews[key][date] && parseFloat(match[2]) !== brews[key][date]) {
					const toInsert = `| ${date} |     |       |  ${brews[key][date].toFixed(1)}g  |      |       |        |        | [${name}] |`

					content = content.substr(0, match.index + delta + 1) + toInsert + content.substr(match.index + delta + match[0].length)

					delta += match[0].length - toInsert.length - 1
				}

				delete brews[key][date]
			}
		}

		let toInsert = ''

		for (const date in brews[key]) {
			toInsert += `| ${date} |     |       |  ${brews[key][date].toFixed(1)}g  |      |       |        |        | [${name}] |\n`
		}

		if (toInsert.length) {
			match = AFTER_LAST_REGEX.exec(content)

			if (match) {
				content = content.substr(0, match.index + match[1].length) + toInsert + content.substr(match.index + match[1].length)
			}
			else {
				content += `\n${toInsert}\n`
			}
		}

		let nr = true
		let nf = true
		while (nf && (match = LINK_REGEX.exec(content))) {
			nr = false

			if (match[1] === name) {
				nf = false
				LINK_REGEX.lastIndex = 0
			}
		}

		if (nf) {
			if (nr) {
				content += `\n\n`
			}

			content += `\n[${name}]: :note:${mixKey}`
		}

		if (old !== sha256(content)) {
			note.content = content

			dataApi.updateNote(note.storage, note.key, note).then((note) => {
				dispatch({
					type: 'UPDATE_NOTE',
					note
				})
			})
		}
	}
} // }}}

function updateRemaining(note, dispatch) { // {{{
	if (note.tags.includes('⃠⃠⃠')) {
		return null
	}

	let initial = null
	let last = null
	let index = -1

	let match
	while ((match = REM_REGEX.exec(note.content))) {
		if (initial === null) {
			initial = parseFloat(match[1])
		}

		index = match.index + match[0].length
		last = parseFloat(match[1])
	}

	let mixes = null

	if (initial != null) {
		let consumption = 0
		while ((match = BREW_REGEX.exec(note.content))) {
			if (match[2]) {
				consumption += parseFloat(match[2])
			}
			else {
				// hybrid mix
				if (mixes === null) {
					mixes = loadMixes(note)
				}

				const mix = mixes[match[3]]
				if (mix) {
					consumption += mix['#']
				}
			}
		}

		const rem = Math.max(initial - consumption, 0)

		if (Math.abs(last - rem) > 1) {
			note.tags = note.tags.filter((tag) => !tag.startsWith('⚖'))

			note.tags.push(getTag(rem))

			const content = note.content.slice(0, index) + `\n\t~ ${rem.toFixed(1)}g (${moment(new Date()).format('DD.MM.YY')}, ${new Intl.NumberFormat('en-US').format(consumption)}g)` + note.content.slice(index)

			note.content = content

			if (dispatch) {
				dataApi.updateNote(note.storage, note.key, note).then((note) => {
					dispatch({
						type: 'UPDATE_NOTE',
						note
					})
				})
			}
			else {
				return note
			}
		}
	}

	return null
} // }}}

export {
	generateConsumption,
	generateReserve,
	getConsumptions,
	isRemaining,
	notifyRemaining,
	updateMix,
	updateRemaining
}