// src/config.ts
import { build } from "esbuild";
import { existsSync } from "node:fs";
import { join } from "node:path";
var CONFIG_FILE = "stellify.config.ts";
var KEYS = ["entry", "schema", "catalogId", "outDir"];
function defineConfig(config) {
  return config;
}
async function loadConfig(packageDir) {
  const path = join(packageDir, CONFIG_FILE);
  if (!existsSync(path)) return { config: {}, findings: [] };
  let exported;
  try {
    const result = await build({
      entryPoints: [path],
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      write: false,
      logLevel: "silent",
      plugins: [
        {
          name: "stellify-self",
          setup(api) {
            api.onResolve({ filter: /^@a2uiverse\/stellify$/ }, () => ({
              path: "stellify",
              namespace: "stellify-self"
            }));
            api.onLoad({ filter: /.*/, namespace: "stellify-self" }, () => ({
              contents: "export const defineConfig = config => config;",
              loader: "js"
            }));
          }
        }
      ]
    });
    const code = result.outputFiles[0].text;
    const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    exported = module.default;
  } catch (error) {
    return { config: {}, findings: [{ file: CONFIG_FILE, reason: messageOf(error) }] };
  }
  return checkConfig(exported);
}
function checkConfig(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      config: {},
      findings: [{ file: CONFIG_FILE, reason: "the default export is not a config object" }]
    };
  }
  const findings = [];
  const config = {};
  for (const [key, field] of Object.entries(value)) {
    if (!KEYS.includes(key)) {
      findings.push({ file: CONFIG_FILE, reason: `unknown key ${JSON.stringify(key)}` });
    } else if (typeof field !== "string") {
      findings.push({ file: CONFIG_FILE, reason: `${key} must be a string` });
    } else {
      config[key] = field;
    }
  }
  return { config, findings };
}
var messageOf = (error) => error instanceof Error ? error.message : String(error);

// ../sdk/js/dist/a2uiverse.js
var AUTH_REQUIRED_STATE = "auth-required";
function readAuthRequired(data) {
  if (typeof data !== "object" || data === null || Array.isArray(data))
    return void 0;
  const { security } = data;
  if (!Array.isArray(security) || security.length === 0)
    return void 0;
  const alternatives = [];
  for (const alternative of security) {
    if (typeof alternative !== "object" || alternative === null || Array.isArray(alternative)) {
      return void 0;
    }
    const entries = Object.entries(alternative);
    if (entries.length === 0)
      return void 0;
    const requirement = {};
    for (const [scheme, scopes] of entries) {
      if (scheme === "" || !Array.isArray(scopes))
        return void 0;
      if (!scopes.every((scope) => typeof scope === "string" && scope !== ""))
        return void 0;
      if (new Set(scopes).size !== scopes.length)
        return void 0;
      requirement[scheme] = [...scopes];
    }
    alternatives.push(requirement);
  }
  return { security: alternatives };
}

// ../sdk/js/dist/synthesis.js
var MATCH_KEY = "match";
var refSchema = {
  type: "object",
  additionalProperties: false,
  required: ["surface", "pointer"],
  description: "A cross-partition qualified ref: a pointer that resolves in another surface's data model.",
  properties: {
    surface: {
      type: "string",
      description: "The namespaced surfaceId (<source>:<surfaceId>) the pointer resolves in."
    },
    pointer: {
      type: "string",
      pattern: "^(|/.*)$",
      description: 'RFC 6901 JSON Pointer into that surface\'s data model, where a segment may carry a predicate: `items[sku="x"]` selects the element of `items` whose field `sku` equals the JSON literal "x", and `items[a="x",b=2]` conjoins several field tests until exactly one element matches. Elements are selected by key, never by position: a positional segment into an array does not resolve. A ref is valid while its keys resolve; none matching and several matching are both absent. The value is a JSON literal compared by JSON equality.'
    }
  }
};
var formulaSchema = {
  type: "object",
  additionalProperties: false,
  required: ["op", "args"],
  description: "A leaf of the derived model: one operator over N refs, N ≥ 0. A plain vendor value is a one-argument pass-through. A formula with no refs is a value no source contributes to — absent by construction. Operators are names the shell catalog declares as functions; the contract does not enumerate them. Recognized by shape: an object with exactly `op` and `args` is a formula.",
  properties: {
    op: { type: "string", description: "A function name declared by the shell catalog." },
    args: { type: "array", minItems: 0, items: { $ref: "#/$defs/ref" } }
  }
};
var relationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["op", "args"],
  description: "One named relation of a match claim: a formula like any other leaf, its operator a relation the shell catalog declares, over exactly two refs in two different sources — the source of each ref's namespaced surface — so two accounts of one app can be joined, and a source never to itself. The contract does not enumerate relations; the consumer checks the operator against the shell catalog.",
  properties: {
    op: { type: "string", description: "A relation the shell catalog declares as a function." },
    args: { type: "array", minItems: 2, maxItems: 2, items: { $ref: "#/$defs/ref" } }
  }
};
var matchSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: { $ref: "#/$defs/relation" },
  description: "A match claim, under the reserved key `match` of an object of the derived model, the root included: the Synthesizer's word that the entries the object joins from different sources are one thing, with its evidence. Each key is the Synthesizer's own words for what matched, each value a relation. At least one relation; flat. No object is required to carry one. Disclosed on the object's values by the shell's derived-value component; the tree binds no path under `match`."
};
var nodeSchema = {
  description: "A node of the free-form derived model: a formula leaf, an object whose values are nodes — its key `match`, when present, is its match claim — or an array of nodes. A scalar anywhere is a violation — every leaf is a formula, never a literal value.",
  oneOf: [
    { $ref: "#/$defs/formula" },
    {
      type: "object",
      properties: { [MATCH_KEY]: { $ref: "#/$defs/match" } },
      additionalProperties: { $ref: "#/$defs/node" }
    },
    { type: "array", items: { $ref: "#/$defs/node" } }
  ]
};
var dataModelSchema = {
  type: "object",
  minProperties: 1,
  propertyNames: { not: { const: "sorts" } },
  properties: { [MATCH_KEY]: { $ref: "#/$defs/match" } },
  additionalProperties: { $ref: "#/$defs/node" },
  description: "The derived data model the tree binds to: a JSON shape of the Synthesizer's choosing whose every leaf is a formula. Evaluated client-side into plain values with contributor state at the same paths. The key `match` on any object, the root included, is that object's match claim. The root key `sorts` is reserved: the runtime writes each sort declaration, with the user's current choice, at `/sorts/N` of the synthesis surface's data model, and the tree binds SortControl there."
};
var sortSchema = {
  type: "object",
  additionalProperties: false,
  required: ["path", "options", "key", "direction"],
  description: "A sort declaration over one array of the derived model, or — through `*` — over the list inside every element of the arrays enclosing it, all of them ordered alike. The model names the array, the sortable keys and their labels, and the initial choice; the runtime sorts and keeps the user's choice of key or direction, one choice for every list the declaration reaches.",
  properties: {
    path: {
      type: "string",
      pattern: "^/.*$",
      description: "JSON Pointer to the sorted array in the derived model. Its steps are object keys and `*`: a `*` passes through every element of an array, at any depth, so `/rows/*/runs` names the list `runs` inside every element of `rows`. Every element the path passes through carries the list, `[]` when it has none. The last step names the array; an array is never stepped into by position, and no step selects an element by key."
    },
    options: {
      type: "array",
      minItems: 1,
      description: "The keys the user may sort by, each with its user-facing label.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "label"],
        properties: {
          key: {
            type: "string",
            pattern: "^/.*$",
            description: "JSON Pointer inside each element of the sorted array — of every list the path reaches — to a formula leaf."
          },
          label: { type: "string", minLength: 1 }
        }
      }
    },
    key: { type: "string", description: "The initial key; one of the options." },
    direction: { type: "string", enum: ["asc", "desc"] }
  }
};
var SYNTHESIS_DEFS = {
  ref: refSchema,
  formula: formulaSchema,
  relation: relationSchema,
  match: matchSchema,
  node: nodeSchema,
  dataModel: dataModelSchema,
  sort: sortSchema
};
var SYNTHESIS_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "SynthesisPayload",
  description: "Client-facing: the synthesis branch minus the tree (painted as A2UI) and the note (journaled). Evaluated client-side into the synthesis surface's data model.",
  $defs: SYNTHESIS_DEFS,
  type: "object",
  additionalProperties: false,
  required: ["dataModel", "sorts"],
  properties: {
    dataModel: { $ref: "#/$defs/dataModel" },
    sorts: { type: "array", items: { $ref: "#/$defs/sort" } },
    partial: {
      type: "boolean",
      const: true,
      description: "Present while the Synthesizer is still writing: the derived model and the sorts as far as they have passed their own checks — the turn's first synthesis streamed into its reserved slot, the tree's event first, then one event per piece with no A2UI parts. Absent on the document as accepted, which replaces what streamed."
    }
  }
};

// ../sdk/js/dist/validate.js
import { Ajv2020 } from "ajv/dist/2020.js";
var ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
var payloadSchema = ajv.compile(SYNTHESIS_SCHEMA);
function schemaErrors(validate, input) {
  if (validate(input))
    return [];
  return (validate.errors ?? []).map((error) => {
    const params = error.params;
    const subject = params.propertyName ?? params.additionalProperty;
    const detail = subject === void 0 ? "" : ` (${JSON.stringify(subject)})`;
    return `${error.instancePath || "/"}: ${error.message ?? "invalid"}${detail}`;
  });
}

// ../sdk/js/dist/catalog.js
import { Ajv2020 as Ajv20202 } from "ajv/dist/2020.js";

