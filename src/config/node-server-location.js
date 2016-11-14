let value;

export function getServerLocation() {
  if (value === undefined) {
    throw new Error('Cannot get node-server-location before it has been set');
  }
  return value;
}
export function setServerLocation(v) {
  value = v;
}
