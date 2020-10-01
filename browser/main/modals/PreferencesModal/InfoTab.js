import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './InfoTab.styl'
import ConfigManager from 'browser/main/lib/ConfigManager'
import store from 'browser/main/store'
import _ from 'lodash'
import i18n from 'browser/lib/i18n'

const electron = require('electron')
const { shell, remote } = electron
const appVersion = remote.app.getVersion()

class InfoTab extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      config: this.props.config
    }
  }

  handleLinkClick(e) {
    shell.openExternal(e.currentTarget.href)
    e.preventDefault()
  }

  render() {
    return (
      <div styleName='root'>

        <div styleName='header--sub'>{i18n.__('About')}</div>

        <div styleName='top'>
          <div styleName='icon-space'>
            <img styleName='icon' src='../resources/app.png' width='92' height='92' />
            <div styleName='icon-right'>
              <div styleName='appId'>{i18n.__('Teanote')} {appVersion}</div>
              <div styleName='description'>
                {i18n.__('An open source tea-taking app made for tea connoisseurs just like you.')}
              </div>
            </div>
          </div>
        </div>

        <ul styleName='list'>
          <li styleName='cc'>
            {i18n.__('Copyright © 2017 - 2020 BoostIO & daiyam')}
          </li>
          <li styleName='cc'>
            {i18n.__('License: GPL v3')}
          </li>
        </ul>

      </div>
    )
  }
}

InfoTab.propTypes = {
}

export default CSSModules(InfoTab, styles)