// ../sdk/js/dist/a2ui/spec.generated.js
var COMMON_TYPES_SCHEMA = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://a2ui.org/specification/v0_9/common_types.json", "title": "A2UI Common Types", "description": "Common type definitions used across A2UI schemas.", "$defs": { "ComponentId": { "type": "string", "description": "The unique identifier for a component, used for both definitions and references within the same surface." }, "AccessibilityAttributes": { "type": "object", "description": "Attributes to enhance accessibility when using assistive technologies like screen readers.", "properties": { "label": { "$ref": "#/$defs/DynamicString", "description": "A short string, typically 1 to 3 words, used by assistive technologies to convey the purpose or intent of an element. For example, an input field might have an accessible label of 'User ID' or a button might be labeled 'Submit'." }, "description": { "$ref": "#/$defs/DynamicString", "description": "Additional information provided by assistive technologies about an element such as instructions, format requirements, or result of an action. For example, a mute button might have a label of 'Mute' and a description of 'Silences notifications about this conversation'." } } }, "ComponentCommon": { "type": "object", "properties": { "id": { "$ref": "#/$defs/ComponentId" }, "accessibility": { "$ref": "#/$defs/AccessibilityAttributes" } }, "required": ["id"] }, "ChildList": { "oneOf": [{ "type": "array", "description": "A static list of child component IDs.", "items": { "$ref": "#/$defs/ComponentId" } }, { "type": "object", "description": "A template for generating a dynamic list of children from a data model list. The `componentId` is the component to use as a template.", "properties": { "componentId": { "$ref": "#/$defs/ComponentId" }, "path": { "type": "string", "description": "The path to the list of component property objects in the data model." } }, "required": ["componentId", "path"], "additionalProperties": false }] }, "DataBinding": { "type": "object", "properties": { "path": { "type": "string", "description": "A JSON Pointer path to a value in the data model." } }, "required": ["path"], "additionalProperties": false }, "DynamicValue": { "description": "A value that can be a literal, a path, or a function call returning any type.", "oneOf": [{ "type": "string" }, { "type": "number" }, { "type": "boolean" }, { "type": "array" }, { "$ref": "#/$defs/DataBinding" }, { "$ref": "#/$defs/FunctionCall" }] }, "DynamicString": { "description": "Represents a string", "oneOf": [{ "type": "string" }, { "$ref": "#/$defs/DataBinding" }, { "allOf": [{ "$ref": "#/$defs/FunctionCall" }, { "properties": { "returnType": { "const": "string" } } }] }] }, "DynamicNumber": { "description": "Represents a value that can be either a literal number, a path to a number in the data model, or a function call returning a number.", "oneOf": [{ "type": "number" }, { "$ref": "#/$defs/DataBinding" }, { "allOf": [{ "$ref": "#/$defs/FunctionCall" }, { "properties": { "returnType": { "const": "number" } } }] }] }, "DynamicBoolean": { "description": "A boolean value that can be a literal, a path, or a function call returning a boolean.", "oneOf": [{ "type": "boolean" }, { "$ref": "#/$defs/DataBinding" }, { "allOf": [{ "$ref": "#/$defs/FunctionCall" }, { "properties": { "returnType": { "const": "boolean" } } }] }] }, "DynamicStringList": { "description": "Represents a value that can be either a literal array of strings, a path to a string array in the data model, or a function call returning a string array.", "oneOf": [{ "type": "array", "items": { "type": "string" } }, { "$ref": "#/$defs/DataBinding" }, { "allOf": [{ "$ref": "#/$defs/FunctionCall" }, { "properties": { "returnType": { "const": "array" } } }] }] }, "FunctionCall": { "type": "object", "description": "Invokes a named function on the client.", "properties": { "call": { "type": "string", "description": "The name of the function to call." }, "args": { "type": "object", "description": "Arguments passed to the function.", "additionalProperties": { "anyOf": [{ "$ref": "#/$defs/DynamicValue" }, { "type": "object", "description": "A literal object argument (e.g. configuration)." }] } }, "returnType": { "type": "string", "description": "The expected return type of the function call.", "enum": ["string", "number", "boolean", "array", "object", "any", "void"], "default": "boolean" } }, "required": ["call"], "oneOf": [{ "$ref": "catalog.json#/$defs/anyFunction" }] }, "CheckRule": { "type": "object", "description": "A single validation rule applied to an input component.", "properties": { "condition": { "$ref": "#/$defs/DynamicBoolean" }, "message": { "type": "string", "description": "The error message to display if the check fails." } }, "required": ["condition", "message"], "additionalProperties": false }, "Checkable": { "type": "object", "description": "Properties for components that support client-side checks.", "properties": { "checks": { "type": "array", "description": "A list of checks to perform. These are function calls that must return a boolean indicating validity.", "items": { "$ref": "#/$defs/CheckRule" } } } }, "Action": { "description": "Defines an interaction handler that can either trigger a server-side event or execute a local client-side function.", "oneOf": [{ "type": "object", "description": "Triggers a server-side event.", "properties": { "event": { "type": "object", "description": "The event to dispatch to the server.", "properties": { "name": { "type": "string", "description": "The name of the action to be dispatched to the server." }, "context": { "type": "object", "description": "A JSON object containing the key-value pairs for the action context. Values can be literals or paths. Use literal values unless the value must be dynamically bound to the data model. Do NOT use paths for static IDs.", "additionalProperties": { "$ref": "#/$defs/DynamicValue" } } }, "required": ["name"], "additionalProperties": false } }, "required": ["event"], "additionalProperties": false }, { "type": "object", "description": "Executes a local client-side function.", "properties": { "functionCall": { "$ref": "#/$defs/FunctionCall" } }, "required": ["functionCall"], "additionalProperties": false }] } } };
var SERVER_CAPABILITIES_SCHEMA = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://a2ui.org/specification/v0_9/server_capabilities.json", "title": "A2UI Server Capabilities Schema", "description": "A schema for the server capabilities object, which is used by an A2UI server (or Agent) to advertise its supported UI features to clients. This can be embedded in an Agent Card for A2A or used in other transport protocols like MCP.", "type": "object", "properties": { "v0.9": { "type": "object", "description": "The server capabilities structure for version 0.9 of the A2UI protocol.", "properties": { "supportedCatalogIds": { "type": "array", "description": "An array of strings, where each string is an ID identifying a Catalog Definition Schema that the server can generate. This is not necessarily a resolvable URI.", "items": { "type": "string" } }, "acceptsInlineCatalogs": { "type": "boolean", "description": "A boolean indicating if the server can accept an 'inlineCatalogs' array in the client's a2uiClientCapabilities. If omitted, this defaults to false.", "default": false } } } }, "required": ["v0.9"] };
var BASIC_CATALOG_ID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";
var BASIC_CATALOG_SCHEMA = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json", "title": "A2UI Basic Catalog", "description": "Unified catalog of basic A2UI components and functions.", "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json", "components": { "Text": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "Text" }, "text": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The text content to display. While simple Markdown formatting is supported (i.e. without HTML, images, or links), utilizing dedicated UI components is generally preferred for a richer and more structured presentation." }, "variant": { "type": "string", "description": "A hint for the base text style.", "enum": ["h1", "h2", "h3", "h4", "h5", "caption", "body"], "default": "body" } }, "required": ["component", "text"] }], "unevaluatedProperties": false }, "Image": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "Image" }, "url": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The URL of the image to display." }, "description": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "Accessibility text for the image." }, "fit": { "type": "string", "description": "Specifies how the image should be resized to fit its container. This corresponds to the CSS 'object-fit' property.", "enum": ["contain", "cover", "fill", "none", "scaleDown"], "default": "fill" }, "variant": { "type": "string", "description": "A hint for the image size and style.", "enum": ["icon", "avatar", "smallFeature", "mediumFeature", "largeFeature", "header"], "default": "mediumFeature" } }, "required": ["component", "url"] }], "unevaluatedProperties": false }, "Icon": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "Icon" }, "name": { "description": "The name of the icon to display.", "oneOf": [{ "type": "string", "enum": ["accountCircle", "add", "arrowBack", "arrowForward", "attachFile", "calendarToday", "call", "camera", "check", "close", "delete", "download", "edit", "event", "error", "fastForward", "favorite", "favoriteOff", "folder", "help", "home", "info", "locationOn", "lock", "lockOpen", "mail", "menu", "moreVert", "moreHoriz", "notificationsOff", "notifications", "pause", "payment", "person", "phone", "photo", "play", "print", "refresh", "rewind", "search", "send", "settings", "share", "shoppingCart", "skipNext", "skipPrevious", "star", "starHalf", "starOff", "stop", "upload", "visibility", "visibilityOff", "volumeDown", "volumeMute", "volumeOff", "volumeUp", "warning"] }, { "type": "object", "properties": { "svgPath": { "type": "string" } }, "required": ["svgPath"], "additionalProperties": false }, { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DataBinding" }] } }, "required": ["component", "name"] }], "unevaluatedProperties": false }, "Video": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "Video" }, "url": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The URL of the video to display." } }, "required": ["component", "url"] }], "unevaluatedProperties": false }, "AudioPlayer": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "AudioPlayer" }, "url": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The URL of the audio to be played." }, "description": { "description": "A description of the audio, such as a title or summary.", "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString" } }, "required": ["component", "url"] }], "unevaluatedProperties": false }, "Row": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "description": "A layout component that arranges its children horizontally. To create a grid layout, nest Columns within this Row.", "properties": { "component": { "const": "Row" }, "children": { "description": "Defines the children. Use an array of strings for a fixed set of children, or a template object to generate children from a data list. Children cannot be defined inline, they must be referred to by ID.", "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ChildList" }, "justify": { "type": "string", "description": "Defines the arrangement of children along the main axis (horizontally). Use 'spaceBetween' to push items to the edges, or 'start'/'end'/'center' to pack them together.", "enum": ["center", "end", "spaceAround", "spaceBetween", "spaceEvenly", "start", "stretch"], "default": "start" }, "align": { "type": "string", "description": "Defines the alignment of children along the cross axis (vertically). This is similar to the CSS 'align-items' property, but uses camelCase values (e.g., 'start').", "enum": ["start", "center", "end", "stretch"], "default": "stretch" } }, "required": ["component", "children"] }], "unevaluatedProperties": false }, "Column": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "description": "A layout component that arranges its children vertically. To create a grid layout, nest Rows within this Column.", "properties": { "component": { "const": "Column" }, "children": { "description": "Defines the children. Use an array of strings for a fixed set of children, or a template object to generate children from a data list. Children cannot be defined inline, they must be referred to by ID.", "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ChildList" }, "justify": { "type": "string", "description": "Defines the arrangement of children along the main axis (vertically). Use 'spaceBetween' to push items to the edges (e.g. header at top, footer at bottom), or 'start'/'end'/'center' to pack them together.", "enum": ["start", "center", "end", "spaceBetween", "spaceAround", "spaceEvenly", "stretch"], "default": "start" }, "align": { "type": "string", "description": "Defines the alignment of children along the cross axis (horizontally). This is similar to the CSS 'align-items' property.", "enum": ["center", "end", "start", "stretch"], "default": "stretch" } }, "required": ["component", "children"] }], "unevaluatedProperties": false }, "List": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "List" }, "children": { "description": "Defines the children. Use an array of strings for a fixed set of children, or a template object to generate children from a data list.", "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ChildList" }, "direction": { "type": "string", "description": "The direction in which the list items are laid out.", "enum": ["vertical", "horizontal"], "default": "vertical" }, "align": { "type": "string", "description": "Defines the alignment of children along the cross axis.", "enum": ["start", "center", "end", "stretch"], "default": "stretch" } }, "required": ["component", "children"] }], "unevaluatedProperties": false }, "Card": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "Card" }, "child": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentId", "description": "The ID of the single child component to be rendered inside the card. To display multiple elements, you MUST wrap them in a layout component (like Column or Row) and pass that container's ID here. Do NOT pass multiple IDs or a non-existent ID." } }, "required": ["component", "child"] }], "unevaluatedProperties": false }, "Tabs": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "Tabs" }, "tabs": { "type": "array", "description": "An array of objects, where each object defines a tab with a title and a child component.", "minItems": 1, "items": { "type": "object", "properties": { "title": { "description": "The tab title.", "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString" }, "child": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentId", "description": "The ID of the child component." } }, "required": ["title", "child"], "additionalProperties": false } } }, "required": ["component", "tabs"] }], "unevaluatedProperties": false }, "Modal": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "Modal" }, "trigger": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentId", "description": "The ID of the component that opens the modal when interacted with (e.g., a button)." }, "content": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentId", "description": "The ID of the component to be displayed inside the modal." } }, "required": ["component", "trigger", "content"] }], "unevaluatedProperties": false }, "Divider": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "type": "object", "properties": { "component": { "const": "Divider" }, "axis": { "type": "string", "description": "The orientation of the divider.", "enum": ["horizontal", "vertical"], "default": "horizontal" } }, "required": ["component"] }], "unevaluatedProperties": false }, "Button": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/Checkable" }, { "type": "object", "properties": { "component": { "const": "Button" }, "child": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentId", "description": "The ID of the child component. Use a 'Text' component for a labeled button. Only use an 'Icon' if the requirements explicitly ask for an icon-only button." }, "variant": { "type": "string", "description": "A hint for the button style. If omitted, a default button style is used. 'primary' indicates this is the main call-to-action button. 'borderless' means the button has no visual border or background, making its child content appear like a clickable link.", "enum": ["default", "primary", "borderless"], "default": "default" }, "action": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/Action" } }, "required": ["component", "child", "action"] }], "unevaluatedProperties": false }, "TextField": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/Checkable" }, { "type": "object", "properties": { "component": { "const": "TextField" }, "label": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The text label for the input field." }, "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The value of the text field." }, "variant": { "type": "string", "description": "The type of input field to display.", "enum": ["longText", "number", "shortText", "obscured"], "default": "shortText" }, "validationRegexp": { "type": "string", "description": "A regular expression used for client-side validation of the input." } }, "required": ["component", "label"] }], "unevaluatedProperties": false }, "CheckBox": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/Checkable" }, { "type": "object", "properties": { "component": { "const": "CheckBox" }, "label": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The text to display next to the checkbox." }, "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicBoolean", "description": "The current state of the checkbox (true for checked, false for unchecked)." } }, "required": ["component", "label", "value"] }], "unevaluatedProperties": false }, "ChoicePicker": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/Checkable" }, { "type": "object", "description": "A component that allows selecting one or more options from a list.", "properties": { "component": { "const": "ChoicePicker" }, "label": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The label for the group of options." }, "variant": { "type": "string", "description": "A hint for how the choice picker should be displayed and behave.", "enum": ["multipleSelection", "mutuallyExclusive"], "default": "mutuallyExclusive" }, "options": { "type": "array", "description": "The list of available options to choose from.", "items": { "type": "object", "properties": { "label": { "description": "The text to display for this option.", "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString" }, "value": { "type": "string", "description": "The stable value associated with this option." } }, "required": ["label", "value"], "additionalProperties": false } }, "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicStringList", "description": "The list of currently selected values. This should be bound to a string array in the data model." }, "displayStyle": { "type": "string", "description": "The display style of the component.", "enum": ["checkbox", "chips"], "default": "checkbox" }, "filterable": { "type": "boolean", "description": "If true, displays a search input to filter the options.", "default": false } }, "required": ["component", "options", "value"] }], "unevaluatedProperties": false }, "Slider": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/Checkable" }, { "type": "object", "properties": { "component": { "const": "Slider" }, "label": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The label for the slider." }, "min": { "type": "number", "description": "The minimum value of the slider.", "default": 0 }, "max": { "type": "number", "description": "The maximum value of the slider." }, "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicNumber", "description": "The current value of the slider." } }, "required": ["component", "value", "max"] }], "unevaluatedProperties": false }, "DateTimeInput": { "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentCommon" }, { "$ref": "#/$defs/CatalogComponentCommon" }, { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/Checkable" }, { "type": "object", "properties": { "component": { "const": "DateTimeInput" }, "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The selected date and/or time value in ISO 8601 format. If not yet set, initialize with an empty string." }, "enableDate": { "type": "boolean", "description": "If true, allows the user to select a date.", "default": false }, "enableTime": { "type": "boolean", "description": "If true, allows the user to select a time.", "default": false }, "min": { "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString" }, { "if": { "type": "string" }, "then": { "oneOf": [{ "format": "date" }, { "format": "time" }, { "format": "date-time" }] } }], "description": "The minimum allowed date/time in ISO 8601 format." }, "max": { "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString" }, { "if": { "type": "string" }, "then": { "oneOf": [{ "format": "date" }, { "format": "time" }, { "format": "date-time" }] } }], "description": "The maximum allowed date/time in ISO 8601 format." }, "label": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The text label for the input field." } }, "required": ["component", "value"] }], "unevaluatedProperties": false } }, "functions": { "required": { "type": "object", "description": "Checks that the value is not null, undefined, or empty.", "properties": { "call": { "const": "required" }, "args": { "type": "object", "properties": { "value": { "description": "The value to check." } }, "required": ["value"], "additionalProperties": false }, "returnType": { "const": "boolean" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "regex": { "type": "object", "description": "Checks that the value matches a regular expression string.", "properties": { "call": { "const": "regex" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString" }, "pattern": { "type": "string", "description": "The regex pattern to match against." } }, "required": ["value", "pattern"], "unevaluatedProperties": false }, "returnType": { "const": "boolean" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "length": { "type": "object", "description": "Checks string length constraints.", "properties": { "call": { "const": "length" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString" }, "min": { "type": "integer", "minimum": 0, "description": "The minimum allowed length." }, "max": { "type": "integer", "minimum": 0, "description": "The maximum allowed length." } }, "required": ["value"], "anyOf": [{ "required": ["min"] }, { "required": ["max"] }], "unevaluatedProperties": false }, "returnType": { "const": "boolean" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "numeric": { "type": "object", "description": "Checks numeric range constraints.", "properties": { "call": { "const": "numeric" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicNumber" }, "min": { "type": "number", "description": "The minimum allowed value." }, "max": { "type": "number", "description": "The maximum allowed value." } }, "required": ["value"], "anyOf": [{ "required": ["min"] }, { "required": ["max"] }], "unevaluatedProperties": false }, "returnType": { "const": "boolean" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "email": { "type": "object", "description": "Checks that the value is a valid email address.", "properties": { "call": { "const": "email" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString" } }, "required": ["value"], "unevaluatedProperties": false }, "returnType": { "const": "boolean" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "formatString": { "type": "object", "description": "Performs string interpolation of data model values and other functions in the catalog functions list and returns the resulting string. The value string can contain interpolated expressions in the `${expression}` format. Supported expression types include: JSON Pointer paths to the data model (e.g., `${/absolute/path}` or `${relative/path}`), and client-side function calls (e.g., `${now()}`). Function arguments must be named (e.g., `${formatDate(value:${/currentDate}, format:'MM-dd')}`). To include a literal `${` sequence, escape it as `\\${`.", "properties": { "call": { "const": "formatString" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString" } }, "required": ["value"], "unevaluatedProperties": false }, "returnType": { "const": "string" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "formatNumber": { "type": "object", "description": "Formats a number with the specified grouping and decimal precision.", "properties": { "call": { "const": "formatNumber" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicNumber", "description": "The number to format." }, "decimals": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicNumber", "description": "Optional. The number of decimal places to show. Defaults to 0 or 2 depending on locale." }, "grouping": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicBoolean", "description": "Optional. If true, uses locale-specific grouping separators (e.g. '1,000'). If false, returns raw digits (e.g. '1000'). Defaults to true." } }, "required": ["value"], "unevaluatedProperties": false }, "returnType": { "const": "string" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "formatCurrency": { "type": "object", "description": "Formats a number as a currency string.", "properties": { "call": { "const": "formatCurrency" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicNumber", "description": "The monetary amount." }, "currency": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The ISO 4217 currency code (e.g., 'USD', 'EUR')." }, "decimals": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicNumber", "description": "Optional. The number of decimal places to show. Defaults to 0 or 2 depending on locale." }, "grouping": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicBoolean", "description": "Optional. If true, uses locale-specific grouping separators (e.g. '1,000'). If false, returns raw digits (e.g. '1000'). Defaults to true." } }, "required": ["currency", "value"], "unevaluatedProperties": false }, "returnType": { "const": "string" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "formatDate": { "type": "object", "description": "Formats a timestamp into a string using a pattern.", "properties": { "call": { "const": "formatDate" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicValue", "description": "The date to format." }, "format": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "A Unicode TR35 date pattern string.\n\nToken Reference:\n- Year: 'yy' (26), 'yyyy' (2026)\n- Month: 'M' (1), 'MM' (01), 'MMM' (Jan), 'MMMM' (January)\n- Day: 'd' (1), 'dd' (01), 'E' (Tue), 'EEEE' (Tuesday)\n- Hour (12h): 'h' (1-12), 'hh' (01-12) - requires 'a' for AM/PM\n- Hour (24h): 'H' (0-23), 'HH' (00-23) - Military Time\n- Minute: 'mm' (00-59)\n- Second: 'ss' (00-59)\n- Period: 'a' (AM/PM)\n\nExamples:\n- 'MMM dd, yyyy' -> 'Jan 16, 2026'\n- 'HH:mm' -> '14:30' (Military)\n- 'h:mm a' -> '2:30 PM'\n- 'EEEE, d MMMM' -> 'Friday, 16 January'" } }, "required": ["format", "value"], "unevaluatedProperties": false }, "returnType": { "const": "string" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "pluralize": { "type": "object", "description": "Returns a localized string based on the Common Locale Data Repository (CLDR) plural category of the count (zero, one, two, few, many, other). Requires an 'other' fallback. For English, just use 'one' and 'other'.", "properties": { "call": { "const": "pluralize" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicNumber", "description": "The numeric value used to determine the plural category." }, "zero": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "String for the 'zero' category (e.g., 0 items)." }, "one": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "String for the 'one' category (e.g., 1 item)." }, "two": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "String for the 'two' category (used in Arabic, Welsh, etc.)." }, "few": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "String for the 'few' category (e.g., small groups in Slavic languages)." }, "many": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "String for the 'many' category (e.g., large groups in various languages)." }, "other": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString", "description": "The default/fallback string (used for general plural cases)." } }, "required": ["value", "other"], "unevaluatedProperties": false }, "returnType": { "const": "string" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "openUrl": { "type": "object", "description": "Opens the specified URL in a browser or handler. This function has no return value.", "properties": { "call": { "const": "openUrl" }, "args": { "type": "object", "properties": { "url": { "type": "string", "format": "uri", "description": "The URL to open." } }, "required": ["url"], "additionalProperties": false }, "returnType": { "const": "void" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "and": { "type": "object", "description": "Performs a logical AND operation on a list of boolean values.", "properties": { "call": { "const": "and" }, "args": { "type": "object", "properties": { "values": { "type": "array", "description": "The list of boolean values to evaluate.", "items": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicBoolean" }, "minItems": 2 } }, "required": ["values"], "unevaluatedProperties": false }, "returnType": { "const": "boolean" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "or": { "type": "object", "description": "Performs a logical OR operation on a list of boolean values.", "properties": { "call": { "const": "or" }, "args": { "type": "object", "properties": { "values": { "type": "array", "description": "The list of boolean values to evaluate.", "items": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicBoolean" }, "minItems": 2 } }, "required": ["values"], "unevaluatedProperties": false }, "returnType": { "const": "boolean" } }, "required": ["call", "args"], "unevaluatedProperties": false }, "not": { "type": "object", "description": "Performs a logical NOT operation on a boolean value.", "properties": { "call": { "const": "not" }, "args": { "type": "object", "properties": { "value": { "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicBoolean", "description": "The boolean value to negate." } }, "required": ["value"], "unevaluatedProperties": false }, "returnType": { "const": "boolean" } }, "required": ["call", "args"], "unevaluatedProperties": false } }, "$defs": { "CatalogComponentCommon": { "type": "object", "properties": { "weight": { "type": "number", "description": "The relative weight of this component within a Row or Column. This is similar to the CSS 'flex-grow' property. Note: this may ONLY be set when the component is a direct descendant of a Row or Column." } } }, "theme": { "type": "object", "properties": { "primaryColor": { "type": "string", "description": "The primary brand color used for highlights (e.g., primary buttons, active borders). Renderers may generate variants of this color for different contexts. Format: Hexadecimal code (e.g., '#00BFFF').", "pattern": "^#[0-9a-fA-F]{6}$" }, "iconUrl": { "type": "string", "format": "uri", "description": "A URL for an image that identifies the agent or tool associated with the surface." }, "agentDisplayName": { "type": "string", "description": "Text to be displayed next to the surface to identify the agent or tool that created it." } }, "additionalProperties": true }, "anyComponent": { "oneOf": [{ "$ref": "#/components/Text" }, { "$ref": "#/components/Image" }, { "$ref": "#/components/Icon" }, { "$ref": "#/components/Video" }, { "$ref": "#/components/AudioPlayer" }, { "$ref": "#/components/Row" }, { "$ref": "#/components/Column" }, { "$ref": "#/components/List" }, { "$ref": "#/components/Card" }, { "$ref": "#/components/Tabs" }, { "$ref": "#/components/Modal" }, { "$ref": "#/components/Divider" }, { "$ref": "#/components/Button" }, { "$ref": "#/components/TextField" }, { "$ref": "#/components/CheckBox" }, { "$ref": "#/components/ChoicePicker" }, { "$ref": "#/components/Slider" }, { "$ref": "#/components/DateTimeInput" }], "discriminator": { "propertyName": "component" } }, "anyFunction": { "oneOf": [{ "$ref": "#/functions/required" }, { "$ref": "#/functions/regex" }, { "$ref": "#/functions/length" }, { "$ref": "#/functions/numeric" }, { "$ref": "#/functions/email" }, { "$ref": "#/functions/formatString" }, { "$ref": "#/functions/formatNumber" }, { "$ref": "#/functions/formatCurrency" }, { "$ref": "#/functions/formatDate" }, { "$ref": "#/functions/pluralize" }, { "$ref": "#/functions/openUrl" }, { "$ref": "#/functions/and" }, { "$ref": "#/functions/or" }, { "$ref": "#/functions/not" }] } } };

