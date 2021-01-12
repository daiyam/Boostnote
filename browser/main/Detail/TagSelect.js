import PropTypes from 'prop-types'
import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './TagSelect.styl'
import _ from 'lodash'
import i18n from 'browser/lib/i18n'
import ee from 'browser/main/lib/eventEmitter'
import Autosuggest from 'react-autosuggest'
import { TagQuery } from 'browser/main/lib/TagQuery'

class TagSelect extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			newTag: '',
			suggestions: [],
			mouseOverTag: null,
			contextMenu: false,
		}

		this.handleAddTag = this.handleAddTag.bind(this)
		this.onContextMenu = this.onContextMenu.bind(this)
		this.onInputBlur = this.onInputBlur.bind(this)
		this.onInputChange = this.onInputChange.bind(this)
		this.onInputKeyDown = this.onInputKeyDown.bind(this)
		this.onSuggestionsClearRequested = this.onSuggestionsClearRequested.bind(this)
		this.onSuggestionsFetchRequested = this.onSuggestionsFetchRequested.bind(this)
		this.onSuggestionSelected = this.onSuggestionSelected.bind(this)
		this.shouldRenderSuggestions = this.shouldRenderSuggestions.bind(this)
	}

	addNewTag(newTag) {
		newTag = newTag.trim().replace(/ +/g, '_')
		if (newTag.charAt(0) === '#') {
			newTag.substring(1)
		}

		if (newTag.length <= 0) {
			this.setState({
				newTag: ''
			})
			return
		}

		let { value } = this.props
		value = _.isArray(value)
			? value.slice()
			: []
		value.push(newTag)
		value = _.uniq(value)

		this.setState({
			newTag: ''
		}, () => {
			this.value = value
			this.props.onChange()
		})
	}

	buildSuggestions() {
		const { data, location } = this.props

		let tagList
		if (typeof location.query.storage !== 'undefined' && location.query.storage !== '') {
			const id = location.query.storage.substr(1)

			let noteMap
			if (location.query.storage[0] === 's') {
				noteMap = data.noteMap.filter(note => note.storage === id)
			} else {
				noteMap = data.noteMap.filter(note => note.folder === id)
			}

			tagList = []

			const tags = {}

			noteMap.forEach(note => {
				note.tags.forEach(name => {
					if (tags[name]) {
						tags[name].size++
					} else {
						const tag = { name, nameLC: name.toLowerCase(), size: 1 }

						tags[name] = tag

						tagList.push(tag)
					}
				})
			})
		} else {
			tagList = data.tagNoteMap.map(
				(tag, name) => ({ name, nameLC: name.toLowerCase(), size: tag.size })
			).filter(
				tag => tag.size > 0
			)
		}

		this.suggestions = _.sortBy(tagList, ['name'])
		this.storage = location.query.storage || ''
	}

	componentDidMount() {
		this.value = this.props.value

		this.buildSuggestions()

		ee.on('editor:add-tag', this.handleAddTag)
	}

	componentDidUpdate() {
		this.value = this.props.value

		if (this.storage !== this.props.location.query.storage) {
			this.buildSuggestions()
		}
	}

	componentWillUnmount() {
		ee.off('editor:add-tag', this.handleAddTag)
	}

	handleAddTag() {
		this.refs.newTag.input.focus()
	}

	handleTagLabelClick(tag) {
		const { router } = this.context
		const { location } = this.props

		TagQuery.navigate(tag, location, router)
	}

	handleTagRemoveButtonClick(tag) {
		this.removeTagByCallback((value, tag) => {
			value.splice(value.indexOf(tag), 1)
		}, tag)

		this.setState({
			mouseOverTag: ''
		})
	}

	onContextMenu(e) {
		const { data, location } = this.props
		const filter = e.altKey ? (name) => !_.includes(this.value, name) : (name) => !_.includes(this.value, name) && name.split('').every(c => c.charCodeAt(0) > 128)

		const tagList = []

		if (typeof location.query.storage !== 'undefined' && location.query.storage !== '') {
			const id = location.query.storage.substr(1)

			let noteMap
			if (location.query.storage[0] === 's') {
				noteMap = data.noteMap.filter(note => note.storage === id)
			}
			else {
				noteMap = data.noteMap.filter(note => note.folder === id)
			}

			const tags = {}

			noteMap.forEach(note => {
				note.tags.forEach(name => {
					if (tags[name]) {
						tags[name].size++
					}
					else if (filter(name)) {
						const tag = { name, nameLC: name.toLowerCase(), size: 1 }

						tags[name] = tag

						tagList.push(tag)
					}
				})
			})
		}
		else {
			data.tagNoteMap.forEach((tag, name) => {
				if (tag.size > 0 && filter(name)) {
					tagList.push({ name, nameLC: name.toLowerCase(), size: tag.size })
				}
			})
		}

		this.setState({
			contextMenu: true,
			suggestions: _.sortBy(tagList, ['name'])
		})
	}

	onInputBlur(e) {
		this.submitNewTag()
	}

	onInputChange(e, { newValue, method }) {
		this.setState({
			newTag: newValue,
			contextMenu: false
		})
	}

	onInputKeyDown(e) {
		switch (e.keyCode) {
			case 9:
				e.preventDefault()
				this.submitNewTag()
				break
			case 13:
				this.submitNewTag()
				break
			default:
				if (this.suggestions.length !== 0 && this.state.suggestions.length === 0) {
					this.setState({
						suggestions: _.filter(
							this.suggestions,
							tag => !_.includes(this.value, tag.name)
						)
					})
				}
		}
	}

	onSuggestionsClearRequested() {
		this.setState({
			suggestions: [],
			contextMenu: false
		})
	}

	onSuggestionsFetchRequested({ value }) {
		const valueLC = value.toLowerCase()
		const suggestions = _.filter(
			this.suggestions,
			tag => !_.includes(this.value, tag.name) && tag.nameLC.indexOf(valueLC) !== -1
		)

		this.setState({
			suggestions
		})
	}

	onSuggestionSelected(event, { suggestion, suggestionValue }) {
		this.addNewTag(suggestionValue)

		this.setState({
			contextMenu: false
		})
	}

	removeLastTag() {
		this.removeTagByCallback((value) => {
			value.pop()
		})
	}

	removeTagByCallback(callback, tag = null) {
		let { value } = this.props

		value = _.isArray(value)
			? value.slice()
			: []
		callback(value, tag)
		value = _.uniq(value)

		this.value = value
		this.props.onChange()
	}

	reset() {
		this.buildSuggestions()

		this.setState({
			newTag: ''
		})
	}

	setMouseOver(tag) {
		this.setState({
			mouseOverTag: tag
		})
	}

	shouldRenderSuggestions(value) {
		if(this.state.suggestions.length === 0) {
			return false
		}
		if(value.length === 0 && !this.state.contextMenu) {
			return false
		}

		return true
	}

	submitNewTag() {
		this.addNewTag(this.refs.newTag.input.value)
	}

	render() {
		const { value, className, showTagsAlphabetically } = this.props
		const { newTag, suggestions, mouseOverTag } = this.state

		const tagList = _.isArray(value)
			? (showTagsAlphabetically ? _.sortBy(value) : value).map((tag) => {
				return (
					<span styleName='tag'
						key={tag}
						className={mouseOverTag === tag ? 'TagSelect__over___browser-main-Detail-' : ''}
					>
						<span styleName='tag-label' onClick={(e) => this.handleTagLabelClick(tag)}>#{tag}</span>
						<button styleName='tag-removeButton'
							onClick={(e) => this.handleTagRemoveButtonClick(tag)}
							onMouseEnter={(e) => this.setMouseOver(tag)}
							onMouseLeave={(e) => this.setMouseOver(null)}
						>
							<img className='tag-removeButton-icon' src='../resources/icon/icon-x.svg' width='8px' />
						</button>
					</span>
				)
			})
			: []

		return (
			<div className={_.isString(className)
				? 'TagSelect ' + className
				: 'TagSelect'
			}
				styleName='root'
			>
				{tagList}
				<Autosuggest
					ref='newTag'
					suggestions={suggestions}
					onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
					onSuggestionsClearRequested={this.onSuggestionsClearRequested}
					onSuggestionSelected={this.onSuggestionSelected}
					getSuggestionValue={suggestion => suggestion.name}
					shouldRenderSuggestions={this.shouldRenderSuggestions}
					renderSuggestion={suggestion => <div>{suggestion.name}</div>}
					inputProps={{
						placeholder: i18n.__('Add tag...'),
						value: newTag,
						onChange: this.onInputChange,
						onKeyDown: this.onInputKeyDown,
						onBlur: this.onInputBlur,
						onContextMenu: this.onContextMenu
					}}
				/>
			</div>
		)
	}
}

TagSelect.contextTypes = {
	router: PropTypes.shape({})
}

TagSelect.propTypes = {
	className: PropTypes.string,
	value: PropTypes.arrayOf(PropTypes.string),
	onChange: PropTypes.func
}

export default CSSModules(TagSelect, styles)
