/**
 * Add the developer-suite workspace strings to the message catalogues.
 *
 * The developer-suite workspaces were rebuilt with their own panels, so they
 * need their own namespace. This script merges the keys into src/messages/
 * en.json and src/messages/de.json without dropping anything that is already
 * there.
 *
 * Usage: node scripts/audit/add-dev-i18n.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const EN = {
  xmlFormatterTitle: "XML Formatter",
  xmlFormatterSubtitle: "Indent an XML document and keep its attributes and text.",
  xmlValidatorTitle: "XML Validator",
  xmlValidatorSubtitle: "Check whether an XML document is well formed.",
  xmlViewerTitle: "XML Viewer",
  xmlViewerSubtitle: "Read an XML document as a tree of elements and attributes.",
  xsdEditorTitle: "XSD Schema Editor",
  xsdEditorSubtitle: "Edit an XSD schema and read its declarations.",
  xsdSchemaViewerTitle: "XSD Schema Viewer",
  xsdSchemaViewerSubtitle: "List the types an XSD schema defines.",
  xsdViewerTitle: "XSD Element Viewer",
  xsdViewerSubtitle: "List the elements and attributes an XSD schema declares.",
  formatXml: "Format XML",
  validateXml: "Validate XML",
  buildTree: "Build tree",
  checkSchema: "Check schema",
  listTypes: "List types",
  listElements: "List elements",
  xmlParseError: "The document could not be parsed.",
  xmlIsWellFormed: "The document is well-formed XML.",
  noXsdDeclarations: "The schema declares no element and no attribute.",
  noXsdTypes: "The schema defines no type.",
  pasteXmlHere: "Paste an XML document here...",
  pasteXsdHere: "Paste an XSD schema here...",
  nodeTree: "Node tree",
  declaredTypes: "Declared types",
  declaredElements: "Declared elements and attributes",

  graphqlFormatterTitle: "GraphQL Formatter",
  graphqlFormatterSubtitle: "Pretty print a GraphQL query or schema.",
  graphqlMinifierTitle: "GraphQL Minifier",
  graphqlMinifierSubtitle: "Collapse a GraphQL document into a single line.",
  graphqlValidatorTitle: "GraphQL Validator",
  graphqlValidatorSubtitle: "Check a GraphQL query for structural errors.",
  graphqlSchemaExplorerTitle: "GraphQL Schema Explorer",
  graphqlSchemaExplorerSubtitle: "List the types a GraphQL schema defines.",
  graphqlSchemaValidatorTitle: "GraphQL Schema Validator",
  graphqlSchemaValidatorSubtitle: "Check a GraphQL schema for undefined types.",
  graphqlSchemaViewerTitle: "GraphQL Schema Viewer",
  graphqlSchemaViewerSubtitle: "Read the types and fields of a GraphQL schema.",
  formatGraphql: "Format GraphQL",
  minifyGraphql: "Minify GraphQL",
  validateGraphql: "Validate GraphQL",
  readSchema: "Read schema",
  validateSchema: "Validate schema",
  showSchema: "Show schema",
  graphqlIsValid: "The document is a valid GraphQL document.",
  schemaIsValid: "The schema is valid: every type it uses is defined.",
  noSchemaTypes: "The document defines no type.",
  pasteGraphqlSchema: "Paste a GraphQL schema (SDL) here...",
  pasteGraphqlDocument: "Paste a GraphQL document here...",
  line: "Line",

  htmlBeautifierTitle: "HTML Beautifier",
  htmlBeautifierSubtitle: "Indent a minified HTML document.",
  htmlFormatterTitle: "HTML Formatter",
  htmlFormatterSubtitle: "Indent an HTML document and keep its text.",
  htmlMinifierTitle: "HTML Minifier",
  htmlMinifierSubtitle: "Collapse an HTML document into a single line.",
  formatHtml: "Format HTML",
  minifyHtml: "Minify HTML",
  pasteHtmlHere: "Paste an HTML document here...",

  openapiViewerTitle: "OpenAPI Viewer",
  openapiViewerSubtitle: "Read the operations of an OpenAPI 3 document.",
  openapiEditorTitle: "OpenAPI Editor",
  openapiEditorSubtitle: "Edit an OpenAPI document and read its operations.",
  swaggerViewerTitle: "Swagger Viewer",
  swaggerViewerSubtitle: "Read the endpoints of a Swagger 2 document.",
  parseSpecification: "Parse specification",
  listOperations: "List operations",
  noOperationsFound: "The document declares no operation.",
  pasteSpecificationHere: "Paste an OpenAPI or Swagger document (JSON or YAML) here...",
  operations: "Operations",
  method: "Method",
  path: "Path",
  summary: "Summary",
  tags: "Tags",

  latexEditorTitle: "LaTeX Equation Editor",
  latexEditorSubtitle: "Write a LaTeX equation and see it rendered.",
  mathEditorTitle: "Math Editor",
  mathEditorSubtitle: "Write a mathematical formula and see it rendered.",
  renderEquation: "Render equation",
  pasteEquationHere: "Write a formula, for example: E = mc^2",
  unsupportedMacros: "These macros are not supported and were left out",
  renderedEquation: "Rendered equation",
  noEquationYet: "Nothing to render yet.",
  supportedSymbols: "Supported symbols",

  codeScreenshotTitle: "Code Screenshot Generator",
  codeScreenshotSubtitle: "Draw a code snippet as a PNG image.",
  codeSnippetScreenshotTitle: "Code Snippet Screenshot",
  codeSnippetScreenshotSubtitle: "Draw a code snippet as a PNG image.",
  renderScreenshot: "Render screenshot",
  downloadPng: "Download PNG",
  pasteCodeHere: "Paste a code snippet here...",
  theme: "Theme",
  language: "Language",
  padding: "Padding",
  lineNumbers: "Line numbers",
  screenshotReady: "The screenshot is rendered and can be downloaded.",
  preview: "Preview",
  pngReady: "The PNG was generated in your browser and was never uploaded.",

  localAiChatTitle: "Local AI Chat",
  localAiChatSubtitle: "Chat with a language model that runs on your own device.",
  offlineAiChatTitle: "Offline AI Chat",
  offlineAiChatSubtitle: "Chat with a local language model without an internet connection.",
  privateAiChatbotTitle: "Private AI Chatbot",
  privateAiChatbotSubtitle: "A chatbot whose prompts stay on your device.",
  loadModel: "Load model",
  clearChat: "Clear chat",
  model: "Model",
  noModelBundled:
    "No model weights are bundled with this site, so the chat cannot run yet.",
  noModelBundledDetail:
    "Place the model files on this site's own origin under the path shown above, then press \"Load model\". Nothing is ever downloaded from a third-party server and no prompt leaves your device.",
  webgpu: "WebGPU",
  checking: "checking",
  available: "available",
  notAvailable: "not available in this browser",
  modelStatus: "Model status",
  notLoaded: "not loaded",
  loading: "loading",
  loaded: "loaded",
  missing: "not found",
  modelMissing:
    "The model files were not found on this origin. The tool says so instead of pretending to answer.",
  modelFound: "The model files were found on this origin.",
  modelRequiredBeforeChat: "Load the model first, then send a prompt.",
  inferenceNotBundled:
    "The weights are present, but the inference runtime is not part of this site yet, so no answer is generated.",
  messages: "Messages",
  noMessages: "No message yet.",
  prompt: "Prompt",
  promptPlaceholder: "Write your prompt...",
  sendPrompt: "Send prompt",
  you: "You",
  model: "Model",

  emptyInput: "Please enter a document first.",
  copy: "Copy",
  copied: "Copied",
  clear: "Clear",
  loadExample: "Load example",
  result: "Result",
};

const DE = {
  xmlFormatterTitle: "XML-Formatierer",
  xmlFormatterSubtitle: "Ein XML-Dokument einrücken und Attribute und Text behalten.",
  xmlValidatorTitle: "XML-Validator",
  xmlValidatorSubtitle: "Prüfen, ob ein XML-Dokument wohlgeformt ist.",
  xmlViewerTitle: "XML-Viewer",
  xmlViewerSubtitle: "Ein XML-Dokument als Baum aus Elementen und Attributen lesen.",
  xsdEditorTitle: "XSD-Schema-Editor",
  xsdEditorSubtitle: "Ein XSD-Schema bearbeiten und seine Deklarationen lesen.",
  xsdSchemaViewerTitle: "XSD-Schema-Viewer",
  xsdSchemaViewerSubtitle: "Die in einem XSD-Schema definierten Typen auflisten.",
  xsdViewerTitle: "XSD-Element-Viewer",
  xsdViewerSubtitle: "Die in einem XSD-Schema deklarierten Elemente und Attribute auflisten.",
  formatXml: "XML formatieren",
  validateXml: "XML validieren",
  buildTree: "Baum aufbauen",
  checkSchema: "Schema prüfen",
  listTypes: "Typen auflisten",
  listElements: "Elemente auflisten",
  xmlParseError: "Das Dokument konnte nicht gelesen werden.",
  xmlIsWellFormed: "Das Dokument ist wohlgeformtes XML.",
  noXsdDeclarations: "Das Schema deklariert weder Elemente noch Attribute.",
  noXsdTypes: "Das Schema definiert keinen Typ.",
  pasteXmlHere: "XML-Dokument hier einfügen ...",
  pasteXsdHere: "XSD-Schema hier einfügen ...",
  nodeTree: "Knotenbaum",
  declaredTypes: "Deklarierte Typen",
  declaredElements: "Deklarierte Elemente und Attribute",

  graphqlFormatterTitle: "GraphQL-Formatierer",
  graphqlFormatterSubtitle: "Eine GraphQL-Abfrage oder ein Schema schön formatieren.",
  graphqlMinifierTitle: "GraphQL-Minifier",
  graphqlMinifierSubtitle: "Ein GraphQL-Dokument in eine Zeile zusammenfassen.",
  graphqlValidatorTitle: "GraphQL-Validator",
  graphqlValidatorSubtitle: "Eine GraphQL-Abfrage auf strukturelle Fehler prüfen.",
  graphqlSchemaExplorerTitle: "GraphQL-Schema-Explorer",
  graphqlSchemaExplorerSubtitle: "Die in einem GraphQL-Schema definierten Typen auflisten.",
  graphqlSchemaValidatorTitle: "GraphQL-Schema-Validator",
  graphqlSchemaValidatorSubtitle: "Ein GraphQL-Schema auf undefinierte Typen prüfen.",
  graphqlSchemaViewerTitle: "GraphQL-Schema-Viewer",
  graphqlSchemaViewerSubtitle: "Die Typen und Felder eines GraphQL-Schemas lesen.",
  formatGraphql: "GraphQL formatieren",
  minifyGraphql: "GraphQL minimieren",
  validateGraphql: "GraphQL validieren",
  readSchema: "Schema lesen",
  validateSchema: "Schema validieren",
  showSchema: "Schema anzeigen",
  graphqlIsValid: "Das Dokument ist ein gültiges GraphQL-Dokument.",
  schemaIsValid: "Das Schema ist gültig: jeder verwendete Typ ist definiert.",
  noSchemaTypes: "Das Dokument definiert keinen Typ.",
  pasteGraphqlSchema: "GraphQL-Schema (SDL) hier einfügen ...",
  pasteGraphqlDocument: "GraphQL-Dokument hier einfügen ...",
  line: "Zeile",

  htmlBeautifierTitle: "HTML-Beautifier",
  htmlBeautifierSubtitle: "Ein minimiertes HTML-Dokument einrücken.",
  htmlFormatterTitle: "HTML-Formatierer",
  htmlFormatterSubtitle: "Ein HTML-Dokument einrücken und den Text behalten.",
  htmlMinifierTitle: "HTML-Minifier",
  htmlMinifierSubtitle: "Ein HTML-Dokument in eine Zeile zusammenfassen.",
  formatHtml: "HTML formatieren",
  minifyHtml: "HTML minimieren",
  pasteHtmlHere: "HTML-Dokument hier einfügen ...",

  openapiViewerTitle: "OpenAPI-Viewer",
  openapiViewerSubtitle: "Die Operationen eines OpenAPI-3-Dokuments lesen.",
  openapiEditorTitle: "OpenAPI-Editor",
  openapiEditorSubtitle: "Ein OpenAPI-Dokument bearbeiten und seine Operationen lesen.",
  swaggerViewerTitle: "Swagger-Viewer",
  swaggerViewerSubtitle: "Die Endpunkte eines Swagger-2-Dokuments lesen.",
  parseSpecification: "Spezifikation auswerten",
  listOperations: "Operationen auflisten",
  noOperationsFound: "Das Dokument deklariert keine Operation.",
  pasteSpecificationHere:
    "Ein OpenAPI- oder Swagger-Dokument (JSON oder YAML) hier einfügen ...",
  operations: "Operationen",
  method: "Methode",
  path: "Pfad",
  summary: "Beschreibung",
  tags: "Tags",

  latexEditorTitle: "LaTeX-Formel-Editor",
  latexEditorSubtitle: "Eine LaTeX-Formel schreiben und gerendert ansehen.",
  mathEditorTitle: "Formel-Editor",
  mathEditorSubtitle: "Eine mathematische Formel schreiben und gerendert ansehen.",
  renderEquation: "Formel rendern",
  pasteEquationHere: "Formel eingeben, zum Beispiel: E = mc^2",
  unsupportedMacros: "Diese Makros werden nicht unterstützt und wurden weggelassen",
  renderedEquation: "Gerenderte Formel",
  noEquationYet: "Noch nichts zu rendern.",
  supportedSymbols: "Unterstützte Symbole",

  codeScreenshotTitle: "Code-Screenshot-Generator",
  codeScreenshotSubtitle: "Ein Code-Snippet als PNG-Bild darstellen.",
  codeSnippetScreenshotTitle: "Code-Snippet-Screenshot",
  codeSnippetScreenshotSubtitle: "Ein Code-Snippet als PNG-Bild darstellen.",
  renderScreenshot: "Screenshot rendern",
  downloadPng: "PNG herunterladen",
  pasteCodeHere: "Code-Snippet hier einfügen ...",
  theme: "Farbschema",
  language: "Sprache",
  padding: "Rand",
  lineNumbers: "Zeilennummern",
  screenshotReady: "Der Screenshot ist gerendert und kann heruntergeladen werden.",
  preview: "Vorschau",
  pngReady: "Das PNG wurde in Ihrem Browser erzeugt und nie hochgeladen.",

  localAiChatTitle: "Lokaler KI-Chat",
  localAiChatSubtitle: "Mit einem Sprachmodell chatten, das auf Ihrem eigenen Gerät läuft.",
  offlineAiChatTitle: "Offline-KI-Chat",
  offlineAiChatSubtitle:
    "Mit einem lokalen Sprachmodell ohne Internetverbindung chatten.",
  privateAiChatbotTitle: "Privater KI-Chatbot",
  privateAiChatbotSubtitle: "Ein Chatbot, dessen Eingaben auf Ihrem Gerät bleiben.",
  loadModel: "Modell laden",
  clearChat: "Chat leeren",
  model: "Modell",
  noModelBundled:
    "Dieser Website liegen keine Modellgewichte bei, der Chat kann daher noch nicht laufen.",
  noModelBundledDetail:
    "Legen Sie die Modelldateien unter dem oben gezeigten Pfad auf diesem Origin ab und drücken Sie auf \"Modell laden\". Es wird nie etwas von einem fremden Server geladen und keine Eingabe verlässt Ihr Gerät.",
  webgpu: "WebGPU",
  checking: "wird geprüft",
  available: "verfügbar",
  notAvailable: "in diesem Browser nicht verfügbar",
  modelStatus: "Modellstatus",
  notLoaded: "nicht geladen",
  loading: "wird geladen",
  loaded: "geladen",
  missing: "nicht gefunden",
  modelMissing:
    "Die Modelldateien wurden auf diesem Origin nicht gefunden. Das Werkzeug sagt das, statt so zu tun, als hätte es geantwortet.",
  modelFound: "Die Modelldateien wurden auf diesem Origin gefunden.",
  modelRequiredBeforeChat: "Laden Sie zuerst das Modell und senden Sie dann eine Eingabe.",
  inferenceNotBundled:
    "Die Gewichte sind vorhanden, aber die Inferenz-Laufzeit ist noch nicht Teil dieser Website, daher wird keine Antwort erzeugt.",
  messages: "Nachrichten",
  noMessages: "Noch keine Nachricht.",
  prompt: "Eingabe",
  promptPlaceholder: "Schreiben Sie Ihre Eingabe ...",
  sendPrompt: "Eingabe senden",
  you: "Sie",

  emptyInput: "Bitte zuerst ein Dokument eingeben.",
  copy: "Kopieren",
  copied: "Kopiert",
  clear: "Leeren",
  loadExample: "Beispiel laden",
  result: "Ergebnis",
};

const ENGINE = {
  noWorkspaceForSlug: "Für das Werkzeug {slug} ist noch kein Arbeitsbereich hinterlegt.",
};

function merge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "object" && value !== null) {
      target[key] = merge({ ...(target[key] || {}) }, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

const enPath = join(root, "src", "messages", "en.json");
const dePath = join(root, "src", "messages", "de.json");

const en = JSON.parse(readFileSync(enPath, "utf8"));
const de = JSON.parse(readFileSync(dePath, "utf8"));

en.ui = en.ui || {};
de.ui = de.ui || {};
en.ui.engines = en.ui.engines || {};
de.ui.engines = de.ui.engines || {};

en.ui.engines.developerSuite = merge(en.ui.engines.developerSuite || {}, EN);
de.ui.engines.developerSuite = merge(de.ui.engines.developerSuite || {}, DE);
en.ui.engines.DeveloperSuiteEngine = merge(en.ui.engines.DeveloperSuiteEngine || {}, ENGINE);
de.ui.engines.DeveloperSuiteEngine = merge(de.ui.engines.DeveloperSuiteEngine || {}, ENGINE);

writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
writeFileSync(dePath, JSON.stringify(de, null, 2) + "\n", "utf8");

console.log(`en.ui.engines.developerSuite: ${Object.keys(en.ui.engines.developerSuite).length} keys`);
console.log(`de.ui.engines.developerSuite: ${Object.keys(de.ui.engines.developerSuite).length} keys`);

const missingDe = Object.keys(en.ui.engines.developerSuite).filter(
  (key) => !(key in de.ui.engines.developerSuite),
);
console.log(missingDe.length ? `MISSING in de: ${missingDe.join(", ")}` : "German coverage complete");