// ../sdk/js/dist/catalog.js
var A2UI_EXTENSION_URI = "https://a2ui.org/a2a-extension/a2ui/v0.9.1";
var A2UI_CLIENT_CAPABILITIES_KEY = "a2uiClientCapabilities";
var A2UI_CAPABILITIES_VERSION_KEY = "v0.9";
var HOST_INTERFACE_VERSION = "0.14.0";
var SUPPORTED_HOST_INTERFACES = [HOST_INTERFACE_VERSION];
function checkHostInterface(version, supported = SUPPORTED_HOST_INTERFACES) {
  if (supported.includes(version))
    return [];
  const list = supported.map((v) => JSON.stringify(v)).join(", ");
  return [
    `host interface ${JSON.stringify(version)} is not one the platform supplies (it supplies ${list})`
  ];
}
var HOST_INTERFACE_GLOBAL = "__a2uiverse_host__";
var HOST_SPECIFIERS = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@a2ui/react/v0_9",
  "@a2ui/web_core/v0_9",
  "@a2ui/web_core/v0_9/basic_catalog",
  "zod"
];
var HOST_STYLESHEET_LOADER = "loadStylesheet";
var HOST_PACKAGES = [
  "react",
  "react-dom",
  "@a2ui/react",
  "@a2ui/web_core",
  "zod"
];
var packageOf = (specifier) => {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};
function classifySpecifier(specifier) {
  if (HOST_SPECIFIERS.includes(specifier))
    return "host";
  return HOST_PACKAGES.includes(packageOf(specifier)) ? "refuse" : "bundle";
}
var ajv2 = new Ajv20202({ allErrors: true, strict: true, allowUnionTypes: true });
var serverCapabilities = ajv2.compile(SERVER_CAPABILITIES_SCHEMA);
var serverCapabilitiesVersion = ajv2.compile(SERVER_CAPABILITIES_SCHEMA.properties[A2UI_CAPABILITIES_VERSION_KEY]);
function readSupportedCatalogIds(card) {
  const extension = card.capabilities?.extensions?.find((e) => e.uri === A2UI_EXTENSION_URI);
  const params = extension?.params;
  if (params === void 0)
    return { ok: true, value: [] };
  const versioned = Object.keys(params).some((key) => /^v\d/.test(key));
  const errors = versioned ? schemaErrors(serverCapabilities, params) : schemaErrors(serverCapabilitiesVersion, params);
  if (errors.length > 0) {
    return { ok: false, errors: errors.map((e) => `A2UI extension params${e}`) };
  }
  const inner = versioned ? params[A2UI_CAPABILITIES_VERSION_KEY] ?? {} : params;
  const ids = inner.supportedCatalogIds ?? [];
  return { ok: true, value: [...new Set(ids)] };
}
function clientCapabilities(supportedCatalogIds) {
  return { [A2UI_CAPABILITIES_VERSION_KEY]: { supportedCatalogIds: [...supportedCatalogIds] } };
}
var PUBLIC_CATALOG_IDS = [BASIC_CATALOG_ID];
function entitlementOf(handed, publicIds = PUBLIC_CATALOG_IDS) {
  return [.../* @__PURE__ */ new Set([...publicIds, ...handed])];
}

