/**
* @fileoverview Micro component for showing TagList.
*/
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styles from './TagListItem.styl'
import CSSModules from 'browser/lib/CSSModules'
import { TagState } from 'browser/main/lib/TagQuery'

/**
* @param {string} name
* @param {Function} handleClickTagListItem
* @param {Function} handleClickNarrowToTag
* @param {bool} isActive
* @param {bool} isRelated
*/
class TagListItem extends Component {
	constructor(props) {
		super(props)

		this.state = {
			icon: props.state === TagState.POSITIVE ? 'fa fa-minus-circle' : 'fa fa-plus-circle',
			newState: !props.state ? TagState.POSITIVE : null
		}

		this.handleMouseOver = this.handleMouseOver.bind(this)
		this.handleMouseOut = this.handleMouseOut.bind(this)
	}

	handleMouseOver(e) {
		const { isRelated, state } = this.props

		if(isRelated) {
			if(e.altKey) {
				this.setState({
					icon: !state || state === TagState.POSITIVE ? 'fa fa-minus-circle' : 'fa fa-plus-circle',
					newState: !state ? TagState.NEGATIVE : null
				})
			}
			else {
				this.setState({
					icon: state === TagState.POSITIVE ? 'fa fa-minus-circle' : 'fa fa-plus-circle'
				})
			}
		}
	}

	handleMouseOut(e) {
		const { isRelated, state } = this.props

		if(isRelated) {
			this.setState({
				icon: state === TagState.POSITIVE ? 'fa fa-minus-circle' : 'fa fa-plus-circle',
				newState: !state ? TagState.POSITIVE : null
			})
		}
	}

	render() {
		const { name, handleClickTagListItem, handleClickNarrowToTag, handleContextMenu, state, isRelated, count } = this.props
		const { newState, icon } = this.state

		return (
			<div styleName='tagList-itemContainer' onContextMenu={e => handleContextMenu(e, name)}>
				{
					isRelated
					?
					<button styleName={state ? 'tagList-itemNarrow-active' : 'tagList-itemNarrow'} onClick={() => handleClickNarrowToTag(name, newState)} onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
						<i className={icon} />
					</button>
					:
					<div styleName={'tagList-itemNarrow'} />
				}
				<button styleName={state ? 'tagList-item-active' : 'tagList-item'} onClick={() => handleClickTagListItem(name)}>
					<span styleName='tagList-item-name'>
						{`# ${name}`}
						<span styleName='tagList-item-count'>{count !== 0 ? count : ''}</span>
					</span>
				</button>
			</div>
		)
	}
}

TagListItem.propTypes = {
	name: PropTypes.string.isRequired,
	handleClickTagListItem: PropTypes.func.isRequired
}

export default CSSModules(TagListItem, styles)
