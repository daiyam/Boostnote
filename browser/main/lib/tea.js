import { createHash } from 'crypto'
import dataApi from 'browser/main/lib/dataApi'
import ee from 'browser/main/lib/eventEmitter'
import moment from 'moment'

const BEST_TAG_PREFIX = '♆'
const CONTAINER_TAG_PREFIX = '℥'
const DATE_TAG_PREFIX = '❉'
const EMPTY_TAG = '⌧⌧⌧'
const WEIGHT_TAG_PREFIX = '⚖'

const AFTER_LAST_REGEX = /(\|[ \t]*\n)\n/
const BEST_HEADER_REGEX = /^\|\s+Volum\s+\|\s+Weyt\s+\|\s+Brew\s+\|\s+Time\s+\|\s+Temptr\s+\|/
const BEST_BREW_NEW_REGEX = /^\|\s+(\S+)\s+\|\s+(\S+)\s+\|\s+(\S+)\s+\|\s+([^\|]+?)\s+\|\s+(\S+)\s+/
const BEST_BREW_LINE_REGEX = /^\|\s+\|\s+\|\s+(\S+)\s+\|\s+([^\|]+?)\s+\|\s+(\S+)\s+/
const BEST_BREW_SEPARATOR_REGEX = /^\|\s+\-+/
const BREW_REGEX = /\n\|\s+((?:\d+\.)?(\d+\.\d+))\s+\|\s+[\w\+]*\s+\|\s+(?:\d\x)?(?:\d+ml\+)?(?:\d+ml)?\s+\|\s+(?:([\d\.]+)g(?:\+([\d\.]+)g)?|\[(#[\w\-]+)\])/g
const BREW_NEW_REGEX = /^\|\s+(?:\d+\.)?\d+\.\d+\s+\|\s+(\S+)\s+\|\s+(\S+)\s+\|\s+(\S+)\s+\|\s+(\S+)\s+\|\s+([^\|]+?)\s+\|\s+(\S+)\s+/
const BREW_LINE_REGEX = /^\|\s+(?:\d+\.\d+)?\s+\|\s+\|\s+\|\s+\|\s+(\S+)\s+\|\s+([^\|]+?)\s+\|\s+(\S+)\s+/
const DEFLIST_LINK_REGEX = /\n\[([\w\-]+)\][ \t]*\n\t~[ \t]+\[[^\]]+\]\(:note:([\w\-]+)\)/g
const LINK_REGEX = /\n\[([^\]]+)\]:\s+:note:([\w\-]+)/g
const MIX_BREW_REGEX = /\n\|\s+(?:\d+\.)?(\d+\.\d+)\s+\|\s+[\w\+]*\s+\|\s+(?:\d+ml)?\s+\|\s+\[(#?[\w\-]+)\]/g
const MIX_DEF_BEGIN_REGEX = /\n\[(#?[\w\-]+)\][ \t]*\n\t~[ \t]+\-[ \t]+([\d\.]+)g[ \t]+\[([\w\-]+|#)\][ \t]*\n/g
const MIX_DEF_LINE_REGEX = /^\n[ \t]{2,}\-[ \t]+([\d\.]+)g[ \t]+\[([\w\-]+)\][ \t]*\n/
const MIX_RUN_REGEX = /\n\|\s+(\d+\.\d+)\s+\|\s+\|\s+\|\s+([\d\.]+)g\s+\|\s+\|\s+\|\s+\|\s+\|\s+\[([^\]\|]+)\]\s+\|/g
const NAME_REGEX = /^#+[ \t]+(?:\[([^\]]+)\]|([^\n]+))/
const REM_REGEX = /\n\t+~\s+([\d\.]+)g\s+\((\d+\.\d+\.\d+)(?:,\s+([\d\.]+)g?){0,2}\)[ \t]*/g
const REPORT_HEADER_REGEX = /\|\s+(\d+\.\d+\.\d+)\s+(?=\|)/g
const TEST_BREW_REGEX = /\s+Date\s+\|\s+Wat\s+\|\s+Volum\s+\|\s+Weyt\s+\|\s+Brew\s+\|\s+Time\s+\|\s+Temptr\s+\|\s+Rating\s+\|\s+Tasting Notes\s+\|/
const TEST_MIX_REGEX = /\n\|\s+(?:\d+\.)?\d+\.\d+\s+\|\s+[\w\+]*\s+\|\s+(?:\d+ml)?\s+\|\s+\[#?[\w\-]+\]/
const TEST_REM_REGEX = /\n\t+~\s+([\d\.]+)g\s+\([\d\.]+(?:,\s+([\d\.]+)g?)?\)[ \t]*/

function buildConsumptionContent(year, context) { // {{{
	let content = buildConsumptionTable(`## Tea Consumption 20${year}\n\n\n\n`, year, context)

	if(Object.keys(context.links).length !== 0) {
		content += '\n\n\n\n'

		for(const [alias, tag] of Object.entries(context.links)) {
			content += `\n[${alias}]: :tag:${tag}`
		}
	}

	return content
} // }}}

function buildConsumptionTable(content, year, { nbRowHeaders, rows, searchs, max }) { // {{{
	const headers = searchs
		.map(({ consumptions }) => Object.keys(consumptions))
		.reduce((val, acc) => [...val, ...acc], [])
		.filter((val, i, arr) => arr.indexOf(val) === i)
		.sort((a, b) => a.substr(3, 2) === b.substr(3, 2) ? a.substr(0, 2) - b.substr(0, 2) : a.substr(3, 2) - b.substr(3, 2))

	const headersLength = max.reduce((acc, val) => acc + (val ? val + 2 : 0), 0)

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

function buildPurchaseContent({ nbRowHeaders, headers, rows, max, links, current }) { // {{{
	let content = `## Tea Purchase\n\n\n`

	const w = 8
	const maxValues = headers.length
	const headersLength = max.reduce((acc, val) => acc + (val ? val + 2 : 0), 0)

	content += `|${' '.repeat(headersLength)}${'|'.repeat(nbRowHeaders - 1)}`

	for (const { name } of headers) {
		content += `| ${' '.repeat(w - name.length)}${name} `
	}
	content += `| ${' '.repeat(w)} |\n`

	for (let i = 0; i < nbRowHeaders; ++i) {
		content += `| ${'-'.repeat(max[i])} `
	}

	for (const header of headers) {
		content += `| ${'-'.repeat(w)}:`
	}
	content += `| ${'-'.repeat(w)}:|\n`

	for (const row of rows) {
		if(row.type === 'new-body') {
			for (let i = 0; i < nbRowHeaders; ++i) {
				content += `| ${'-'.repeat(max[i])} `
			}

			for (let i = 0; i < maxValues; ++i) {
				content += `| ${'-'.repeat(w)} `
			}

			content += `| ${'-'.repeat(w)} `
		}
		else if(row.type === 'separator') {
			content += `|${' '.repeat(headersLength)}${'|'.repeat(nbRowHeaders - 1)}`

			for (let i = 0; i < maxValues; ++i) {
				content += `| ${'-'.repeat(w)} `
			}

			content += `| ${'-'.repeat(w)} `
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

			if (colspan !== 0) {
				content += '|'.repeat(colspan)
			}

			if (row.search) {
				for (const { name } of headers) {
					let purchase = row.search.purchase[name]

					if(purchase) {
						sum += parseFloat(purchase) || 0

						if(typeof purchase !== 'string') {
							purchase = `${purchase.toFixed(1)}g`
						}

						content += `| ${' '.repeat(w - purchase.length)}${purchase} `
					}
					else {
						content += `| ${' '.repeat(w)} `
					}
				}
			}
			else {
				for (const header of headers) {
					content += `| ${' '.repeat(w)} `
				}
			}

			if(sum === 0) {
				content += `| ${' '.repeat(w)} `
			}
			else {
				content += `| ${' '.repeat(w - sum.toFixed(1).length - 1)}${sum.toFixed(1)}g `
			}
		}

		content += '|\n'
	}

	if(Object.keys(links).length !== 0) {
		content += '\n\n\n\n\n'

		for(const [alias, tag] of Object.entries(links)) {
			content += `\n[${alias}]: :tag:${tag}`
		}
	}
	else {
		content += '\n'
	}

	return content
} // }}}

function buildReserveContent({ nbRowHeaders, headers, rows, max, links, current }) { // {{{
	let content = `## Tea Reserve\n\n\n`

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

	if(Object.keys(links).length !== 0) {
		content += '\n\n\n\n\n'

		for(const [alias, tag] of Object.entries(links)) {
			content += `\n[${alias}]: :tag:${tag}`
		}
	}
	else {
		content += '\n'
	}

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
	const links = {}

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

			if (matchTags(search, tags, tagNoteMap, links)) {
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
		nbRowHeaders = 3

		max[2] += 2
	}
	else if(max[1]) {
		nbRowHeaders = 2

		max[1] += 1
	}
	else {
		nbRowHeaders = 1
	}

	return {
		rows,
		searchs,
		max,
		nbRowHeaders,
		hashes,
		links
	}
} // }}}

function findNote(title, noteMap) { // {{{
	for (const [key, note] of noteMap) {
		if (!note.isTrashed && note.title === title) {
			return note
		}
	}

	return null
} // }}}

function generateConsumptionSteps(firstStep, lastStep, steps, consumptions, total, firstDate, lastRem, lastDate, lastConsumption) { // {{{
	let remainings = []
	let differences = []
	let totals = []

	const firstRem = total.toFixed(1)
	const mr = firstRem.length

	let md = 0
	let mt = 0

	let last = 0

	for(let i = firstStep; i < lastStep; ++i) {
		if(!consumptions[i]) {
			consumptions[i] = 0
		}

		remainings[i] = (total - consumptions[i]).toFixed(1)
		differences[i] = (consumptions[i] - last).toFixed(1)
		totals[i] = consumptions[i].toFixed(1)

		md = Math.max(md, differences[i].length)
		mt = Math.max(mt, totals[i].length)

		last = consumptions[i]
	}

	const ld = (lastConsumption - last).toFixed(1)
	const lt = lastConsumption.toFixed(1)

	md = Math.max(md, ld.length)
	mt = Math.max(mt, lt.length)

	let content = ''

	content += `\n\t~ ${firstRem}g (${firstDate.format('DD.MM.YY')})`

	for(let i = firstStep; i < lastStep; ++i) {
		content += `\n\t~ ${' '.repeat(mr - remainings[i].length)}${remainings[i]}g (${moment(steps[i].date).format('DD.MM.YY')}, ${' '.repeat(md - differences[i].length)}${differences[i]}g, ${' '.repeat(mt - totals[i].length)}${totals[i]}g)`
	}

	content += `\n\t~ ${' '.repeat(mr - lastRem.length)}${lastRem}g (${lastDate.format('DD.MM.YY')}, ${' '.repeat(md - ld.length)}${ld}g, ${' '.repeat(mt - lt.length)}${lt}g)`

	return content
} // }}}

function generateCurrentConsumption(noteMap, tagNoteMap, dispatch) { // {{{
	for (const [key, note] of noteMap) {
		if (isMix(note)) {
			updateMix(note, noteMap, dispatch)
		}
	}

	const year = moment().format('YY')

	const mainNote = findNote(`Tea Consumption 20${year}`, noteMap)
	if(!mainNote) {
		return alert('No consumption note')
	}

	const context = buildTableContext(noteMap, tagNoteMap, (tags) => ({ tags, consumptions: {} }))

	const reserveNote = findNote('Tea Reserve', noteMap)
	if(!reserveNote) {
		return alert('No reserve note')
	}

	const reserveContext = buildTableContext(noteMap, tagNoteMap, (tags) => ({ tags, remaining: {} }))

	const current = moment().startOf('day')

	reserveContext.current = {
		name: current.format('DD.MM.YY'),
		date: current.toDate()
	}

	restoreReserveValues(reserveNote.content, reserveContext)

	for (const [key, note] of noteMap) {
		if (isBrew(note) && updateRemaining(note, reserveContext.headers, dispatch)) {
			const consumptions = getConsumptions(note)

			for (const [index, search] of context.searchs.entries()) {
				let match = true

				for (const tag of search.tags) {
					if (!note.tags.includes(tag)) {
						match = false

						break
					}
				}

				if (match) {
					for (const date in consumptions) {
						if(date.substr(3, 2) === year) {
							const search = context.searchs[index]

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
	}

	const content = buildConsumptionContent(year, context)

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

function generateSelectedConsumption(mainNote, noteMap, tagNoteMap, dispatch) { // {{{
	let match = /Tea Consumption\s+20(\d\d)/.exec(mainNote.title)
	if(!match) {
		return alert('Not a consumption note')
	}

	const year = match[1]

	for (const [key, note] of noteMap) {
		if (isMix(note)) {
			updateMix(note, noteMap, dispatch)
		}
	}

	const context = buildTableContext(noteMap, tagNoteMap, (tags) => ({ tags, consumptions: {} }))

	for (const [key, note] of noteMap) {
		if (TEST_BREW_REGEX.test(note.content)) {
			const consumptions = getConsumptions(note)

			for (const [index, search] of context.searchs.entries()) {
				let match = true

				for (const tag of search.tags) {
					if (!note.tags.includes(tag)) {
						match = false

						break
					}
				}

				if (match) {
					for (const date in consumptions) {
						if(date.substr(3, 2) === year) {
							const search = context.searchs[index]

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
	}

	const content = buildConsumptionContent(year, context)

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

function generatePurchase(noteMap, tagNoteMap, dispatch) { // {{{
	const mainNote = findNote('Tea Purchase', noteMap)
	if(!mainNote) {
		return alert('No purchase note')
	}

	const context = buildTableContext(noteMap, tagNoteMap, (tags) => ({ tags, purchase: {} }))

	context.headers = []

	for (const [key, note] of noteMap) {
		if(!note.isTrashed) {
			const match = REM_REGEX.exec(note.content)
			if(match) {
				const weight = parseFloat(match[1])
				const date = moment(match[2], 'DD.MM.YY').startOf('year').toDate()
				const name = moment(date).format('YYYY')

				let nf = true
				for (const [index, header] of context.headers.entries()) {
					if(header.date - date > 0) {
						context.headers.splice(index, 0, {
							name,
							date
						})

						nf = false
						break
					}
					else if(header.date - date === 0) {
						nf = false
						break
					}
				}

				if(nf) {
					context.headers.push({
						name,
						date
					})
				}

				for (const search of context.searchs) {
					let match = true

					for (const tag of search.tags) {
						if (!note.tags.includes(tag)) {
							match = false

							break
						}
					}

					if (match) {
						if(typeof search.purchase[name] !== 'number') {
							search.purchase[name] = weight
						}
						else {
							search.purchase[name] += weight
						}
					}
				}
			}

			resetRegex(REM_REGEX)
		}
	}

	const content = buildPurchaseContent(context)

	if (sha256(mainNote.content) !== sha256(content)) {
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
	}
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

	const current = moment().startOf('day')

	context.current = {
		name: current.format('DD.MM.YY'),
		date: current.toDate()
	}

	restoreReserveValues(mainNote.content, context)

	for (const [key, note] of noteMap) {
		if(updateRemaining(note, context.headers, dispatch)) {
			const rem = getRemaining(note)
			const rems = {}

			for (const search of context.searchs) {
				let match = true

				for (const tag of search.tags) {
					if (!note.tags.includes(tag)) {
						match = false

						break
					}
				}

				if (match) {
					if(typeof search.remaining[context.current.name] !== 'number') {
						search.remaining[context.current.name] = 0
					}

					for(const { name, date } of context.headers) {
						if(name === context.current.name) {
							search.remaining[name] += rem
						}
						else if(typeof search.remaining[name] !== 'string') {
							if(!rems[date]) {
								rems[date] = getRemainingAt(note, date, name)
							}

							search.remaining[name] = (search.remaining[name] || 0) + rems[date]
						}
					}
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

function getConsumptions(note, datePart = 2) { // {{{
	const consumptions = {}

	let mixes = null

	let match, weight
	while ((match = BREW_REGEX.exec(note.content))) {
		if (match[3]) {
			weight = parseFloat(match[3])

			if (match[4]) {
				weight += parseFloat(match[4])
			}
		}
		else {
			// hybrid mix
			if (mixes === null) {
				mixes = loadMixes(note)
			}

			const mix = mixes[match[5]]
			if (mix) {
				weight = mix['#']
			}
			else {
				weight = 0
			}
		}

		if (consumptions[match[datePart]]) {
			consumptions[match[datePart]].weight += weight
		}
		else {
			consumptions[match[datePart]] = {
				raw: match[datePart],
				date: match[datePart],
				weight
			}
		}
	}

	return consumptions
} // }}}

function getBests(content) { // {{{
	const lines = content.split(/\n/g)

	const bests = {
		from: 0,
		to: lines.length,
		brews: {}
	}

	let inbest = false

	let line, match, brew
	for(let l = 0; l < lines.length ; ++l) {
		line = lines[l]

		if(inbest) {
			if(line[0] !== '|') {
				bests.to = l - 1

				break
			}

			if(BEST_BREW_SEPARATOR_REGEX.test(line)) {
				// do nothing
			}
			else if((match = BEST_BREW_NEW_REGEX.exec(line))) {
				brew = [[match[1], match[2], match[3], match[4], match[5]]]

				bests.brews[parseInt(match[1])] = brew
			}
			else if((match = BEST_BREW_LINE_REGEX.exec(line))) {
				brew.push(['', '', match[1], match[2], match[3]])
			}
		}
		else if((match = BEST_HEADER_REGEX.exec(line))) {
			inbest = true
			bests.from = l
		}
	}

	return inbest ? bests : null
} // }}}

function getDateTag(brew) { // {{{
	return `${DATE_TAG_PREFIX}${moment(brew.date).format('YYMM')}`
} // }}}

function getRemaining(note) { // {{{
	if(isFinished(note)) {
		return 0
	}

	let last = 0

	let match
	while ((match = REM_REGEX.exec(note.content))) {
		last = parseFloat(match[1])
	}

	return last
} // }}}

function getRemainingAt(note, targetDate, targetStr) { // {{{
	let match = RegExp(`\\n\\t~\\s+([\\d\\.]+)g\\s+\\(${targetStr}`).exec(note.content)
	if(match) {
		return parseFloat(match[1])
	}
	else {
		let last = 0

		while ((match = REM_REGEX.exec(note.content))) {
			if(moment(match[2], 'DD.MM.YY') > targetDate) {
				resetRegex(REM_REGEX)

				return last
			}

			last = parseFloat(match[1])
		}

		return last
	}
} // }}}

function getWeightTag(rem) { // {{{
	if (rem < 5) {
		return `${WEIGHT_TAG_PREFIX}00`
	}
	else if (rem < 10) {
		return `${WEIGHT_TAG_PREFIX}05`
	}
	else if (rem < 15) {
		return `${WEIGHT_TAG_PREFIX}10`
	}
	else if (rem < 20) {
		return `${WEIGHT_TAG_PREFIX}15`
	}
	else if (rem >= 100) {
		return `${WEIGHT_TAG_PREFIX}99`
	}
	else {
		return `${WEIGHT_TAG_PREFIX}${parseInt(rem / 10)}0`
	}
} // }}}

function gotoNewBrew(cm) { // {{{
	const cursor = cm.getCursor()

	let line = cm.getLine(cursor.line)
	if(line[0] !== '|') {
		return 0
	}

	let from = 0
	if(BREW_NEW_REGEX.test(line)) {
		from = cursor.line
	}
	else {
		let i = cursor.line
		while(--i >= 0) {
			line = cm.getLine(i)

			if(line[0] !== '|') {
				break
			}
			else if(BREW_NEW_REGEX.test(line)) {
				from = i
				break
			}
		}
	}

	return from
} // }}}

function isBrew(note) { // {{{
	return !note.isTrashed && TEST_BREW_REGEX.test(note.content)
} // }}}

function isFinished(note) { // {{{
	return !note.isTrashed && note.tags.includes(EMPTY_TAG)
} // }}}

function isMix(note) { // {{{
	return !note.isTrashed && TEST_MIX_REGEX.test(note.content)
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

function markBest(cm, cb) { // {{{
	const from = gotoNewBrew(cm)
	if(!from) {
		return
	}

	let match = BREW_NEW_REGEX.exec(cm.getLine(from))
	let steps = [[match[2], match[3], match[4], match[5], match[6]]]
	let l = cm.lineCount()
	const brew = parseInt(match[2])

	for(let i = from + 1; i < l ; ++i) {
		if((match = BREW_LINE_REGEX.exec(cm.getLine(i)))) {
			steps.push(['', '', match[1], match[2], match[3]])
		}
		else {
			break
		}
	}

	let bests = getBests(cm.getValue())
	if(!bests) {
		cm.replaceRange(`
## Best Brewing Steps


| Volum | Weyt | Brew  | Time  | Temptr |
|:-----:|:----:|:-----:| ----- |:------:|

`, { line: l + 1, ch: 0 }, { line: l + 1, ch: 0 })

		bests = { from: l + 3, to: l + 4, brews: {} }
	}
	else if(bests.brews[brew]) {
		return
	}

	bests.brews[brew] = steps

	const weights = Object.keys(bests.brews).sort((a, b) => parseInt(a) - parseInt(b))

	let content = ''
	for(const w of weights) {
		if(content.length > 0) {
			content += '| ----- | ---- | ---- | ----- | ------ |\n'
		}

		for(const l of bests.brews[w]) {
			content += `| ${l[0]} | ${l[1]} | ${l[2]} | ${l[3]} | ${l[4]} |\n`
		}
	}

	cm.replaceRange(content, { line: bests.from + 2, ch: 0 }, { line: bests.to + 1, ch: 0 }, '|')

	cm.setCursor({ line: bests.from + 2, ch: 0 })

	cb && cb()
} // }}}

function matchTags(cells, tags, tagNoteMap, links) { // {{{
	for(const cell of cells) {
		const match = /\[(.*)\]/.exec(cell)
		const value = match && match[1] || cell

		if(cell.length === 0) {
			// all
		}
		// country
		else if(tagNoteMap.has(value)) {
			tags.push(value)

			if(match) {
				links[value] = value
			}
		}
		// style
		else if(tagNoteMap.has(`\`${value.toLowerCase()}`)) {
			tags.push(`\`${value.toLowerCase()}`)

			if(match) {
				links[value] = `\`${value.toLowerCase()}`
			}
		}
		// shop
		else if(tagNoteMap.has(`≈${value}`)) {
			tags.push(`≈${value}`)

			if(match) {
				links[value] = `≈${value}`
			}
		}
		// type
		else if(tagNoteMap.has(value.toLowerCase())) {
			tags.push(value.toLowerCase())

			if(match) {
				links[value] = value.toLowerCase()
			}
		}
		else {
			return false
		}
	}

	return true
} // }}}

function rebrewBest(note, volume, dispatch) { // {{{
	if(!isBrew(note) || note.tags.includes(EMPTY_TAG)) {
		return
	}

	const bests = getBests(note.content)

	const brew = bests.brews[volume] || (volume === 100 ? bests.brews[90] : null)

	const lines = note.content.split(/\n/g)

	let intable = false
	let last = lines.length

	let line
	for(let l = 0; l < lines.length ; ++l) {
		line = lines[l]

		if(intable) {
			if(line[0] !== '|') {
				last = l
				break
			}
		}
		else if(TEST_BREW_REGEX.test(line)) {
			intable = true
		}
	}

	const steps = brew.map((values, i) => {
		if(i) {
			return `|   |   | ${values.join(' | ')} |`
		}
		else {
			return `| ${moment().format('DD.MM.YY')} | MB | ${values.join(' | ')} |`
		}
	})

	lines.splice(last, 0, ...steps)

	note.content = lines.join('\n')

	dataApi
		.updateNote(note.storage, note.key, note)
		.then((note) => dispatch({
			type: 'UPDATE_NOTE',
			note
		}))
		.then(() => setTimeout(() => ee.emit('note:refresh'), 100))
		.then(() => setTimeout(() => ee.emit('code:format-table'), 100))
		.then(() => setTimeout(() => ee.emit('line:jump', last), 100))
} // }}}

function rebrewLast(note, dispatch) { // {{{
	if(!isBrew(note) || note.tags.includes(EMPTY_TAG)) {
		return
	}

	const lines = note.content.split(/\n/g)

	let steps
	let last
	let inbrew = false
	let intable = false

	let line, match
	for(let l = 0; l < lines.length ; ++l) {
		line = lines[l]

		if((match = BREW_NEW_REGEX.exec(line))) {
			steps = [`| ${moment().format('DD.MM.YY')} | ${match[1]} | ${match[2]} | ${match[3]} | ${match[4]} | ${match[5]} | ${match[6]} |   |   |`]

			inbrew = true
			intable = true
			last = l
		}
		else if(inbrew) {
			if((match = BREW_LINE_REGEX.exec(line))) {
				steps.push(`|   |   |   |   | ${match[1]} | ${match[2]} | ${match[3]} |   |   |`)
			}
			else {
				inbrew = false
			}

			last = l
		}
		else if(intable) {
			if(line[0] === '|') {
				last = l
			}
			else {
				intable = false
			}
		}
	}

	lines.splice(last, 0, ...steps)

	note.content = lines.join('\n')

	dataApi
		.updateNote(note.storage, note.key, note)
		.then((note) => dispatch({
			type: 'UPDATE_NOTE',
			note
		}))
		.then(() => setTimeout(() => ee.emit('note:refresh'), 100))
		.then(() => setTimeout(() => ee.emit('code:format-table'), 100))
		.then(() => setTimeout(() => ee.emit('line:jump', last), 100))
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

function resetBrew(cm, cb) { // {{{
	const from = gotoNewBrew(cm)
	if(!from) {
		return
	}

	let match = BREW_NEW_REGEX.exec(cm.getLine(from))
	let steps = `|   | ${match[1]} | ${match[2]} | ${match[3]} | ${match[4]} | ${match[5]} | ${match[6]} |   |   |\n`
	let to = from

	for(let i = from + 1, l = cm.lineCount(); i < l ; ++i) {
		if((match = BREW_LINE_REGEX.exec(cm.getLine(i)))) {
			steps += `|   |   |   |   | ${match[1]} | ${match[2]} | ${match[3]} |   |   |\n`
			to = i
		}
		else {
			break
		}
	}

	cm.replaceRange(steps, { line: from, ch: 0 }, { line: to + 1, ch: 0 }, '|')

	cm.setCursor({ line: from, ch: 0 })

	cb && cb()
} // }}}

function resetRegex(regex) { // {{{
	regex.lastIndex = 0
} // }}}

function restoreReserveValues(content, context) { // {{{
	const lines = content.split(/\n/)
	const last = lines.length - 1
	const today = moment().startOf('day')
	const headers = {}

	context.headers = []

	let match
	let i = -1

	while ((match = REPORT_HEADER_REGEX.exec(lines[3]))) {
		const date = moment(match[1], 'DD.MM.YY')

		if(date < today) {
			context.headers.push({
				name: match[1],
				date: date.toDate()
			})
		}
		else if(date > today) {
			context.current = {
				name: match[1],
				date: date.toDate()
			}
		}

		headers[match[1]] = ++i
	}

	context.headers.push(context.current)

	context.headers.sort(({ date: a }, { date: b }) => a - b)

	const nbRowHeaders = (match = /\|{2,}/.exec(lines[3])) ? match[0].length : 1

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

				resetRegex(LINK_REGEX)
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

function updateRemaining(note, steps, dispatch) { // {{{
	if(note.isTrashed) {
		return false
	}
	else if(note.tags.includes(EMPTY_TAG) && /~\s+0g\s+\(/.test(note.content)) {
		return true
	}

	const raws = Object.values(getConsumptions(note, 1)).map((o) => (o.date = moment(o.date, o.date.length === 5 ? 'MM.YY' : 'DD.MM.YY').toDate(), o)).sort(({ date: a }, { date: b }) => a - b)

	if(raws.length) {
		const initial = {}
		let lastIndex = -1

		let match
		while ((match = REM_REGEX.exec(note.content))) {
			if(!initial.index) {
				initial.index = match.index
				initial.weight = parseFloat(match[1])
				initial.date = moment(match[2], 'DD.MM.YY')
			}

			lastIndex = match.index + match[0].length
		}

		if(!initial.index) {
			const lastBrew = raws[raws.length - 1]
			const dateTag = getDateTag(lastBrew)

			let df = false

			for(let i = note.tags.length - 1; i > 0; --i) {
				if(note.tags[i][0] === DATE_TAG_PREFIX) {
					if(note.tags[i] === dateTag) {
						df = true
					}
					else {
						note.tags.splice(i, 1)
						updateTags = true
					}
				}
			}

			if(!df) {
				note.tags.push(dateTag)
				updateTags = true
			}

			if(updateTags) {
				dataApi.updateNote(note.storage, note.key, note).then((note) => {
					dispatch({
						type: 'UPDATE_NOTE',
						note
					})
				})
			}

			return false
		}

		const consumptions = []

		let consumption = 0
		let step = 0

		if(initial.date > raws[0].date) {
			initial.date = moment(raws[0].date).startOf('month')
		}

		while(initial.date >= steps[step].date) {
			++step
		}

		const firstStep = step

		for(const raw of raws) {
			while(raw.date >= steps[step].date) {
				consumptions[step] = consumption

				if(step + 1 < steps.length) {
					++step
				}
				else {
					break
				}
			}

			consumption += raw.weight
		}

		const lastStep = step
		const lastBrew = raws[raws.length - 1]
		const lastDate = lastBrew.raw.length === 5 ? moment(lastBrew.date).endOf('month') : moment(lastBrew.date).add(1, 'day')

		let content = ''
		let updateTags = false

		if(note.tags.includes(EMPTY_TAG)) {
			const total = raws.reduce((acc, val) => acc + val.weight, 0)

			content += generateConsumptionSteps(firstStep, lastStep, steps, consumptions, total, initial.date, '0', lastDate, total)

			const dateTag = getDateTag(lastBrew)
			let df = false

			for(let i = note.tags.length - 1; i > 0; --i) {
				if(note.tags[i][0] === WEIGHT_TAG_PREFIX || note.tags[i][0] === CONTAINER_TAG_PREFIX) {
					note.tags.splice(i, 1)
					updateTags = true
				}
				else if(note.tags[i][0] === DATE_TAG_PREFIX) {
					if(note.tags[i] === dateTag) {
						df = true
					}
					else {
						note.tags.splice(i, 1)
						updateTags = true
					}
				}
			}

			if(!df) {
				note.tags.push(dateTag)
				updateTags = true
			}
		}
		else {
			const total = consumption > initial.weight ? consumption + 2 : initial.weight
			const rem = total - consumption

			content += generateConsumptionSteps(firstStep, lastStep, steps, consumptions, total, initial.date, rem.toFixed(1), lastDate, consumption)

			const dateTag = getDateTag(lastBrew)
			const weightTag = getWeightTag(rem)
			let df = false
			let wf = false

			for(let i = note.tags.length - 1; i > 0; --i) {
				if(note.tags[i][0] === WEIGHT_TAG_PREFIX) {
					if(note.tags[i] === weightTag) {
						wf = true
					}
					else {
						note.tags.splice(i, 1)
						updateTags = true
					}
				}
				else if(note.tags[i][0] === DATE_TAG_PREFIX) {
					if(note.tags[i] === dateTag) {
						df = true
					}
					else {
						note.tags.splice(i, 1)
						updateTags = true
					}
				}
			}

			if(!wf) {
				note.tags.push(weightTag)
				updateTags = true
			}
			if(!df) {
				note.tags.push(dateTag)
				updateTags = true
			}
		}

		const bests = getBests(note.content)
		if(bests) {
			for(const best in bests.brews) {
				const tag = `${BEST_TAG_PREFIX}${'0'.repeat(3 - best.length)}${best}`
				const nf = !note.tags.some((t) => t === tag)

				if(nf) {
					note.tags.push(tag)
					updateTags = true
				}
			}
		}

		if(content.length) {
			content = note.content.slice(0, initial.index) + content + note.content.slice(lastIndex)

			if (sha256(note.content) !== sha256(content)) {
				note.content = content

				dataApi.updateNote(note.storage, note.key, note).then((note) => {
					dispatch({
						type: 'UPDATE_NOTE',
						note
					})
				})
			}
			else if(updateTags) {
				dataApi.updateNote(note.storage, note.key, note).then((note) => {
					dispatch({
						type: 'UPDATE_NOTE',
						note
					})
				})
			}
		}
	}
	else {
		const match = REM_REGEX.exec(note.content)

		if(match) {
			const weightTag = getWeightTag(parseFloat(match[1]))

			let updateTags = false
			let wf = false

			for(let i = note.tags.length - 1; i > 0; --i) {
				if(note.tags[i][0] === WEIGHT_TAG_PREFIX) {
					if(note.tags[i] === weightTag) {
						wf = true
					}
					else {
						note.tags.splice(i, 1)
						updateTags = true
					}
				}
			}

			if(!wf) {
				note.tags.push(weightTag)
				updateTags = true
			}

			if(updateTags) {
				dataApi.updateNote(note.storage, note.key, note).then((note) => {
					dispatch({
						type: 'UPDATE_NOTE',
						note
					})
				})
			}
		}

		resetRegex(REM_REGEX)
	}

	return true
} // }}}

export {
	generateCurrentConsumption,
	generateSelectedConsumption,
	generatePurchase,
	generateReserve,
	markBest,
	rebrewBest,
	rebrewLast,
	resetBrew,
}
