import { ReadStream } from 'fs'

const unirest = require('unirest')

export interface FileInfo {
  contentType?: string,
  filename    : string,
  knownLength : number,
}

type RequestType = 'json' | 'html'

interface UnirestRequest<T> extends Promise<{ body: T }> {
  attach : (formName: string, buf: Buffer | ReadStream, info?: FileInfo) => UnirestRequest<T>
  type   : (t: RequestType) => UnirestRequest<T>
  field  : (payload: Object) => UnirestRequest<T>
  send   : (payload: Object | Buffer | string) => UnirestRequest<T>
  end    : (resolve: (result: any) => void) => UnirestRequest<T>
}

export interface SimpleUnirest {
  get: <T=unknown>(url: string) => UnirestRequest<T>
  post: <T=unknown>(url: string) => UnirestRequest<T>
}

function getSimpleUnirest (
  endpoint : string, headers?: object
): SimpleUnirest {
  // const auth = 'Basic ' + Buffer.from(apiKey + ':' + 'X').toString('base64')
  headers = {
  //   Authorization: auth,
    ...headers,
  }

  return {
    get: (url: string) => unirest
      .get(endpoint + url)
      .headers(headers),

    post: (url: string) => unirest
      .post(endpoint + url)
      .headers(headers),
  }
}

export { getSimpleUnirest }
