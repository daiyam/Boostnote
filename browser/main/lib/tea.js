import { createHash } from 'crypto'
import dataApi from 'browser/main/lib/dataApi'
import ee from 'browser/main/lib/eventEmitter'
import moment from 'moment'

const AFTER_LAST_REGEX = /(\|[ \t]*\n)\n/
const BREW_REGEX = /\n\|\s+(?:\d+\.)?(\d+\.\d+)\s+\|\s+[\w\+]*\s+\|\s+(?:\d\x)?(?:\d+ml\+)?(?:\d+ml)?\s+\|\s+(?:([\d\.]+)g|\[(#[\w\-]+)\])/g
const DEFLIST_LINK_REGEX = /\n\[([\w\-]+)\][ \t]*\n\t~[ \t]+\[[^\]]+\]\(:note:([\w\-]+)\)/g
const FIRST_REM_REGEX = /\n\t+~\s+([\d\.]+)g\s+\((\d+\.\d+\.\d+)\)[ \t]*/
const LINK_REGEX = /\n\[([^\]]+)\]:\s+:note:([\w\-]+)/g
const MIX_BREW_REGEX = /\n\|\s+(?:\d+\.)?(\d+\.\d+)\s+\|\s+[\w\+]*\s+\|\s+(?:\d+ml)?\s+\|\s+\[(#?[\w\-]+)\]/g
const MIX_DEF_BEGIN_REGEX = /\n\[(#?[\w\-]+)\][ \t]*\n\t~[ \t]+\-[ \t]+([\d\.]+)g[ \t]+\[([\w\-]+|#)\][ \t]*\n/g
const MIX_DEF_LINE_REGEX = /^\n[ \t]{2,}\-[ \t]+([\d\.]+)g[ \t]+\[([\w\-]+)\][ \t]*\n/
const MIX_RUN_REGEX = /\n\|\s+(\d+\.\d+)\s+\|\s+\|\s+\|\s+([\d\.]+)g\s+\|\s+\|\s+\|\s+\|\s+\|\s+\[([^\]\|]+)\]\s+\|/g
const NAME_REGEX = /^#+[ \t]+(?:\[([^\]]+)\]|([^\n]+))/
const REM_REGEX = /\n\t+~\s+([\d\.]+)g\s+\([\d\.]+(?:,\s+([\d\.]+)g?)?\)[ \t]*/g
const REPORT_HEADER_REGEX = /\|\s+(\d+\.\d+\.\d+)\s+(?=\|)/g
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

function buildConsumptionTable(content, { year, context: { nbRowHeaders, rows, searchs, max } }) { // {{{
	const headers = searchs
		.map(({ consumptions }) => Object.keys(consumptions))
		.reduce((val, acc) => [...val, ...acc], [])
		.filter((val, i, arr) => arr.indexOf(val) === i)
		.sort((a, b) => a.substr(3, 2) === b.substr(3, 2) ? a.substr(0, 2) - b.substr(0, 2) : a.substr(3, 2) - b.substr(3, 2))

	const headersLength = max.reduce((acc, val) => acc + (val ? val + 2 : 0), 0)

	content += `\n## 20${year}\n\n\n`

	content += `|${' '.repeat(headersLength)}${'|'.repeat(nbRowHeaders - 1)}`

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

	for (let i = 0; i < nbRowHeaders; ++i) {
		content += `| ${'-'.repeat(max[i])} `
	}

	for (const header of headers) {
		content += `| ${'-'.repeat(maxHeaders[header])}:`
	}

	content += `| ${'-'.repeat(7)}:|\n`

	for (const row of rows) {
		if(row.type === 'new-body') {
			for (let i = 0; i < nbRowHeaders; ++i) {
				content += `| ${'-'.repeat(max[i])} `
			}

			for (const header of headers) {
				content += `| ${'-'.repeat(maxHeaders[header])} `
			}

			content += `| ${'-'.repeat(7)} `
		}
		else if(row.type === 'separator') {
			content += `|${' '.repeat(headersLength)}${'|'.repeat(nbRowHeaders - 1)}`

			for (const header of headers) {
				content += `| ${'-'.repeat(maxHeaders[header])} `
			}

			content += `| ${'-'.repeat(7)} `
		}
		else {
			let colspan = 0
			let sum = 0

			for (let i = 0; i < nbRowHeaders; ++i) {
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

			if(sum === 0) {
				content += `| ${' '.repeat(7)} `
			}
			else {
				content += `| ${' '.repeat(7 - sum.toFixed(1).length - 1)}${sum.toFixed(1)}g `
			}
		}

		content += '|\n'
	}

	content += '\n'

	return content
} // }}}

function buildReserveContent({ nbRowHeaders, headers, rows, max }) { // {{{
	let content = `## Tea Reserve\n\n\n`

	headers.push({
		name: moment(new Date()).format('DD.MM.YY'),
		date: new Date()
	})

	headers.sort(({ date: a }, { date: b }) => a - b)

	const maxValues = headers.length
	const headersLength = max.reduce((acc, val) => acc + (val ? val + 2 : 0), 0)

	content += `|${' '.repeat(headersLength)}${'|'.repeat(nbRowHeaders - 1)}`

	for (const { name } of headers) {
		content += `| ${name} `
	}
	content += '|\n'

	for (let i = 0; i < nbRowHeaders; ++i) {
		content += `| ${'-'.repeat(max[i])} `
	}

	for (const header of headers) {
		content += `| ${'-'.repeat(8)}:`
	}
	content += '|\n'

	for (const row of rows) {
		if(row.type === 'new-body') {
			for (let i = 0; i < nbRowHeaders; ++i) {
				content += `| ${'-'.repeat(max[i])} `
			}

			for (let i = 0; i < maxValues; ++i) {
				content += `| ${'-'.repeat(8)} `
			}
		}
		else if(row.type === 'separator') {
			content += `|${' '.repeat(headersLength)}${'|'.repeat(nbRowHeaders - 1)}`

			for (let i = 0; i < maxValues; ++i) {
				content += `| ${'-'.repeat(8)} `
			}
		}
		else {
			let colspan = 0

			for (let i = 0; i < nbRowHeaders; ++i) {
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

			if (colspan !== 0) {
				content += '|'.repeat(colspan)
			}

			if (row.search) {
				for (const { name } of headers) {
					let remaining = row.search.remaining[name]

					if(remaining) {
						if(typeof remaining !== 'string') {
							remaining = `${remaining.toFixed(1)}g`
						}

						content += `| ${' '.repeat(8 - remaining.length)}${remaining} `
					}
					else {
						content += `| ${' '.repeat(8)} `
					}
				}
			}
			else {
				for (const header of headers) {
					content += `| ${' '.repeat(8)} `
				}
			}
		}

		content += '|\n'
	}

	content += '\n'

	return content
} // }}}

function buildTableContext(noteMap, tagNoteMap, newSearch) { // {{{
	const template = findNote('Tea Summary Template', noteMap)
	if(!template) {
		alert('No template note')

		throw new Error('No template note')
	}

	const lines = template.content.split(/\n/)

	const last = lines.length - 1
	const searchs = []
	const rows = []
	const max = [0, 0, 0, 0]
	const hashes = {}

	let oldCells = ['', '', '', '']
	let oldSearch = ['', '', '', '']

	let l = 5
	while (l <= last && lines[l][0] === '|') {
		const cells = lines[l].replace(/^\|\s*(.*?)\s*\|\s*$/, '$1').split(/\s*\|\s*/)
		if(/---/.test(cells[0])) {
			rows.push({
				type: 'new-body',
				line: l,
			})

			oldCells = ['', '', '', '']
			oldSearch = ['', '', '', '']
		}
		else if(/--/.test(cells[0])) {
			rows.push({
				type: 'separator',
				line: l,
			})

			oldCells = ['', '', '', '']
			oldSearch = ['', '', '', '']
		}
		else {
			const search = replaceRowspans(cells, oldSearch)

			updateMax(cells, max)

			const row = {
				line: l,
				cells,
			}

			const tags = []

			if (matchTags(search, tags, tagNoteMap)) {
				row.search = newSearch(tags)

				searchs.push(row.search)
			}

			rows.push(row)

			oldCells = replaceRowspans(cells, oldCells)

			const hash = oldCells.join()
			if(hashes[hash]) {
				hashes[hash].push(row)
			}
			else {
				hashes[hash] = [row]
			}

			oldSearch = search
		}

		++l
	}

	let nbRowHeaders = 4

	if(max[3]) {
		max[3] += 3
	}
	else if(max[2]) {
		--nbRowHeaders

		max[2] += 2
	}

	return {
		rows,
		searchs,
		max,
		nbRowHeaders,
		hashes
	}
} // }}}

function duplicateConsumptionContext(context) { // {{{
	const copy = {
		nbRowHeaders: context.nbRowHeaders,
		max: [...context.max],
		rows: [],
		searchs: []
	}

	for (const row of context.rows) {
		if(row.type) {
			copy.rows.push({
				line: row.line,
				type: row.type,
			})
		}
		else {
			const search = row.search ? {
				tags: row.search.tags,
				consumptions: {}
			} : null

			copy.rows.push({
				line: row.line,
				cells: row.cells,
				search
			})

			search && copy.searchs.push(search)
		}
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

	const defaultContext = buildTableContext(noteMap, tagNoteMap, (tags) => ({ tags, consumptions: {} }))

	const contexts = []
	const byYear = {}

	for (const [key, note] of noteMap) {
		if (TEST_BREW_REGEX.test(note.content)) {
			const consumptions = getConsumptions(note)

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

	const context = buildTableContext(noteMap, tagNoteMap, (tags) => ({ tags, remaining: {} }))

	restoreReserveValues(mainNote.content, context)

	const today = moment(new Date()).format('DD.MM.YY')

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
					for(const { name, date } of context.headers) {
						if(typeof search.remaining[name] !== 'string') {
							search.remaining[name] = (search.remaining[name] || 0) + getRemainingAt(note, date, name)
						}
					}

					search.remaining[today] = (search.remaining[today] || 0) + rem
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

function getRemainingAt(note, targetDate, targetStr) { // {{{
	let match = FIRST_REM_REGEX.exec(note.content)
	if(!match) {
		return 0
	}

	const initial = parseFloat(match[1])
	if(match[2] === targetStr) {
		return initial
	}

	if(moment(match[2], 'DD.MM.YY') > targetDate) {
		return 0
	}

	let mixes = null
	let consumption = 0

	while ((match = BREW_REGEX.exec(note.content))) {
		if(moment(match[1], 'MM.YY') >= targetDate) {
			BREW_REGEX.lastIndex = 0
			break
		}

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

	return Math.max(initial - consumption, 0)
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

function matchTags(cells, tags, tagNoteMap) { // {{{
	for(const cell of cells) {
		if(cell.length === 0) {
			// all
		}
		// country
		else if(tagNoteMap.has(cell)) {
			tags.push(cell)
		}
		// style
		else if(tagNoteMap.has(`\`${cell.toLowerCase()}`)) {
			tags.push(`\`${cell.toLowerCase()}`)
		}
		// shop
		else if(tagNoteMap.has(`≈${cell}`)) {
			tags.push(`≈${cell}`)
		}
		// type
		else if(tagNoteMap.has(cell.toLowerCase())) {
			tags.push(cell.toLowerCase())
		}
		else {
			return false
		}
	}

	return true
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

function replaceRowspans(cells, olds, nbRowHeaders = 4) { // {{{
	const row = []

	for(let i = 0; i < nbRowHeaders; ++i) {
		if(cells[i] === '^^') {
			row.push(olds[i])
		}
		else {
			row.push(cells[i])
		}
	}

	return row
} // }}}

function restoreReserveValues(content, context) { // {{{
	const lines = content.split(/\n/)
	const last = lines.length - 1
	const today = moment(new Date()).format('DD.MM.YY')
	const headers = {}

	context.headers = []

	let match
	let i = -1

	while ((match = REPORT_HEADER_REGEX.exec(lines[3]))) {
		if(match[1] !== today) {
			context.headers.push({
				name: match[1],
				date: moment(match[1], 'DD.MM.YY').toDate()
			})
		}

		headers[match[1]] = ++i
	}

	const nbRowHeaders = /\|{2,}/.exec(lines[3])[0].length

	let oldSearch = ['', '', '', '']

	let l = 5
	while (l <= last && lines[l][0] === '|') {
		const cells = lines[l].replace(/^\|\s*(.*?)\s*\|\s*$/, '$1').split(/\s*\|\s*/)
		if(/---/.test(cells[cells.length - 1])) {
			oldSearch = ['', '', '', '']
		}
		else {
			const search = replaceRowspans(cells, oldSearch, nbRowHeaders)
			const rows = context.hashes[search.join()]

			if(rows) {
				const values = cells.slice(nbRowHeaders)

				for(const row of rows) {
					if(row.search) {
						for(const { name } of context.headers) {
							if(values[headers[name]]) {
								row.search.remaining[name] = values[headers[name]]
							}
						}
					}
				}
			}

			oldSearch = search
		}

		++l
	}
} // }}}

function sha256(data) { // {{{
	return createHash('sha256').update(data).digest('hex')
} // }}}

function updateMax(cells, max) { // {{{
	for(let i = 0; i < 4; ++i) {
		if(cells[i] !== '^^') {
			max[i] = Math.max(max[i], cells[i].length)
		}
	}
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