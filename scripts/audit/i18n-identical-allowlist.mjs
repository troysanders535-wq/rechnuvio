/**
 * English/German pairs that are legitimately identical.
 *
 * The i18n patch validator rejects a German value that is byte-identical to
 * its English source, because that is the signature of an untranslated string.
 * A short list of exceptions is genuine: format names, proper nouns, unit
 * labels and technical terms that German spells exactly the same way.
 *
 * Every entry is keyed by "<namespace>::<key>" and carries the reason it is
 * allowed, so the exemption is auditable rather than a blanket "ignore".
 */

export const IDENTICAL_ALLOWED = new Map([
  // Dog life-stage label: "Senior" is the German word as well.
  ["ui.calculators.DateTools::stageSenior", "life-stage label, same German word"],

  // Encoding unit names: the format is called "Text" / "Morse" in German too.
  ["ui.engines.EncodingConvertersEngine::unitText", "encoding unit name"],
  ["ui.engines.EncodingConvertersEngine::unitMorse", "proper noun"],

  // OpenGraph template preset name, shown as a template identifier.
  ["ui.engines.image::ogTemplateMinimal", "template preset identifier"],

  // 3D export format group names - file-format categories, not prose.
  ["ui.engines.viewer3d.Model3DViewer::formatGroupMesh", "3D format group name"],
  ["ui.engines.viewer3d.Model3DViewer::formatGroupStandard", "3D format group name"],
  ["ui.engines.viewer3d.Model3DViewer::formatGroupAsset", "3D format group name"],

  // Dice face label; the German die uses "Normal" as well.
  ["ui.engines.TextDiceWorkspace::normal", "dice face label"],

  // "Tokens" is the established German term for LLM tokens.
  ["ui.engines.TextTokenWorkspace::summaryTokens", "technical term"]
]);

/**
 * @param {string} namespace catalogue namespace of the patch
 * @param {string} key message key inside the namespace
 * @param {string} value the identical English/German text
 * @returns {string|null} the exemption reason, or null when not exempt
 */
export function identicalExemption(namespace, key, value) {
  const reason = IDENTICAL_ALLOWED.get(`${namespace}::${key}`);
  if (reason) return reason;
  // A value that is only a punctuation-free single word and is part of the
  // allowlisted technical vocabulary stays exempt even if the namespace moved.
  if (/^[A-Z][a-z]{2,}$/.test(value) && ALLOWED_TERMS.has(value)) {
    return "technical term";
  }
  return null;
}

const ALLOWED_TERMS = new Set([
  "Mesh",
  "Standard",
  "Asset",
  "Minimal",
  "Normal",
  "Senior",
  "Morse"
]);
