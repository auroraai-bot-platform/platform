export function createPrefix(env: string, stack: string) {
  return `${env}-${stack.toLowerCase().split('stack')[0]}-`;
}