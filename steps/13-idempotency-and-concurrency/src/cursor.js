// A cursor is the sort key of the last row on a page, packed into an opaque
// string. Clients pass it back unchanged; they never build one themselves.
export function encodeCursor(task) {
  return Buffer.from(JSON.stringify([task.createdAt, task.id])).toString('base64url');
}

export function decodeCursor(cursor) {
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof createdAt !== 'string' || !Number.isInteger(id) || Number.isNaN(Date.parse(createdAt))) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