// ../sdk/js/dist/credential.js
var CREDENTIAL_TERMS = [
  "password",
  "passcode",
  "passphrase",
  "otp",
  "pin code",
  "pin input",
  "pin field",
  "pin number",
  "cvv",
  "cvc",
  "card number",
  "security code",
  "obscured"
];
function wordsOf(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean).join(" ").toLowerCase();
}
function credentialTermIn(name) {
  const words = ` ${wordsOf(name)} `;
  return CREDENTIAL_TERMS.find((term) => words.includes(` ${term} `));
}
var isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var LOCAL_DEF = "#/$defs/";
function catalogOptions(schema) {
  const defs = isObject(schema.$defs) ? schema.$defs : {};
  const options = /* @__PURE__ */ new Map();
  for (const [name, component] of Object.entries(schema.components ?? {})) {
    const found = /* @__PURE__ */ new Set();
    collectOptions(component, defs, found, /* @__PURE__ */ new Set());
    options.set(name, found);
  }
  return options;
}
function collectOptions(node, defs, found, visited) {
  if (Array.isArray(node)) {
    for (const item of node)
      collectOptions(item, defs, found, visited);
    return;
  }
  if (!isObject(node))
    return;
  if (Array.isArray(node.enum)) {
    for (const value of node.enum)
      if (typeof value === "string")
        found.add(value);
  }
  if (typeof node.const === "string")
    found.add(node.const);
  if (typeof node.$ref === "string" && node.$ref.startsWith(LOCAL_DEF)) {
    const name = node.$ref.slice(LOCAL_DEF.length);
    if (!visited.has(name)) {
      visited.add(name);
      collectOptions(defs[name], defs, found, visited);
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "enum" || key === "const" || key === "description" || key === "title")
      continue;
    collectOptions(value, defs, found, visited);
  }
}
var basic;
function basicCatalogOptions() {
  return basic ??= catalogOptions(BASIC_CATALOG_SCHEMA);
}
function credentialInputIn(components, options) {
  for (const component of components) {
    if (!isObject(component) || typeof component.component !== "string")
      continue;
    const type = component.component;
    const id = typeof component.id === "string" ? { id: component.id } : {};
    const typeTerm = credentialTermIn(type);
    if (typeTerm)
      return { component: type, ...id, term: typeTerm };
    const declared = options.get(type);
    for (const [prop, value] of Object.entries(component)) {
      if (prop === "id" || prop === "component")
        continue;
      const propTerm = credentialTermIn(prop);
      if (propTerm)
        return { component: type, ...id, prop, term: propTerm };
      if (typeof value !== "string" || !declared?.has(value))
        continue;
      const valueTerm = credentialTermIn(value);
      if (valueTerm)
        return { component: type, ...id, prop, value, term: valueTerm };
    }
  }
  return void 0;
}
function describeCredentialFinding(finding) {
  const component = `the ${finding.component} component`;
  if (finding.value !== void 0) {
    return `${component}'s ${finding.prop} ${JSON.stringify(finding.value)}`;
  }
  if (finding.prop !== void 0)
    return `${component}'s ${finding.prop} property`;
  return component;
}

// ../sdk/js/dist/artifact.js
import { Ajv2020 as Ajv20204 } from "ajv/dist/2020.js";

// ../sdk/js/dist/a2ui/validator.js
import { Ajv2020 as Ajv20203 } from "ajv/dist/2020.js";
import { Catalog } from "@a2ui/web_core/catalog";
import { A2uiIntegrityError, A2uiRecursionError } from "@a2ui/web_core/errors";
import { formatZodIssue, MessageProcessor } from "@a2ui/web_core/processing";
import { ComponentModel, SurfaceComponentsModel } from "@a2ui/web_core/state";
import { PayloadValidator, STRICT_VALIDATION, validateRecursionAndPaths } from "@a2ui/web_core/validation";
import { UpdateComponentsMessageSchema } from "@a2ui/web_core/v0_9";
var CATALOG_VERSION = "0.9";
var MESSAGE_VERSION = "v0.9";
var SURFACE_OPERATIONS = ["updateComponents", "updateDataModel"];
var MESSAGE_TYPES = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"];
var isObject2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var categoryOf = (error) => error instanceof A2uiRecursionError ? "RecursionError" : error instanceof A2uiIntegrityError ? "IntegrityError" : "ValidationError";
var messageOf2 = (error) => error instanceof Error ? error.message : String(error);
var isZodIssue = (value) => isObject2(value) && Array.isArray(value.path) && typeof value.message === "string";
function issueText(issue) {
  const label = `${issue.path.length > 0 ? issue.path.join(".") : "root"}: `;
  const parts = formatZodIssue(issue).split("; ").map((part) => part.startsWith(label) ? part.slice(label.length) : part);
  return [...new Set(parts)].join("; ");
}
function callPath(value, name, at = "") {
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) {
      const found = callPath(item, name, `${at}/${i}`);
      if (found !== void 0)
        return found;
    }
    return void 0;
  }
  if (!isObject2(value))
    return void 0;
  if (value.call === name)
    return `${at}/call`;
  for (const [key, child] of Object.entries(value)) {
    const found = callPath(child, name, `${at}/${key}`);
    if (found !== void 0)
      return found;
  }
  return void 0;
}
function componentFindings(error, component, base, componentId) {
  const tag = componentId !== void 0 ? { componentId } : {};
  const message = messageOf2(error);
  const fn = /^(?:Validation failed for function|Unrecognized function) '([^']+)'/.exec(message);
  if (fn) {
    const at = callPath(component, fn[1]) ?? "";
    return [{ category: "ValidationError", path: `${base}${at}`, ...tag, message }];
  }
  if (message.startsWith("Unknown component type")) {
    return [{ category: "ValidationError", path: `${base}/component`, ...tag, message }];
  }
  const details = error.details;
  const issues = Array.isArray(details) ? details.filter(isZodIssue) : [];
  if (issues.length === 0) {
    return [{ category: categoryOf(error), path: base, ...tag, message }];
  }
  const byPath = /* @__PURE__ */ new Map();
  for (const issue of issues) {
    const path = `${base}${issue.path.map((part) => `/${part}`).join("")}`;
    byPath.set(path, [...byPath.get(path) ?? [], issueText(issue)]);
  }
  return [...byPath].map(([path, texts]) => ({
    category: "ValidationError",
    path,
    ...tag,
    message: texts.join("; ")
  }));
}
function compileErrorsOf(catalog) {
  const catalogUri = new URL("catalog.json", String(COMMON_TYPES_SCHEMA.$id)).href;
  const defs = { ...catalog.$defs ?? {} };
  defs.theme ??= { type: "object" };
  defs.anyFunction ??= false;
  const own = { ...catalog, $defs: defs, $id: catalogUri };
  delete own.$schema;
  const ajv5 = new Ajv20203({ allErrors: true, strict: false, validateFormats: false });
  ajv5.addSchema(COMMON_TYPES_SCHEMA);
  ajv5.addSchema(own);
  const errors = [];
  for (const name of Object.keys(catalog.components ?? {})) {
    try {
      ajv5.compile({ $ref: `${catalogUri}#/components/${name}` });
    } catch (error) {
      errors.push(`components/${name}: ${messageOf2(error)}`);
    }
  }
  return errors;
}
function createA2uiValidator(options) {
  const schema = options.catalog;
  const ownId = typeof schema.catalogId === "string" ? schema.catalogId : typeof schema.$id === "string" ? schema.$id : "catalog";
  const catalogs = /* @__PURE__ */ new Map();
  const catalogFor = (id) => {
    let catalog = catalogs.get(id);
    if (!catalog) {
      catalog = Catalog.fromJson(schema, CATALOG_VERSION, id);
      catalogs.set(id, catalog);
    }
    return catalog;
  };
  const validate = (payload) => {
    const messages = Array.isArray(payload) ? payload : [payload];
    let own;
    try {
      own = catalogFor(ownId);
    } catch (error) {
      return [
        { category: "ValidationError", message: `the catalog does not load: ${messageOf2(error)}` }
      ];
    }
    const findings = [];
    const created = /* @__PURE__ */ new Map();
    const surfaces = /* @__PURE__ */ new Map();
    const surfaceOf = (id) => {
      let surface = surfaces.get(id);
      if (!surface) {
        surface = { components: [], duplicate: false };
        surfaces.set(id, surface);
      }
      return surface;
    };
    const touched = [];
    messages.forEach((message, index) => {
      const base = `/${index}`;
      if (!isObject2(message)) {
        findings.push({
          category: "ValidationError",
          path: base,
          message: "a message must be an object"
        });
        return;
      }
      const create = message.createSurface;
      if (isObject2(create) && typeof create.surfaceId === "string") {
        created.set(create.surfaceId, typeof create.catalogId === "string" ? create.catalogId : ownId);
      }
      for (const operation of SURFACE_OPERATIONS) {
        const op = message[operation];
        if (isObject2(op) && typeof op.surfaceId === "string")
          touched.push(op.surfaceId);
      }
      const update = message.updateComponents;
      if (!isObject2(update) || !Array.isArray(update.components))
        return;
      const surface = typeof update.surfaceId === "string" ? surfaceOf(update.surfaceId) : void 0;
      const seen = /* @__PURE__ */ new Set();
      update.components.forEach((component, i) => {
        const at = `${base}/updateComponents/components/${i}`;
        if (!isObject2(component)) {
          findings.push({
            category: "ValidationError",
            path: at,
            message: "a component must be an object"
          });
          return;
        }
        const id = typeof component.id === "string" ? component.id : void 0;
        if (id !== void 0 && seen.has(id)) {
          findings.push({
            category: "IntegrityError",
            componentId: id,
            message: `Duplicate component ID: '${id}'`
          });
          if (surface)
            surface.duplicate = true;
        }
        if (id !== void 0)
          seen.add(id);
        surface?.components.push(component);
        const { catalogId: _catalogId, ...judged } = component;
        try {
          new PayloadValidator(own, STRICT_VALIDATION).validateComponent(judged);
        } catch (error) {
          findings.push(...componentFindings(error, component, at, id));
        }
      });
    });
    const envelope = [];
    messages.forEach((message, index) => {
      const types = isObject2(message) ? MESSAGE_TYPES.filter((type) => type in message) : [];
      if (types.length !== 1 || types[0] !== "updateComponents") {
        if (isObject2(message))
          envelope.push(message);
        return;
      }
      const parsed = UpdateComponentsMessageSchema.safeParse(message);
      if (parsed.success)
        return;
      for (const issue of parsed.error.issues) {
        findings.push({
          category: "ValidationError",
          path: `/${index}${issue.path.map((part) => `/${part}`).join("")}`,
          message: issueText(issue)
        });
      }
    });
    const missing = [...new Set(touched)].filter((id) => !created.has(id));
    const lead = missing.map((surfaceId) => ({
      version: MESSAGE_VERSION,
      createSurface: { surfaceId, catalogId: ownId }
    }));
    const ids = /* @__PURE__ */ new Set([ownId, ...created.values()]);
    const processed = [...ids].map(catalogFor);
    try {
      new MessageProcessor(processed, void 0, {
        version: MESSAGE_VERSION,
        validationConfig: STRICT_VALIDATION
      }).processMessages(
        // The processor judges the messages' shape itself: that is what this pass asks of it.
        [...lead, ...envelope]
      );
    } catch (error) {
      findings.push({ category: categoryOf(error), message: messageOf2(error) });
    }
    for (const [surfaceId, { components, duplicate }] of surfaces) {
      if (duplicate || components.length === 0)
        continue;
      const model = new SurfaceComponentsModel(own);
      for (const component of components) {
        const { id, component: type, catalogId: _catalogId, ...properties } = component;
        if (typeof id !== "string" || !id)
          continue;
        const existing = model.get(id);
        const componentType = typeof type === "string" ? type : existing?.type;
        if (!componentType)
          continue;
        if (existing && existing.type === componentType) {
          existing.properties = properties;
          continue;
        }
        if (existing)
          model.removeComponent(id);
        model.addComponent(new ComponentModel(id, componentType, properties, own));
      }
      try {
        model.validateTopology({ ...STRICT_VALIDATION, allowMissingRoot: !created.has(surfaceId) });
      } catch (error) {
        findings.push({ category: categoryOf(error), message: messageOf2(error) });
      }
    }
    try {
      validateRecursionAndPaths(messages);
    } catch (error) {
      findings.push({ category: categoryOf(error), message: messageOf2(error) });
    }
    const said = /* @__PURE__ */ new Set();
    return findings.filter((finding) => {
      const key = `${finding.category}|${finding.path ?? ""}|${finding.message}`;
      if (said.has(key))
        return false;
      said.add(key);
      return true;
    });
  };
  return { validate, compileErrors: () => compileErrorsOf(schema) };
}
function formatA2uiFinding(finding) {
  const where = [finding.path, finding.componentId && `(${finding.componentId})`].filter(Boolean).join(" ");
  return where ? `${where}: ${finding.message}` : finding.message;
}

