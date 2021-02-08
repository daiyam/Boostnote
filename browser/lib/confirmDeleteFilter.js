import electron from 'electron'
import i18n from 'browser/lib/i18n'
const { remote } = electron
const { dialog } = remote

export function confirmDeleteFilter() {
	const alertConfig = {
		type: 'warning',
		message: i18n.__('Confirm filter deletion'),
		detail: i18n.__('This will permanently remove this filter.'),
		buttons: [i18n.__('Confirm'), i18n.__('Cancel')]
	}

	const dialogButtonIndex = dialog.showMessageBox(
		remote.getCurrentWindow(), alertConfig
	)

	return dialogButtonIndex === 0
}
