import PropTypes from 'prop-types'
import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './CreateFilterModal.styl'
import ModalEscButton from 'browser/components/ModalEscButton'
import i18n from 'browser/lib/i18n'
import ConfigManager from 'browser/main/lib/ConfigManager'

class CreateFilterModal extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			name: ''
		}
	}

	componentDidMount() {
		this.refs.name.focus()
		this.refs.name.select()
	}

	confirm() {
		const name = this.state.name.trim()

		if (name.length > 0) {
			const { close, dispatch, filters, query } = this.props
			const { includes, excludes } = query

			const tagFilters = [...filters, {
				name,
				includes: [...includes],
				excludes: [...excludes]
			}]

			tagFilters.sort((a, b) => a.name.localeCompare(b.name))

			const config = {
				tagFilters
			}

			ConfigManager.set(config)

			dispatch({
				type: 'SET_CONFIG',
				config
			})

			close()
		}
	}

	handleChange(e) {
		this.setState({
			name: this.refs.name.value
		})
	}

	handleCloseButtonClick(e) {
		this.props.close()
	}

	handleInputKeyDown(e) {
		if (e.keyCode === 13) {
			this.confirm()
		}
	}

	handleKeyDown(e) {
		if (e.keyCode === 27) {
			this.props.close()
		}
	}

	handleConfirmButtonClick(e) {
		this.confirm()
	}

	render() {
		return (
			<div styleName='root'
				tabIndex='-1'
				onKeyDown={(e) => this.handleKeyDown(e)}
			>
				<div styleName='header'>
					<div styleName='title'>{i18n.__('Create new filter')}</div>
				</div>
				<ModalEscButton handleEscButtonClick={(e) => this.handleCloseButtonClick(e)} />
				<div styleName='control'>
					<div styleName='control-filter'>
						<div styleName='control-filter-label'>{i18n.__('Filter name')}</div>
						<input styleName='control-filter-input'
							ref='name'
							value={this.state.name}
							onChange={(e) => this.handleChange(e)}
							onKeyDown={(e) => this.handleInputKeyDown(e)}
						/>
					</div>
					<button styleName='control-confirmButton'
						onClick={(e) => this.handleConfirmButtonClick(e)}
					>
						{i18n.__('Create')}
					</button>
				</div>
			</div>
		)
	}
}

CreateFilterModal.propTypes = {
	storage: PropTypes.shape({
		key: PropTypes.string
	})
}

export default CSSModules(CreateFilterModal, styles)