// ../sdk/js/dist/artifact.js
var ARTIFACT_DESCRIPTOR_FILE = "artifact.json";
var RELATIVE_PATH_PATTERN = "^(?!/)(?!.*(^|/)\\.\\.(/|$))[^\\\\]+$";
var HASH_PATTERN = "^sha256-[A-Za-z0-9+/]{43}=$";
var ARTIFACT_DESCRIPTOR_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://a2uiverse.dev/contracts/catalog-artifact",
  title: "A2UIVerse catalog artifact descriptor",
  description: "artifact.json at the root of a catalog artifact (catalog.json, artifact). Written by Stellify, the pack tool; validated by the marketplace at publish, the registry at install and the client at load, with one compiled schema. Versioned with the sdk; a change to its shape is additive.",
  type: "object",
  additionalProperties: false,
  required: ["catalogId", "entry", "schema", "hostInterface", "files", "package", "packedBy"],
  properties: {
    catalogId: {
      type: "string",
      minLength: 1,
      description: "The catalog's id — CATALOG.id, equal to the catalogId inside the schema file. Not necessarily a resolvable URI (A2UI)."
    },
    entry: {
      $ref: "#/$defs/relativePath",
      description: "The one ESM, relative to the artifact's root; a key of files."
    },
    schema: {
      $ref: "#/$defs/relativePath",
      description: "The catalog's catalog.json, relative to the artifact's root; a key of files."
    },
    hostInterface: {
      type: "string",
      pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$",
      description: "The version of the host-module interface the entry was built against — the A2UI runtime release the host lends."
    },
    files: {
      type: "object",
      minProperties: 2,
      propertyNames: { $ref: "#/$defs/relativePath" },
      additionalProperties: {
        type: "string",
        pattern: HASH_PATTERN,
        description: "The file's SHA-256 digest, base64, in the sha256-<base64> form."
      },
      description: "Every file of the artifact but this descriptor, by path relative to the artifact's root, with its hash."
    },
    package: {
      type: "object",
      additionalProperties: false,
      required: ["name", "version"],
      properties: {
        name: { type: "string", minLength: 1 },
        version: { type: "string", minLength: 1 }
      },
      description: "The catalog package the artifact was packed from, as its package.json names it."
    },
    packedBy: {
      type: "object",
      additionalProperties: false,
      required: ["tool", "version"],
      properties: {
        tool: { type: "string", minLength: 1 },
        version: { type: "string", minLength: 1 }
      },
      description: "The pack tool build that wrote the artifact."
    }
  },
  $defs: {
    relativePath: {
      type: "string",
      pattern: RELATIVE_PATH_PATTERN,
      description: "A path relative to the artifact's root: no leading slash, no .. segment, no backslash."
    }
  }
};
var ajv3 = new Ajv20204({ allErrors: true, strict: true, allowUnionTypes: true });
var descriptorSchema = ajv3.compile(ARTIFACT_DESCRIPTOR_SCHEMA);
function validateArtifactDescriptor(input) {
  const errors = schemaErrors(descriptorSchema, input);
  if (errors.length > 0)
    return { ok: false, errors };
  const descriptor = input;
  for (const field of ["entry", "schema"]) {
    if (!(descriptor[field] in descriptor.files)) {
      errors.push(`/${field}: ${JSON.stringify(descriptor[field])} is not listed in files`);
    }
  }
  return errors.length === 0 ? { ok: true, value: descriptor } : { ok: false, errors };
}
function toBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(binary);
}
async function hashArtifactFile(bytes) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256-${toBase64(new Uint8Array(digest))}`;
}
async function artifactIdOf(descriptorBytes) {
  const hash = await hashArtifactFile(descriptorBytes);
  return hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function verifyArtifactFiles(descriptor, files) {
  const errors = [];
  for (const [path, expected] of Object.entries(descriptor.files)) {
    const bytes = files.get(path);
    if (bytes === void 0) {
      errors.push(`${path}: listed in the descriptor but missing`);
      continue;
    }
    const actual = await hashArtifactFile(bytes);
    if (actual !== expected)
      errors.push(`${path}: hash is ${actual}, the descriptor says ${expected}`);
  }
  for (const path of files.keys()) {
    if (!(path in descriptor.files))
      errors.push(`${path}: present but not listed in the descriptor`);
  }
  return errors;
}
function checkArtifactSchema(descriptor, schema) {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    return [`${descriptor.schema}: not a JSON object`];
  }
  const errors = [];
  const { catalogId, components } = schema;
  if (catalogId !== descriptor.catalogId) {
    errors.push(`${descriptor.schema}: catalogId is ${JSON.stringify(catalogId)}, the descriptor says ${JSON.stringify(descriptor.catalogId)}`);
  }
  if (typeof components !== "object" || components === null || Array.isArray(components)) {
    errors.push(`${descriptor.schema}: components is not an object`);
  }
  return errors;
}
function checkCatalogSchemaCompiles(schema) {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    return ["not a JSON object"];
  }
  const catalog = schema;
  if (typeof catalog.components !== "object" || catalog.components === null) {
    return ["components is not an object"];
  }
  try {
    return createA2uiValidator({ catalog }).compileErrors();
  } catch (error) {
    return [`the catalog does not compile: ${error.message}`];
  }
}

// ../sdk/js/dist/gate.js
async function gateArtifact(files, index) {
  const label = `catalog artifact ${index + 1}`;
  const raw = files.get(ARTIFACT_DESCRIPTOR_FILE);
  if (!raw)
    return { findings: [`${label}: no ${ARTIFACT_DESCRIPTOR_FILE}`] };
  const json = parseJson(raw);
  if (!json.ok)
    return { findings: [`${label}: ${ARTIFACT_DESCRIPTOR_FILE}: ${json.error}`] };
  const read = validateArtifactDescriptor(json.value);
  if (!read.ok) {
    return { findings: read.errors.map((e) => `${label}: ${ARTIFACT_DESCRIPTOR_FILE}: ${e}`) };
  }
  const descriptor = read.value;
  const at = `${label} (${descriptor.catalogId})`;
  const findings = [];
  const listed = new Map(files);
  listed.delete(ARTIFACT_DESCRIPTOR_FILE);
  findings.push(...(await verifyArtifactFiles(descriptor, listed)).map((e) => `${at}: ${e}`));
  findings.push(...checkHostInterface(descriptor.hostInterface).map((e) => `${at}: ${e}`));
  const schemaBytes = listed.get(descriptor.schema);
  if (schemaBytes) {
    const schema = parseJson(schemaBytes);
    if (!schema.ok) {
      findings.push(`${at}: ${descriptor.schema}: ${schema.error}`);
    } else {
      findings.push(...checkArtifactSchema(descriptor, schema.value).map((e) => `${at}: ${e}`));
      findings.push(...checkCatalogSchemaCompiles(schema.value).map((e) => `${at}: ${descriptor.schema}: ${e}`));
    }
  }
  if (findings.length > 0)
    return { findings, catalogId: descriptor.catalogId };
  return {
    findings,
    catalogId: descriptor.catalogId,
    artifact: { id: await artifactIdOf(raw), descriptor, files }
  };
}
function parseJson(bytes) {
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch (err) {
    return { ok: false, error: `not JSON (${err.message})` };
  }
}

// ../sdk/js/dist/marketplace.js
import { Ajv2020 as Ajv20205 } from "ajv/dist/2020.js";
var MARKETPLACE_ROUTES = {
  /** Every entry; the Store page lists from it, Stellify filters it by its own publisher name. */
  index: "index.json",
  /** One entry; 404 when the app is not published. */
  entry: "apps/<appId>/entry.json",
  /** The app's preview document. */
  preview: "apps/<appId>/preview.json",
  /** An artifact's files under its id, immutable, exactly as the registry serves them. */
  artifact: "artifacts/<artifactId>/<path>",
  /** `?q=<words>`: the entries that match, each with its score, an app the words name first. */
  search: "search",
  /** `{publisher}` in; `{publisher, token}` once, or findings. No token. */
  claim: "claim",
  /** Bearer token; `{publisher}`, whose token it is; 401 for a token no publisher holds. */
  publisher: "publisher",
  /** Bearer token; the install body with a preview beside it. */
  publish: "publish",
  /** Bearer token; `{appId}`. */
  unpublish: "unpublish",
  /** `{appId}`; accepted always, a nudge the marketplace verifies itself. No token. */
  report: "report"
};
var artifactPath = (artifactId, path) => MARKETPLACE_ROUTES.artifact.replace("<artifactId>", artifactId).replace("<path>", path);
var ARTIFACT_ID_PATTERN = "^sha256-[A-Za-z0-9_-]{43}$";
var INDEX_ENTRY_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://a2uiverse.dev/contracts/marketplace-entry",
  title: "A2UIVerse marketplace index entry",
  description: "One entry per app id, as the marketplace serves it at apps/<appId>/entry.json and lists it in index.json. Written by the marketplace at publish; read by the orchestrator for the update check and install from the marketplace, by Stellify for the ahead-of-the-Store notices, and by the Store page. Versioned with the sdk; a change to its shape is additive.",
  type: "object",
  additionalProperties: false,
  required: [
    "appId",
    "publisher",
    "cardUrl",
    "card",
    "catalogs",
    "versions",
    "publishedAt",
    "retired"
  ],
  properties: {
    appId: { type: "string", minLength: 1 },
    publisher: { type: "string", minLength: 1, description: "The publisher's name." },
    cardUrl: {
      type: "string",
      minLength: 1,
      description: "Where the marketplace fetched the live card from; what the registry stores at install."
    },
    card: {
      type: "object",
      required: ["name", "description", "url", "version"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        url: { type: "string" },
        version: { type: "string", minLength: 1, description: "The agent's version: the app's." }
      },
      description: "The A2A AgentCard as published, verbatim."
    },
    catalogs: {
      type: "object",
      propertyNames: { minLength: 1 },
      additionalProperties: { type: "string", pattern: ARTIFACT_ID_PATTERN },
      description: "Catalog id to artifact id: the builds."
    },
    versions: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
      description: "Every version this app id has published, in publish order; the last is the card's."
    },
    publishedAt: { type: "string", minLength: 1 },
    retired: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
      description: "Catalog ids this app once published and its current card no longer names."
    },
    aheadOfStore: {
      type: "object",
      additionalProperties: false,
      required: ["catalogIds", "seenAt"],
      properties: {
        catalogIds: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
        version: { type: "string", minLength: 1 },
        seenAt: { type: "string", minLength: 1 }
      },
      description: "What the live card declares and the Store lacks — catalog ids, a version — and when the marketplace saw it. Absent when they agree."
    }
  }
};
var ajv4 = new Ajv20205({ allErrors: true, strict: true, allowUnionTypes: true });
var entrySchema = ajv4.compile(INDEX_ENTRY_SCHEMA);
function validateIndexEntry(input) {
  const errors = schemaErrors(entrySchema, input);
  if (errors.length > 0)
    return { ok: false, errors };
  const entry = input;
  const last = entry.versions[entry.versions.length - 1];
  if (last !== entry.card.version) {
    errors.push(`/versions: the last published version is ${JSON.stringify(last)}, the card’s is ${JSON.stringify(entry.card.version)}`);
  }
  for (const id of entry.retired) {
    if (id in entry.catalogs) {
      errors.push(`/retired: ${JSON.stringify(id)} is retired and among the catalogs`);
    }
  }
  return errors.length === 0 ? { ok: true, value: entry } : { ok: false, errors };
}
var PREVIEW_CAPTURED_BY = ["marketplace", "publisher"];
var PREVIEW_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://a2uiverse.dev/contracts/marketplace-preview",
  title: "A2UIVerse marketplace preview",
  description: "An app's preview, served at apps/<appId>/preview.json: the smoke test's paint, stored with the published version — the A2UI messages the agent answered with, in order, for the Store page to render through the client's ordinary loader. Captured by the marketplace at publish, or by the publisher's preview for an app that needs sign-in and sent beside the artifacts; checked the same way either way. Versioned with the sdk; a change to its shape is additive.",
  type: "object",
  additionalProperties: false,
  required: ["appId", "version", "words", "messages", "capturedBy", "capturedAt"],
  properties: {
    appId: { type: "string", minLength: 1 },
    version: {
      type: "string",
      minLength: 1,
      description: "The card version the paint was captured at."
    },
    words: { type: "string", description: "The request text the agent was sent." },
    messages: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["version"],
        properties: { version: { type: "string" } },
        description: "One A2UI server-to-client message, as the agent sent it."
      },
      description: "The A2UI server-to-client messages in order, every kind kept — createSurface, updateComponents, updateDataModel, deleteSurface — surface ids as the agent wrote them."
    },
    capturedBy: { type: "string", enum: [...PREVIEW_CAPTURED_BY] },
    capturedAt: { type: "string", minLength: 1 }
  }
};
var previewSchema = ajv4.compile(PREVIEW_SCHEMA);
function validatePreview(input) {
  const errors = schemaErrors(previewSchema, input);
  return errors.length === 0 ? { ok: true, value: input } : { ok: false, errors };
}

// ../sdk/js/dist/smoke.js
import { Catalog as Catalog2 } from "@a2ui/web_core/catalog";
import { buildComponentRefMap, getComponentReferences, V09_CHILD_REF_OPTIONS } from "@a2ui/web_core/validation";
var SMOKE_GREETING = "Hello! Show me what you can do.";
function smokeWords(card) {
  const example = card.skills?.[0]?.examples?.[0];
  return typeof example === "string" && example.trim() !== "" ? example : SMOKE_GREETING;
}
var isObject3 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function a2uiMessagesIn(data) {
  if (!isObject3(data))
    return [];
  if (typeof data.version === "string")
    return [data];
  if (Array.isArray(data.messages)) {
    return data.messages.filter((m) => isObject3(m) && typeof m.version === "string");
  }
  return [];
}
function a2uiMessagesOf(parts) {
  const messages = [];
  for (const part of parts)
    if (part.kind === "data")
      messages.push(...a2uiMessagesIn(part.data));
  return messages;
}
var OPERATIONS = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"];
var ROOT_ID = "root";
function settled(messages, refs) {
  const byId = /* @__PURE__ */ new Map();
  const loose = [];
  const rest = [];
  let first;
  for (const message of messages) {
    const update = message.updateComponents;
    if (!isObject3(update) || !Array.isArray(update.components)) {
      rest.push(message);
      continue;
    }
    first ??= { at: rest.length, message, update };
    for (const component of update.components) {
      if (isObject3(component) && typeof component.id === "string")
        byId.set(component.id, component);
      else
        loose.push(component);
    }
  }
  if (!first)
    return rest;
  const drawn = /* @__PURE__ */ new Set();
  const visit = (id) => {
    const component = byId.get(id);
    if (!component || drawn.has(id))
      return;
    drawn.add(id);
    for (const [ref] of getComponentReferences(component, refs))
      visit(ref);
  };
  visit(ROOT_ID);
  const tree = byId.has(ROOT_ID) ? [...byId.values()].filter((c) => drawn.has(c.id)) : [...byId.values()];
  const components = [...tree, ...loose];
  rest.splice(first.at, 0, { ...first.message, updateComponents: { ...first.update, components } });
  return rest;
}
function checkPaint(messages, check) {
  const findings = [];
  const surfaces = /* @__PURE__ */ new Map();
  for (const message of messages) {
    const create = message.createSurface;
    if (isObject3(create) && typeof create.surfaceId === "string") {
      const catalogId = typeof create.catalogId === "string" ? create.catalogId : void 0;
      surfaces.set(create.surfaceId, { catalogId, messages: [] });
    }
    const operation = OPERATIONS.map((key) => message[key]).find(isObject3);
    const surfaceId = isObject3(operation) ? operation.surfaceId : void 0;
    if (typeof surfaceId === "string")
      surfaces.get(surfaceId)?.messages.push(message);
  }
  if (surfaces.size === 0)
    return ["the answer paints nothing: no createSurface"];
  const validators = /* @__PURE__ */ new Map();
  const refMaps = /* @__PURE__ */ new Map();
  const options = /* @__PURE__ */ new Map();
  for (const [surfaceId, { catalogId, messages: own }] of surfaces) {
    const at = `surface ${JSON.stringify(surfaceId)}`;
    if (catalogId === void 0) {
      findings.push(`${at}: createSurface names no catalogId`);
      continue;
    }
    if (!check.entitlement.includes(catalogId)) {
      findings.push(`${at} is painted in catalog ${JSON.stringify(catalogId)}, outside the entitlement`);
      continue;
    }
    const schema = check.schemaFor(catalogId);
    if (!schema) {
      findings.push(`${at}: no schema for catalog ${JSON.stringify(catalogId)}`);
      continue;
    }
    let validator = validators.get(catalogId);
    if (!validator) {
      validator = createA2uiValidator({ catalog: schema });
      validators.set(catalogId, validator);
    }
    let refs = refMaps.get(catalogId);
    if (!refs) {
      try {
        refs = buildComponentRefMap(Catalog2.fromJson(schema, "0.9", catalogId), V09_CHILD_REF_OPTIONS);
      } catch (error) {
        findings.push(`${at}: the catalog does not load: ${error.message}`);
        continue;
      }
      refMaps.set(catalogId, refs);
    }
    findings.push(...validator.validate(settled(own, refs)).map((f) => `${at}: ${formatA2uiFinding(f)}`));
    let declared = options.get(catalogId);
    if (!declared) {
      declared = catalogId === BASIC_CATALOG_ID ? basicCatalogOptions() : catalogOptions(schema);
      options.set(catalogId, declared);
    }
    for (const message of own) {
      const update = message.updateComponents;
      if (!isObject3(update) || !Array.isArray(update.components))
        continue;
      const found = credentialInputIn(update.components, declared);
      if (found)
        findings.push(`${at}: a credential input: ${describeCredentialFinding(found)}`);
    }
  }
  return findings;
}

// src/pack.ts
import { existsSync as existsSync5, readFileSync as readFileSync4 } from "node:fs";
import { join as join4, resolve as resolve2 } from "node:path";

// src/bundle.ts
import { build as build2 } from "esbuild";
import { relative as relative2, sep as sep2 } from "node:path";

// src/layout.ts
import { existsSync as existsSync2, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join as join2, relative, sep } from "node:path";
var posix = (path) => path.split(sep).join("/");
var NODE_MODULES = `${sep}node_modules${sep}`;
function owningPackage(file) {
  let dir = dirname(file);
  while (true) {
    const parent = dirname(dir);
    const underScope = basename(parent).startsWith("@") && basename(dirname(parent)) === "node_modules";
    if (basename(parent) === "node_modules" || underScope) {
      const manifest = join2(dir, "package.json");
      if (existsSync2(manifest)) {
        const name = JSON.parse(readFileSync(manifest, "utf8")).name;
        if (typeof name === "string" && name !== "") return { dir, name };
      }
    }
    if (parent === dir) return void 0;
    dir = parent;
  }
}
var Layout = class {
  root;
  constructor(packageDir) {
    this.root = realpathSync(packageDir);
  }
  /** The artifact path of a file on disk, or undefined when it belongs to neither the package nor a dependency. */
  artifactPathOf(file) {
    const real = realpathSync(file);
    if (real.startsWith(this.root + sep) && !real.slice(this.root.length).includes(NODE_MODULES)) {
      return posix(relative(this.root, real));
    }
    const owner = owningPackage(real);
    if (owner === void 0) return void 0;
    return `node_modules/${owner.name}/${posix(relative(owner.dir, real))}`;
  }
};

// src/stylesheets.ts
import { existsSync as existsSync3, readFileSync as readFileSync2, statSync } from "node:fs";
import { dirname as dirname2, posix as posix2, resolve } from "node:path";
var URL_REF = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s]+))\s*\)/g;
var IMPORT_REF = /@import\s+(?:url\(\s*)?(?:"([^"]*)"|'([^']*)')/g;
var isExternal = (ref) => ref === "" || ref.startsWith("#") || ref.startsWith("data:") || ref.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("//");
function stylesheetRefs(css) {
  const refs = [];
  for (const match of css.matchAll(URL_REF)) refs.push(match[1] ?? match[2] ?? match[3] ?? "");
  for (const match of css.matchAll(IMPORT_REF)) refs.push(match[1] ?? match[2] ?? "");
  return refs;
}
function copyStylesheet(layout, file, artifactPath2, copied) {
  if (copied.files.has(artifactPath2)) return;
  const bytes = readFileSync2(file);
  copied.files.set(artifactPath2, new Uint8Array(bytes));
  const css = bytes.toString("utf8");
  for (const ref of stylesheetRefs(css)) {
    if (isExternal(ref)) continue;
    const bare = ref.replace(/[?#].*$/, "");
    if (bare === "") continue;
    const asset = resolve(dirname2(file), bare);
    if (!existsSync3(asset) || !statSync(asset).isFile()) {
      copied.findings.push({
        file: artifactPath2,
        reason: `${JSON.stringify(ref)} does not exist (${posix2.normalize(posix2.join(posix2.dirname(artifactPath2), bare))})`
      });
      continue;
    }
    const assetPath = layout.artifactPathOf(asset);
    const expected = posix2.normalize(posix2.join(posix2.dirname(artifactPath2), bare));
    if (assetPath === void 0 || assetPath !== expected) {
      copied.findings.push({
        file: artifactPath2,
        reason: `${JSON.stringify(ref)} is outside the package and its dependencies; a stylesheet may only reach files beside it`
      });
      continue;
    }
    if (/\.css$/i.test(bare)) copyStylesheet(layout, asset, assetPath, copied);
    else if (!copied.files.has(assetPath)) {
      copied.files.set(assetPath, new Uint8Array(readFileSync2(asset)));
    }
  }
}

// src/bundle.ts
var HOST_NAMESPACE = "a2uiverse-host";
var STYLESHEET_NAMESPACE = "a2uiverse-stylesheet";
var LOADS_NAMESPACE = "a2uiverse-stylesheet-loads";
var LOADS = "a2uiverse:stylesheet-loads";
var STYLESHEET = /\.css(\?.*)?$/i;
var EAGER = "a2uiverse:stylesheet-eager:";
var lent = () => `the host lends ${HOST_SPECIFIERS.map((s) => JSON.stringify(s)).join(", ")}`;
function hostPlugin() {
  return {
    name: "a2uiverse-host",
    setup(api) {
      api.onResolve({ filter: /^[^./]/ }, (args) => {
        if (args.namespace === HOST_NAMESPACE) return void 0;
        switch (classifySpecifier(args.path)) {
          case "host":
            return { path: args.path, namespace: HOST_NAMESPACE };
          case "refuse":
            return {
              errors: [{ text: `${JSON.stringify(args.path)} is not lent by the host; ${lent()}` }]
            };
          default:
            return void 0;
        }
      });
      api.onLoad({ filter: /.*/, namespace: HOST_NAMESPACE }, (args) => ({
        contents: `module.exports = globalThis.${HOST_INTERFACE_GLOBAL}.modules[${JSON.stringify(args.path)}];`,
        loader: "js"
      }));
    }
  };
}
function stylesheetPlugin(layout, copied) {
  return {
    name: "a2uiverse-stylesheet",
    setup(api) {
      api.onResolve({ filter: /^a2uiverse:stylesheet-eager:/ }, (args) => ({
        path: args.path.slice(EAGER.length),
        namespace: STYLESHEET_NAMESPACE
      }));
      api.onResolve({ filter: STYLESHEET }, async (args) => {
        if (args.namespace === STYLESHEET_NAMESPACE || args.pluginData === STYLESHEET_NAMESPACE || args.path.startsWith(EAGER)) {
          return void 0;
        }
        const resolved = await api.resolve(args.path, {
          resolveDir: args.resolveDir,
          importer: args.importer,
          kind: args.kind,
          pluginData: STYLESHEET_NAMESPACE
        });
        if (resolved.errors.length > 0) return { errors: resolved.errors };
        const artifactPath2 = layout.artifactPathOf(resolved.path);
        if (artifactPath2 === void 0) {
          return {
            errors: [
              {
                text: `${JSON.stringify(args.path)} resolves outside the package and its dependencies`
              }
            ]
          };
        }
        copyStylesheet(layout, resolved.path, artifactPath2, copied);
        return { path: artifactPath2, namespace: STYLESHEET_NAMESPACE };
      });
      api.onLoad({ filter: /.*/, namespace: STYLESHEET_NAMESPACE }, (args) => ({
        contents: [
          `import {loads} from ${JSON.stringify(LOADS)};`,
          `const load = globalThis.${HOST_INTERFACE_GLOBAL}.${HOST_STYLESHEET_LOADER}(new URL(${JSON.stringify(args.path)}, import.meta.url).href);`,
          "if (loads.done) await load;",
          "else loads.early.push(load);"
        ].join("\n"),
        loader: "js"
      }));
      api.onResolve({ filter: /^a2uiverse:stylesheet-loads$/ }, () => ({
        path: LOADS,
        namespace: LOADS_NAMESPACE
      }));
      api.onLoad({ filter: /.*/, namespace: LOADS_NAMESPACE }, () => ({
        contents: "export const loads = {early: [], done: false};",
        loader: "js"
      }));
    }
  };
}
var posix3 = (path) => path.split(sep2).join("/");
function findingOf(packageDir, entryRel, message) {
  const file = message.location?.file;
  return {
    file: file === void 0 ? entryRel : posix3(relative2(packageDir, file)) || file,
    reason: message.text
  };
}
function lazySheets(inputs) {
  const prefix = `${STYLESHEET_NAMESPACE}:`;
  const lazy = /* @__PURE__ */ new Set();
  for (const input of Object.values(inputs)) {
    for (const { path, kind } of input.imports) {
      if (kind === "dynamic-import" && path.startsWith(prefix)) lazy.add(path.slice(prefix.length));
    }
  }
  return [...lazy].sort();
}
async function bundleEntry(packageDir, entryRel) {
  const first = await bundleOnce(packageDir, entryRel, []);
  if (first.code === void 0 || first.lazy.length === 0) return first;
  return bundleOnce(packageDir, entryRel, first.lazy);
}
async function bundleOnce(packageDir, entryRel, eager) {
  const layout = new Layout(packageDir);
  const copied = { files: /* @__PURE__ */ new Map(), findings: [] };
  try {
    const result = await build2({
      absWorkingDir: packageDir,
      // The entry, the sheets it imports only later, then the wait for every stylesheet load
      // they started (the module header). Its named exports pass through; a default export is no
      // part of the catalog export contract.
      stdin: {
        contents: [
          `export * from ${JSON.stringify(`./${posix3(entryRel)}`)};`,
          ...eager.map((path) => `import ${JSON.stringify(`${EAGER}${path}`)};`),
          `import {loads} from ${JSON.stringify(LOADS)};`,
          "await Promise.all(loads.early);",
          "loads.done = true;"
        ].join("\n"),
        resolveDir: packageDir,
        sourcefile: "stellify-entry.js",
        loader: "js"
      },
      outfile: "index.js",
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      splitting: false,
      minify: false,
      sourcemap: false,
      treeShaking: true,
      charset: "utf8",
      legalComments: "none",
      write: false,
      metafile: true,
      logLevel: "silent",
      plugins: [hostPlugin(), stylesheetPlugin(layout, copied)]
    });
    const output = result.metafile.outputs["index.js"];
    return {
      code: result.outputFiles[0].text,
      exports: output?.exports ?? [],
      copied: copied.files,
      findings: [...copied.findings, ...result.errors.map((m) => findingOf(packageDir, entryRel, m))],
      lazy: lazySheets(result.metafile.inputs)
    };
  } catch (error) {
    const messages = error.errors;
    const findings = messages === void 0 ? [{ file: entryRel, reason: error.message }] : messages.map((m) => findingOf(packageDir, entryRel, m));
    return {
      exports: [],
      copied: copied.files,
      findings: [...copied.findings, ...findings],
      lazy: []
    };
  }
}

// src/manifest.ts
import { existsSync as existsSync4, readFileSync as readFileSync3 } from "node:fs";
import { join as join3 } from "node:path";
var strip = (path) => path.replace(/^\.\//, "");
function entryOf(exports, main) {
  const dot = typeof exports === "string" ? exports : typeof exports === "object" && exports !== null && "." in exports ? exports["."] : exports;
  const pick = (value) => {
    if (typeof value === "string") return value;
    if (typeof value !== "object" || value === null) return void 0;
    const record = value;
    return pick(record.import) ?? pick(record.default);
  };
  const entry = pick(dot) ?? (typeof main === "string" ? main : void 0);
  return entry === void 0 ? void 0 : strip(entry);
}
function readManifest(packageDir) {
  const path = join3(packageDir, "package.json");
  if (!existsSync4(path))
    return { findings: [{ file: "package.json", reason: "no package.json here" }] };
  let json;
  try {
    json = JSON.parse(readFileSync3(path, "utf8"));
  } catch (error) {
    return { findings: [{ file: "package.json", reason: `not JSON: ${error.message}` }] };
  }
  const findings = [];
  if (typeof json.name !== "string" || json.name === "")
    findings.push({ file: "package.json", reason: "no name" });
  if (typeof json.version !== "string" || json.version === "")
    findings.push({ file: "package.json", reason: "no version" });
  if (findings.length > 0) return { findings };
  return {
    manifest: {
      name: json.name,
      version: json.version,
      entry: entryOf(json.exports, json.main)
    },
    findings
  };
}

// src/pack.ts
var TOOL_NAME = "@a2uiverse/stellify";
var TOOL_VERSION = JSON.parse(readFileSync4(new URL("../package.json", import.meta.url), "utf8")).version;
var DEFAULT_SCHEMA = "catalogs/v0.9.1/catalog.json";
var DEFAULT_OUT_DIR = "dist/artifact";
var ENTRY_PATH = "index.js";
var SCHEMA_PATH = "catalog.json";
var sorted = (files) => new Map([...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
async function stellify(packageDir, options = {}) {
  packageDir = resolve2(packageDir);
  const findings = [];
  const loaded = await loadConfig(packageDir);
  findings.push(...loaded.findings);
  const config = { ...loaded.config, ...options };
  const outDir = resolve2(packageDir, config.outDir ?? DEFAULT_OUT_DIR);
  const result = (files2, descriptor2) => ({
    packageDir,
    outDir,
    descriptor: descriptor2,
    files: files2,
    findings
  });
  const hostInterface = options.hostInterface ?? HOST_INTERFACE_VERSION;
  if (hostInterface !== HOST_INTERFACE_VERSION) {
    findings.push({
      file: "package.json",
      reason: `host interface ${JSON.stringify(hostInterface)} is not one the platform supplies; it supplies ${JSON.stringify(HOST_INTERFACE_VERSION)}`
    });
  }
  const read = readManifest(packageDir);
  findings.push(...read.findings);
  const manifest = read.manifest;
  const schemaRel = config.schema ?? DEFAULT_SCHEMA;
  let schema;
  let schemaBytes;
  let catalogId;
  if (!existsSync5(join4(packageDir, schemaRel))) {
    findings.push({ file: schemaRel, reason: "the catalog schema is missing" });
  } else {
    schemaBytes = new Uint8Array(readFileSync4(join4(packageDir, schemaRel)));
    try {
      schema = JSON.parse(Buffer.from(schemaBytes).toString("utf8"));
    } catch (error) {
      findings.push({ file: schemaRel, reason: `not JSON: ${error.message}` });
    }
  }
  if (schema !== void 0) {
    const id = schema.catalogId;
    if (typeof id !== "string" || id === "") {
      findings.push({ file: schemaRel, reason: "catalogId is missing or empty" });
    } else {
      catalogId = id;
      if (config.catalogId !== void 0 && config.catalogId !== id) {
        findings.push({
          file: "stellify.config.ts",
          reason: `catalogId is ${JSON.stringify(config.catalogId)}, the schema says ${JSON.stringify(id)}`
        });
      }
    }
    for (const error of checkCatalogSchemaCompiles(schema))
      findings.push({ file: schemaRel, reason: error });
  }
  const entryRel = config.entry ?? manifest?.entry;
  let code;
  let copied = /* @__PURE__ */ new Map();
  if (entryRel === void 0) {
    if (manifest !== void 0)
      findings.push({ file: "package.json", reason: 'neither exports["."] nor main names an entry' });
  } else if (!existsSync5(join4(packageDir, entryRel))) {
    findings.push({ file: entryRel, reason: `${entryRel} is missing — build the package first` });
  } else {
    const bundle = await bundleEntry(packageDir, entryRel);
    findings.push(...bundle.findings);
    if (bundle.code !== void 0 && !bundle.exports.includes("CATALOG")) {
      findings.push({
        file: entryRel,
        reason: "the entry exports no CATALOG — export your Catalog from @a2ui/web_core"
      });
    }
    code = bundle.code;
    copied = bundle.copied;
  }
  if (findings.length > 0 || code === void 0 || schemaBytes === void 0 || manifest === void 0) {
    return result(sorted(copied), null);
  }
  const files = sorted(
    new Map([...copied, [ENTRY_PATH, new TextEncoder().encode(code)], [SCHEMA_PATH, schemaBytes]])
  );
  const hashes = {};
  for (const [path, bytes] of files) hashes[path] = await hashArtifactFile(bytes);
  const descriptor = {
    catalogId,
    entry: ENTRY_PATH,
    schema: SCHEMA_PATH,
    hostInterface,
    files: hashes,
    package: { name: manifest.name, version: manifest.version },
    packedBy: { tool: TOOL_NAME, version: TOOL_VERSION }
  };
  const valid = validateArtifactDescriptor(descriptor);
  if (!valid.ok) {
    for (const error of valid.errors) findings.push({ file: "artifact.json", reason: error });
    return result(files, null);
  }
  for (const error of checkArtifactSchema(valid.value, schema))
    findings.push({ file: SCHEMA_PATH, reason: error });
  for (const error of await verifyArtifactFiles(valid.value, files))
    findings.push({ file: "artifact.json", reason: error });
  return result(files, findings.length === 0 ? descriptor : null);
}

// src/write.ts
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname as dirname3, join as join5 } from "node:path";
var DESCRIPTOR_FILE = "artifact.json";
function artifactFiles(result) {
  if (result.findings.length > 0 || result.descriptor === null) {
    throw new Error(`the result has ${result.findings.length} findings; no artifact`);
  }
  const descriptor = new TextEncoder().encode(`${JSON.stringify(result.descriptor, null, 2)}
