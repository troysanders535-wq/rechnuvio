type Messages = Record<string, unknown>;

/**
 * Builds a message object holding only the given dotted namespaces
 * (e.g. "ui.engines.json"), so a client provider can be given just the
 * strings a component tree reads instead of the whole catalog.
 */
export function pickMessages(messages: Messages, namespaces: string[]): Messages {
  const picked: Messages = {};
  for (const namespace of namespaces) {
    const path = namespace.split(".");
    let source: unknown = messages;
    for (const key of path) {
      if (source === null || typeof source !== "object") {
        source = undefined;
        break;
      }
      source = (source as Messages)[key];
    }
    if (source === undefined) continue;

    let target = picked;
    path.forEach((key, index) => {
      if (index === path.length - 1) {
        target[key] = source;
      } else {
        if (typeof target[key] !== "object" || target[key] === null) target[key] = {};
        target = target[key] as Messages;
      }
    });
  }
  return picked;
}
