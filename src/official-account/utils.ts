export function getTimeStampString (): string {
  let now: number = new Date().getTime()
  if (now > 9999999999) {
    now = Math.ceil(now / 1000)
  }
  return now.toString()
}