`);
  return new Map([...result.files, [DESCRIPTOR_FILE, descriptor]]);
}
async function writeArtifact(result, outDir = result.outDir) {
  if (result.findings.length > 0 || result.descriptor === null) {
    throw new Error(`the result has ${result.findings.length} findings; nothing written`);
  }
  const files = artifactFiles(result);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const [path, bytes] of files) {
    const target = join5(outDir, path);
    mkdirSync(dirname3(target), { recursive: true });
    writeFileSync(target, bytes);
  }
  return outDir;
}

// src/card.ts
async function fetchCard(cardUrl, timeoutMs, fetchImpl = fetch) {
  const signal = AbortSignal.timeout(timeoutMs);
  let response;
  try {
    response = await fetchImpl(cardUrl, { signal, headers: { accept: "application/json" } });
  } catch (err) {
    if (signal.aborted) throw new Error(`did not answer within ${timeoutMs / 1e3} s`);
    throw new Error(err.message);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let card;
  try {
    card = await response.json();
  } catch (err) {
    throw new Error(`not JSON (${err.message})`);
  }
  if (typeof card !== "object" || card === null) throw new Error("not an agent card");
  const c = card;
  if (typeof c.url !== "string" || typeof c.name !== "string") {
    throw new Error("not an agent card: no url or name");
  }
  return card;
}

// src/credential.ts
function requiresSignIn(card) {
  const security = card.security;
  return Array.isArray(security) && security.length > 0 && security.every(
    (alternative) => typeof alternative === "object" && alternative !== null && Object.keys(alternative).length > 0
  );
}
var UNSUPPORTED_SCHEME = "the card’s sign-in scheme is not supported here: a credential rides as a header, for OAuth with the authorization-code flow, OpenID Connect, http bearer, or apiKey in a header";
function credentialHeaders(card, secret) {
  for (const alternative of card.security ?? []) {
    const keys = Object.keys(alternative);
    if (keys.length !== 1) continue;
    const headers = headersFor(card.securitySchemes?.[keys[0]], secret);
    if (headers) return { ok: true, headers };
  }
  return { ok: false, finding: UNSUPPORTED_SCHEME };
}
function headersFor(scheme, secret) {
  if (typeof scheme !== "object" || scheme === null) return void 0;
  const s = scheme;
  const bearer = { Authorization: `Bearer ${secret}` };
  switch (s.type) {
    case "oauth2": {
      const flows = s.flows;
      return flows?.authorizationCode ? bearer : void 0;
    }
    case "openIdConnect":
      return bearer;
    case "http":
      return typeof s.scheme === "string" && s.scheme.toLowerCase() === "bearer" ? bearer : void 0;
    case "apiKey":
      return s.in === "header" && typeof s.name === "string" && s.name !== "" ? { [s.name]: secret } : void 0;
    default:
      return void 0;
  }
}

// src/marketplace.ts
var trim = (base) => base.replace(/\/+$/, "");
async function get(base, path, fetchImpl) {
  try {
    return await fetchImpl(`${trim(base)}/${path}`);
  } catch (err) {
    throw new Error(`cannot reach the marketplace at ${base}: ${err.message}`);
  }
}
async function fetchIndex(base, fetchImpl = fetch) {
  const response = await get(base, MARKETPLACE_ROUTES.index, fetchImpl);
  if (!response.ok) {
    throw new Error(`the marketplace answered ${response.status} to ${MARKETPLACE_ROUTES.index}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`${MARKETPLACE_ROUTES.index} is not a list`);
  return data.map((item, i) => {
    const read = validateIndexEntry(item);
    if (!read.ok) {
      throw new Error(
        `${MARKETPLACE_ROUTES.index}[${i}] is not an entry: ${read.errors.join("; ")}`
      );
    }
    return read.value;
  });
}
async function fetchArtifactFile(base, artifactId, path, fetchImpl = fetch) {
  const route = artifactPath(artifactId, path);
  const response = await get(base, route, fetchImpl);
  if (!response.ok) throw new Error(`the marketplace answered ${response.status} to ${route}`);
  return new Uint8Array(await response.arrayBuffer());
}
async function post(base, path, body, token, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(`${trim(base)}/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...token === void 0 ? {} : { authorization: `Bearer ${token}` }
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error(`cannot reach the marketplace at ${base}: ${err.message}`);
  }
  let parsed = void 0;
  const text = await response.text();
  if (text !== "") {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: response.status, body: parsed };
}
var postClaim = (base, name, fetchImpl = fetch) => post(base, MARKETPLACE_ROUTES.claim, { publisher: name }, void 0, fetchImpl);
var postPublish = (base, token, body, fetchImpl = fetch) => post(base, MARKETPLACE_ROUTES.publish, body, token, fetchImpl);
var postUnpublish = (base, token, appId, fetchImpl = fetch) => post(base, MARKETPLACE_ROUTES.unpublish, { appId }, token, fetchImpl);
function findingsOf(answer, route) {
  const body = answer.body;
  if (typeof body === "object" && body !== null && Array.isArray(body.findings) && body.findings.every((f) => typeof f === "string")) {
    return body.findings;
  }
  return [`the marketplace answered ${answer.status} to ${route} with no findings`];
}

// src/notices.ts
function noticesOf(entries, publisher) {
  return entries.flatMap((entry) => {
    const flag = entry.aheadOfStore;
    if (entry.publisher !== publisher || !flag) return [];
    return [
      {
        appId: entry.appId,
        catalogIds: [...flag.catalogIds],
        ...flag.version === void 0 ? {} : { version: flag.version },
        seenAt: flag.seenAt
      }
    ];
  });
}
function describeLacks(flag) {
  const lacks = [];
  if (flag.catalogIds.length > 0) {
    lacks.push(
      `catalog${flag.catalogIds.length === 1 ? "" : "s"} ${flag.catalogIds.join(", ")} the Store has no artifact for`
    );
  }
  if (flag.version !== void 0) lacks.push(`version ${flag.version} the Store does not know`);
  return lacks.join(", and ");
}
function describeNotice(notice) {
  return `notice: ${notice.appId} is ahead of the Store: its card declares ${describeLacks(notice)}; publish it`;
}

// src/transport.ts
import { randomUUID } from "node:crypto";
import {
  ClientFactory,
  DefaultAgentCardResolver,
  JsonRpcTransportFactory,
  ServiceParameters,
  withA2AExtensions
} from "@a2a-js/sdk/client";
var A2UI_EXTENSION_URI_V09 = "https://a2ui.org/a2a-extension/a2ui/v0.9";
var FAILED_STATES = /* @__PURE__ */ new Set(["failed", "canceled", "rejected"]);
var TERMINAL_STATES = /* @__PURE__ */ new Set([
  "failed",
  "canceled",
  "rejected",
  "completed"
]);
var UnauthorizedError = class extends Error {
  constructor() {
    super("the agent refused the request: 401");
  }
};
function a2aSmokeRunner(options = {}) {
  const base = options.fetchImpl ?? fetch;
  return async ({ card, entitlement, words, timeoutMs, headers }) => {
    const signal = AbortSignal.timeout(timeoutMs);
    const fetchImpl = async (input, init) => {
      const merged = new Headers(init?.headers);
      for (const [name, value] of Object.entries(headers ?? {})) merged.set(name, value);
      const response = await base(input, { ...init, headers: merged, signal });
      if (response.status === 401) {
        await response.body?.cancel().catch(() => {
        });
        throw new UnauthorizedError();
      }
      return response;
    };
    const factory = new ClientFactory({
      transports: [new JsonRpcTransportFactory({ fetchImpl })],
      cardResolver: new DefaultAgentCardResolver({ fetchImpl })
    });
    const message = {
      kind: "message",
      messageId: randomUUID(),
      role: "user",
      parts: [{ kind: "text", text: words }],
      metadata: { [A2UI_CLIENT_CAPABILITIES_KEY]: clientCapabilities(entitlement) }
    };
    const messages = [];
    let ended;
    let last;
    try {
      const client = await factory.createFromAgentCard(card);
      const stream = client.sendMessageStream(
        { message },
        {
          signal,
          serviceParameters: ServiceParameters.create(
            withA2AExtensions(A2UI_EXTENSION_URI, A2UI_EXTENSION_URI_V09)
          )
        }
      );
      for await (const event of stream) {
        const parts = partsOf(event);
        messages.push(...a2uiMessagesOf(parts));
        if (event.kind === "status-update" || event.kind === "task") {
          last = { state: event.status.state, parts: event.status.message?.parts };
        }
        if (event.kind === "message") {
          ended = { state: "completed", ...wordsOf2(parts) };
        } else if (event.kind === "status-update" && event.final) {
          ended = { state: event.status.state, ...wordsOf2(event.status.message?.parts) };
        } else if (event.kind === "task" && (TERMINAL_STATES.has(event.status.state) || event.status.state === AUTH_REQUIRED_STATE)) {
          ended = { state: event.status.state, ...wordsOf2(event.status.message?.parts) };
        }
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return { kind: "unauthorized" };
      if (signal.aborted) {
        return { kind: "error", message: `the agent did not answer within ${timeoutMs / 1e3} s` };
      }
      return { kind: "error", message: err.message };
    }
    if (!ended && last?.state === "input-required") {
      ended = { state: last.state, ...wordsOf2(last.parts) };
    }
    if (!ended) return { kind: "unfinished", messages };
    return { kind: "ended", messages, ...ended };
  };
}
function partsOf(event) {
  if (event.kind === "message") return event.parts ?? [];
  if (event.kind === "artifact-update") return event.artifact?.parts ?? [];
  return event.status?.message?.parts ?? [];
}
function wordsOf2(parts) {
  const data = (parts ?? []).find(
    (part) => part.kind === "data" && readAuthRequired(part.data) !== void 0
  );
  const text = (parts ?? []).flatMap((part) => part.kind === "text" ? [part.text.trim()] : []).filter(Boolean).join("\n");
  return {
    ...data && data.kind === "data" ? { data: data.data } : {},
    ...text === "" ? {} : { text }
  };
}

// src/preview.ts
var DEFAULT_CARD_TIMEOUT_MS = 1e4;
var DEFAULT_SMOKE_TIMEOUT_MS = 6e4;
var CREDENTIAL_NEEDED = "the card requires sign-in: set STELLIFY_CREDENTIAL to a credential of your own for this agent";
var CREDENTIAL_NOT_SENT = "the card requires no sign-in: the credential is not sent, and the marketplace captures this app’s preview itself at publish";
var NEVER_FINISHED = "the agent never finished: the stream ended without a final event";
function preview(options) {
  return previewWith(options, {});
}
async function previewWith(options, deps) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const smoke = deps.smoke ?? a2aSmokeRunner({ fetchImpl });
  const findings = [];
  const notes = [];
  let notices = [];
  const result = (document, signIn2) => ({
    document,
    ...signIn2 === void 0 ? {} : { signIn: signIn2 },
    findings,
    notices,
    notes
  });
  let card;
  try {
    card = await fetchCard(
      options.cardUrl,
      options.cardTimeoutMs ?? DEFAULT_CARD_TIMEOUT_MS,
      fetchImpl
    );
  } catch (err) {
    findings.push(`the card at ${options.cardUrl} could not be fetched: ${err.message}`);
    return result(null);
  }
  if (typeof card.version !== "string" || card.version === "") {
    findings.push("the card has no version: the card's `version` is the app's version");
  }
  let declared = [];
  const read = readSupportedCatalogIds(card);
  if (read.ok) declared = read.value;
  else findings.push(...read.errors.map((e) => `the card's ${e}`));
  const signIn = requiresSignIn(card);
  const given = options.credential !== void 0 && options.credential !== "";
  let headers;
  if (signIn) {
    if (!given) findings.push(CREDENTIAL_NEEDED);
    else {
      const chosen = credentialHeaders(card, options.credential);
      if (chosen.ok) headers = chosen.headers;
      else findings.push(chosen.finding);
    }
  } else if (given) {
    notes.push(CREDENTIAL_NOT_SENT);
  }
  const gated = [];
  for (const [index, files] of options.catalogs.entries()) {
    const gate = await gateArtifact(files, index);
    findings.push(...gate.findings);
    if (gate.artifact) gated.push(gate.artifact);
  }
  if (findings.length > 0) return result(null, signIn);
  const schemas = /* @__PURE__ */ new Map([
    [BASIC_CATALOG_ID, BASIC_CATALOG_SCHEMA]
  ]);
  for (const artifact of gated) {
    const schema = parseJson2(artifact.files.get(artifact.descriptor.schema));
    if (schema) schemas.set(artifact.descriptor.catalogId, schema);
  }
  if (options.marketplace !== void 0) {
    try {
      const entries = await fetchIndex(options.marketplace, fetchImpl);
      if (options.publisher !== void 0) notices = noticesOf(entries, options.publisher);
      for (const id of declared) {
        if (schemas.has(id)) continue;
        const held = entries.find((e) => e.publisher === options.publisher && id in e.catalogs);
        if (!held) continue;
        const artifactId = held.catalogs[id];
        const descriptor = validateArtifactDescriptor(
          parseJson2(
            await fetchArtifactFile(
              options.marketplace,
              artifactId,
              ARTIFACT_DESCRIPTOR_FILE,
              fetchImpl
            )
          )
        );
        if (!descriptor.ok) {
          notes.push(`the marketplace’s artifact ${artifactId} has no readable descriptor`);
          continue;
        }
        const schema = parseJson2(
          await fetchArtifactFile(
            options.marketplace,
            artifactId,
            descriptor.value.schema,
            fetchImpl
          )
        );
        if (schema) schemas.set(id, schema);
      }
    } catch (err) {
      notes.push(`${err.message}; a catalog the marketplace holds is not resolved`);
    }
  }
  const entitlement = entitlementOf(declared);
  const words = smokeWords(card);
  const seen = await smoke({
    card,
    entitlement,
    words,
    timeoutMs: options.smokeTimeoutMs ?? DEFAULT_SMOKE_TIMEOUT_MS,
    ...headers ? { headers } : {}
  });
  const judged = judge(seen, headers !== void 0);
  if ("findings" in judged) {
    findings.push(...judged.findings);
    return result(null, signIn);
  }
  findings.push(...checkPaint(judged.messages, { entitlement, schemaFor: (id) => schemas.get(id) }));
  if (findings.length > 0) return result(null, signIn);
  return result(
    {
      appId: options.appId,
      version: card.version,
      words,
      messages: judged.messages,
      capturedBy: "publisher",
      capturedAt: (options.now?.() ?? /* @__PURE__ */ new Date()).toISOString()
    },
    signIn
  );
}
function judge(seen, credentialSent) {
  switch (seen.kind) {
    case "unauthorized":
      return {
        findings: [
          credentialSent ? "the agent refused the credential: 401" : "the agent answered 401, but its card requires no sign-in"
        ]
      };
    case "error":
      return { findings: [`the smoke request failed: ${seen.message}`] };
    case "unfinished":
      return { findings: [NEVER_FINISHED] };
    case "ended":
      if (seen.state === "auth-required") {
        return {
          findings: [
            credentialSent ? `the agent asked to sign in although a credential was sent: ${askedFor(seen.data)}` : "the agent asked to sign in, but its card requires no sign-in"
          ]
        };
      }
      if (FAILED_STATES.has(seen.state)) {
        return {
          findings: [
            `the agent ended the task as ${seen.state}${seen.text ? `: ${seen.text}` : ""}`
          ]
        };
      }
      return { messages: seen.messages };
  }
}
function askedFor(data) {
  const request = readAuthRequired(data);
  if (!request) return "naming no scheme";
  return request.security.map(
    (alternative) => Object.entries(alternative).map(
      ([scheme, scopes]) => scopes.length > 0 ? `${scheme} (${scopes.join(", ")})` : scheme
    ).join(" and ")
  ).join(" or ");
}
function parseJson2(bytes) {
  if (!bytes) return void 0;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return void 0;
  }
}

