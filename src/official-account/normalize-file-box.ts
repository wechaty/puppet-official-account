import {
  FileBox,
  FileBoxType,
}               from 'file-box'
import {
  log,
}               from 'wechaty-puppet'

import type {
  FileInfo,
}                     from './simple-unirest.js'

const normalizeFileBox = async (fileBox: FileBox): Promise<{ buf: Buffer, info: FileInfo}> => {
  log.verbose('WechatyPluginFreshdesk', 'normalizeFileBox({type: "%s", name: "%s"})',
    FileBoxType[fileBox.type],
    fileBox.name,
  )

  const buf    = await fileBox.toBuffer()
  const length = buf.byteLength

  const info: FileInfo = {
    contentType : fileBox.mimeType,
    filename    : fileBox.name.trim(),
    knownLength : length,
  }

  return {
    buf,
    info,
  }
}

export { normalizeFileBox }
