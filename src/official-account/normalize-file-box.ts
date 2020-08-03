import {
  FileBox,
  FileBoxType,
}               from 'file-box'
import {
  log,
}               from 'wechaty'

import {
  FileInfo,
}                     from './simple-unirest'

const normalizeFileBox = async (fileBox: FileBox): Promise<{ buf: Buffer, info: FileInfo}> => {
  log.verbose('WechatyPluginFreshdesk', 'normalizeFileBox({type: "%s", name: "%s"})',
    FileBoxType[fileBox.type()],
    fileBox.name,
  )

  const buf = await fileBox.toBuffer()
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