// src/verbs.ts
var unreachable = (err) => ({ ok: false, findings: [err.message] });
async function claim({ marketplace, name }, deps = {}) {
  let answer;
  try {
    answer = await postClaim(marketplace, name, deps.fetchImpl);
  } catch (err) {
    return unreachable(err);
  }
  if (answer.status === 201) {
    const body = answer.body;
    if (typeof body?.publisher === "string" && typeof body.token === "string") {
      return { ok: true, marketplace, publisher: body.publisher, token: body.token };
    }
    return {
      ok: false,
      status: answer.status,
      findings: [
        `the marketplace answered 201 to ${MARKETPLACE_ROUTES.claim} without a name and a token`
      ]
    };
  }
  return { ok: false, status: answer.status, findings: findingsOf(answer, MARKETPLACE_ROUTES.claim) };
}
var base64Of = (files) => Object.fromEntries(
  [...files].map(([path, bytes]) => [path, Buffer.from(bytes).toString("base64")])
);
async function publish(options, deps = {}) {
  if (options.preview !== void 0) {
    const read = validatePreview(options.preview);
    if (!read.ok) {
      return {
        ok: false,
        findings: read.errors.map((e) => `the preview is not a preview document: ${e}`)
      };
    }
  }
  const body = {
    appId: options.appId,
    cardUrl: options.cardUrl,
    catalogs: options.catalogs.map((files) => ({ files: base64Of(files) })),
    ...options.preview === void 0 ? {} : { preview: options.preview }
  };
  let answer;
  try {
    answer = await postPublish(options.marketplace, options.token, body, deps.fetchImpl);
  } catch (err) {
    return unreachable(err);
  }
  const outcome = answer.body;
  if (answer.status === 200 && outcome?.ok === true && typeof outcome.appId === "string" && typeof outcome.version === "string" && typeof outcome.summary === "string") {
    const notes = Array.isArray(outcome.notes) ? outcome.notes.filter((n) => typeof n === "string") : [];
    return {
      ok: true,
      appId: outcome.appId,
      version: outcome.version,
      summary: outcome.summary,
      notes
    };
  }
  return {
    ok: false,
    status: answer.status,
    findings: findingsOf(answer, MARKETPLACE_ROUTES.publish)
  };
}
async function unpublish(options, deps = {}) {
  let answer;
  try {
    answer = await postUnpublish(options.marketplace, options.token, options.appId, deps.fetchImpl);
  } catch (err) {
    return unreachable(err);
  }
  const outcome = answer.body;
  if (answer.status === 200 && outcome?.ok === true && typeof outcome.appId === "string") {
    return { ok: true, appId: outcome.appId };
  }
  return {
    ok: false,
    status: answer.status,
    findings: findingsOf(answer, MARKETPLACE_ROUTES.unpublish)
  };
}
async function listPublished({ marketplace, publisher }, deps = {}) {
  try {
    const entries = await fetchIndex(marketplace, deps.fetchImpl);
    const apps = entries.filter((entry) => entry.publisher === publisher).map((entry) => ({
      appId: entry.appId,
      version: entry.card.version,
      cardUrl: entry.cardUrl,
      catalogs: { ...entry.catalogs },
      retired: [...entry.retired],
      publishedAt: entry.publishedAt,
      ...entry.aheadOfStore ? {
        aheadOfStore: {
          catalogIds: [...entry.aheadOfStore.catalogIds],
          ...entry.aheadOfStore.version === void 0 ? {} : { version: entry.aheadOfStore.version },
          seenAt: entry.aheadOfStore.seenAt
        }
      } : {}
    }));
    return { ok: true, apps, notices: noticesOf(entries, publisher) };
  } catch (err) {
    return unreachable(err);
  }
}

export {
  defineConfig,
  stellify,
  artifactFiles,
  writeArtifact,
  describeLacks,
  describeNotice,
  preview,
  claim,
  publish,
  unpublish,
  listPublished
};
