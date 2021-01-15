import PropTypes from 'prop-types'
import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import dataApi from 'browser/main/lib/dataApi'
import styles from './SideNav.styl'
import { openModal } from 'browser/main/lib/modal'
import PreferencesModal from 'browser/main/modals/PreferencesModal'
import RenameTagModal from 'browser/main/modals/RenameTagModal'
import ConfigManager from 'browser/main/lib/ConfigManager'
import StorageItem from './StorageItem'
import TagListItem from 'browser/components/TagListItem'
import SideNavFilter from 'browser/components/SideNavFilter'
import StorageList from 'browser/components/StorageList'
import NavToggleButton from 'browser/components/NavToggleButton'
import ee from 'browser/main/lib/eventEmitter'
import PreferenceButton from './PreferenceButton'
import ListButton from './ListButton'
import TagButton from './TagButton'
import { SortableContainer } from 'react-sortable-hoc'
import i18n from 'browser/lib/i18n'
import context from 'browser/lib/context'
import { remote } from 'electron'
import { confirmDeleteNote } from 'browser/lib/confirmDeleteNote'
import { TagQuery, TagState } from 'browser/main/lib/TagQuery'

class SideNav extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			prefix: ''
		}
	}

	componentDidMount() { // {{{
		ee.on('side:preferences', this.handleMenuButtonClick)
	} // }}}

	componentWillUnmount() { // {{{
		ee.off('side:preferences', this.handleMenuButtonClick)
	} // }}}

	emptyTrash(entries) { // {{{
		const { dispatch } = this.props
		const deletionPromises = entries.map((note) => {
			return dataApi.deleteNote(note.storage, note.key)
		})
		const { confirmDeletion } = this.props.config.ui
		if (!confirmDeleteNote(confirmDeletion, true)) return
		Promise.all(deletionPromises)
			.then((arrayOfStorageAndNoteKeys) => {
				arrayOfStorageAndNoteKeys.forEach(({ storageKey, noteKey }) => {
					dispatch({ type: 'DELETE_NOTE', storageKey, noteKey })
				})
			})
			.catch((err) => {
				console.error('Cannot Delete note: ' + err)
			})
	} // }}}

	handleClickTagListItem(tag) { // {{{
		const { router } = this.context
		const { location } = this.props

		const query = new TagQuery().addPositiveTag(tag)

		query.navigate(location, router)
	} // }}}

	handleClickNarrowToTag(tag, newState) { // {{{
		const { router } = this.context
		const { location } = this.props

		const query = new TagQuery(location.pathname)

		if (newState === TagState.NEGATIVE) {
			if (!query.isNegativeTag(tag)) {
				query.addNegativeTag(tag)
			}
		}
		else if (newState === TagState.POSITIVE) {
			if (!query.isPositiveTag(tag)) {
				query.addPositiveTag(tag)
			}
		}
		else {
			if (query.isPositiveTag(tag)) {
				query.removePositiveTag(tag)
			}
			else {
				query.removeNegativeTag(tag)
			}
		}

		query.navigate(location, router)
	} // }}}

	handleDeleteTagClick(tag) { // {{{
		const selectedButton = remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			ype: 'warning',
			message: i18n.__('Confirm tag deletion'),
			detail: i18n.__('This will permanently remove this tag.'),
			buttons: [i18n.__('Confirm'), i18n.__('Cancel')]
		})

		if (selectedButton === 0) {
			const { data, dispatch, location, params } = this.props

			const notes = data.noteMap
				.map(note => note)
				.filter(note => note.tags.indexOf(tag) !== -1)
				.map(note => {
					note = Object.assign({}, note)
					note.tags = note.tags.slice()

					note.tags.splice(note.tags.indexOf(tag), 1)

					return note
				})

			Promise
				.all(notes.map(note => dataApi.updateNote(note.storage, note.key, note)))
				.then(updatedNotes => {
					updatedNotes.forEach(note => {
						dispatch({
							type: 'UPDATE_NOTE',
							note
						})
					})

					if (TagQuery.isTagQuery(location.pathname)) {
						const query = new TagQuery(location.pathname)

						if (query.removeTag(tag)) {
							query.navigate(location, this.context.router)
						}
					}
				})
		}
	} // }}}

	handleFilterButtonContextMenu(event) { // {{{
		const { data } = this.props
		const trashedNotes = data.trashedSet.toJS().map((uniqueKey) => data.noteMap.get(uniqueKey))
		context.popup([
			{ label: i18n.__('Empty Trash'), click: () => this.emptyTrash(trashedNotes) }
		])
	} // }}}

	handleHomeButtonClick(e) { // {{{
		const { router } = this.context
		router.push('/home')
	} // }}}

	handleMenuButtonClick(e) { // {{{
		openModal(PreferencesModal)
	} // }}}

	handlePrefixChange(e) { // {{{
		this.setState({
			prefix: e.target.value
		})
	} // }}}

	handleRenameTagClick(tagName) { // {{{
		const { data, dispatch, location, params } = this.props
		const { router } = this.context

		openModal(RenameTagModal, {
			tagName,
			data,
			dispatch,
			location,
			params,
			router
		})
	} // }}}

	handleStorageChange(e) { // {{{
		const { router } = this.context
		const { data, location } = this.props

		const storage = e.target.value
		const id = storage.substr(1)
		const test = storage[0] === 'f' ? (note) => data.noteMap.get(note).folder === id : (note) => data.noteMap.get(note).storage === id

		let key = location.query.key || ''
		if (key && !test(key)) {
			key = ''
		}

		const query = new TagQuery(location.pathname)

		query.filter((tag) => data.tagNoteMap.get(tag).some((note) => test(note)))

		const pathname = query.toPath()

		router.push({
			pathname,
			query: {
				key,
				search: location.query.search || '',
				storage
			}
		})
	} // }}}

	handleSortTagsByChange(e) { // {{{
		const { dispatch } = this.props

		const config = {
			sortTagsBy: e.target.value
		}

		ConfigManager.set(config)
		dispatch({
			type: 'SET_CONFIG',
			config
		})
	} // }}}

	handleStarredButtonClick(e) { // {{{
		const { router } = this.context
		router.push('/starred')
	} // }}}

	handleSwitchFoldersButtonClick() { // {{{
		const { router } = this.context
		router.push('/home')
	} // }}}

	handleSwitchTagsButtonClick() { // {{{
		const { router } = this.context
		const { location } = this.props

		router.push({
			pathname: `/alltags`,
			query: {
				key: location.query.key || '',
				search: '',
				storage: location.query.storage || ''
			}
		})
	} // }}}

	handleTagContextMenu(e, tag) { // {{{
		context.popup([
			{
				label: i18n.__('Rename Tag'),
				click: this.handleRenameTagClick.bind(this, tag)
			},
			{
				type: 'separator'
			},
			{
				label: i18n.__('Delete Tag'),
				click: this.handleDeleteTagClick.bind(this, tag)
			}
		])
	} // }}}

	handleToggleButtonClick(e) { // {{{
		const { dispatch, config } = this.props

		ConfigManager.set({ isSideNavFolded: !config.isSideNavFolded })
		dispatch({
			type: 'SET_IS_SIDENAV_FOLDED',
			isFolded: !config.isSideNavFolded
		})
	} // }}}

	handleTrashedButtonClick(e) { // {{{
		const { router } = this.context
		router.push('/trashed')
	} // }}}

	onSortEnd(storage) { // {{{
		return ({ oldIndex, newIndex }) => {
			const { dispatch } = this.props
			dataApi
				.reorderFolder(storage.key, oldIndex, newIndex)
				.then((data) => {
					dispatch({ type: 'REORDER_FOLDER', storage: data.storage })
				})
		}
	} // }}}

	render() { // {{{
		const { data, location, config, dispatch } = this.props

		const isFolded = config.isSideNavFolded

		const storageList = data.storageMap.map((storage, key) => {
			const SortableStorageItem = SortableContainer(StorageItem)
			return <SortableStorageItem
				key={storage.key}
				storage={storage}
				data={data}
				location={location}
				isFolded={isFolded}
				dispatch={dispatch}
				onSortEnd={this.onSortEnd.bind(this)(storage)}
				useDragHandle
			/>
		})

		const style = {}
		if (!isFolded) {
			style.width = this.props.width
		}

		const isTagActive = location.pathname.match(/tag/)

		const isFolderMode = !location.pathname.match('/tags') && !location.pathname.match('/alltags')

		return (
			<div className='SideNav'
				styleName={isFolded ? 'root--folded' : 'root'}
				tabIndex='1'
				style={style}
			>
				<div styleName='top'>
					<div styleName='switch-buttons'>
						<ListButton onClick={this.handleSwitchFoldersButtonClick.bind(this)} isTagActive={isTagActive} />
						<TagButton onClick={this.handleSwitchTagsButtonClick.bind(this)} isTagActive={isTagActive} />
					</div>
					<div>
						<PreferenceButton onClick={this.handleMenuButtonClick} />
					</div>
				</div>
				{ isFolderMode ? this.renderFolderMode(isFolded, storageList) : this.renderTagMode(isFolded, storageList) }
			</div>
		)
	} // }}}

	renderFolderMode() { // {{{
		const { location, data } = this.props

		const isHomeActive = !!location.pathname.match(/^\/home$/)
		const isStarredActive = !!location.pathname.match(/^\/starred$/)
		const isTrashedActive = !!location.pathname.match(/^\/trashed$/)

		return (
			<div>
				<SideNavFilter
					isFolded={isFolded}
					isHomeActive={isHomeActive}
					handleAllNotesButtonClick={(e) => this.handleHomeButtonClick(e)}
					isStarredActive={isStarredActive}
					isTrashedActive={isTrashedActive}
					handleStarredButtonClick={(e) => this.handleStarredButtonClick(e)}
					handleTrashedButtonClick={(e) => this.handleTrashedButtonClick(e)}
					counterTotalNote={data.noteMap._map.size - data.trashedSet._set.size}
					counterStarredNote={data.starredSet._set.size}
					counterDelNote={data.trashedSet._set.size}
					handleFilterButtonContextMenu={this.handleFilterButtonContextMenu.bind(this)}
				/>

				<StorageList storageList={storageList} isFolded={isFolded} />
				<NavToggleButton isFolded={isFolded} handleToggleButtonClick={this.handleToggleButtonClick.bind(this)} />
			</div>
		)
	} // }}}

	renderTagList() { // {{{
		const { data, location, config } = this.props
		const { prefix } = this.state

		const query = new TagQuery(location.pathname)
		const relatedTags = query.listRelatedTags(data.noteMap)

		let tagList
		let noteMap = data.noteMap

		if (typeof location.query.storage !== 'undefined' && location.query.storage !== '') {
			const id = location.query.storage.substr(1)

			if (location.query.storage[0] === 's') {
				noteMap = noteMap.filter(note => !note.isTrashed && note.storage === id)
			} else {
				noteMap = noteMap.filter(note => !note.isTrashed && note.folder === id)
			}

			tagList = []

			const tags = {}

			noteMap.forEach(note => {
				note.tags.forEach(name => {
					if (tags[name]) {
						tags[name].size++
					}
					else if (!prefix || name[0] === prefix) {
						const tag = { name, size: 1, related: relatedTags.has(name) }

						tags[name] = tag

						tagList.push(tag)
					}
				})
			})
		}
		else {
			tagList = data.tagNoteMap
				.map((tag, name) => ({
					name,
					size: tag.reduce((acc, note) => acc + (noteMap.get(note).isTrashed ? 0 : 1), 0),
					related: relatedTags.has(name)
				}))
				.filter(tag => tag.size > 0 && (!prefix || tag.name[0] === prefix))
		}

		query.forEachNegatives((name) => tagList.push({ name, size: 0, related: true }))

		tagList = _.sortBy(tagList, ['name'])

		if (config.ui.enableLiveNoteCounts && !query.isEmpty()) {
			const notesTags = noteMap.map(note => !note.isTrashed && note.tags || [])

			tagList = tagList.map(tag => {
				tag.size = notesTags.filter(tags => tags.includes(tag.name) && query.isMatchedBy(tags)).length
				return tag
			})
		}

		if (config.sortTagsBy === 'COUNTER') {
			tagList = _.sortBy(tagList, item => (0 - item.size))
		}

		if (config.ui.showOnlyRelatedTags && (relatedTags.size > 0)) {
			tagList = tagList.filter(
				tag => tag.related
			)
		}

		return (
			tagList.map(tag => {
				return (
					<TagListItem
						name={tag.name}
						handleClickTagListItem={this.handleClickTagListItem.bind(this)}
						handleClickNarrowToTag={this.handleClickNarrowToTag.bind(this)}
						handleContextMenu={this.handleTagContextMenu.bind(this)}
						state={query.getTagState(tag.name)}
						isRelated={tag.related}
						key={tag.name}
						count={tag.size}
					/>
				)
			})
		)
	} // }}}

	renderTagMode() { // {{{
		const { location, data, config } = this.props

		const prefixes = []
		if (typeof location.query.storage !== 'undefined' && location.query.storage !== '') {
			const id = location.query.storage.substr(1)

			data.noteMap
				.filter(location.query.storage[0] === 's' ? note => !note.isTrashed && note.storage === id : note => !note.isTrashed && note.folder === id)
				.forEach(note => {
					note.tags.forEach(name => {
						if(name.charCodeAt(0) > 128 && !prefixes.includes(name[0])) {
							prefixes.push(name[0])
						}
					})
				})
		}
		else {
			data.tagNoteMap.forEach((_, name) => {
				if(name.charCodeAt(0) > 128 && !prefixes.includes(name[0])) {
					prefixes.push(name[0])
				}
			})
		}

		prefixes.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0))

		return (
			<div styleName='tabBody'>
				<div styleName='tag-control'>
					<div styleName='tag-control-prefix'>
						<i className='fa fa-angle-down' />
						<select
							styleName='tag-control-prefix-select'
							value={this.state.prefix}
							onChange={(e) => this.handlePrefixChange(e)}
						>
							<option value=''>Tags</option>
							{ prefixes.map(title => <option value={title}>{title}</option>) }
						</select>
					</div>
					<div styleName='tag-control-sortTagsBy'>
						<i className='fa fa-angle-down' />
						<select
							styleName='tag-control-sortTagsBy-select'
							title={i18n.__('Select filter mode')}
							value={config.sortTagsBy}
							onChange={(e) => this.handleSortTagsByChange(e)}
						>
							<option title='Sort alphabetically'
								value='ALPHABETICAL'>{i18n.__('Alphabetically')}</option>
							<option title='Sort by update time'
								value='COUNTER'>{i18n.__('Counter')}</option>
						</select>
					</div>
				</div>
				<div styleName='tagList'>
					{this.renderTagList(data)}
				</div>
				<div styleName='tag-control'>
					<div styleName='tag-control-storage'>
						<i className='fa fa-angle-down' />
						<select styleName='tag-control-storage-select'
							value={location.query.storage}
							onChange={(e) => this.handleStorageChange(e)}
						>
							<option title='All notes' value=''>{i18n.__('All notes')}</option>
							{data.storageMap.map(storage => [
								(<option value={`s${storage.key}`}>{storage.name}</option>),
								...storage.folders.map(folder => (
									<option value={`f${folder.key}`}>&nbsp; &nbsp; {folder.name}</option>
								))
							])}
						</select>
					</div>
				</div>
			</div>
		)
	} // }}}
}

SideNav.contextTypes = {
	router: PropTypes.shape({})
}

SideNav.propTypes = {
	dispatch: PropTypes.func,
	storages: PropTypes.array,
	config: PropTypes.shape({
		isSideNavFolded: PropTypes.bool
	}),
	location: PropTypes.shape({
		pathname: PropTypes.string
	})
}

export default CSSModules(SideNav, styles)
