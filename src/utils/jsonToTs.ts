/**
 * JSON to TypeScript Interface & Type Generator
 * Recursively parses JSON data and generates clean, strictly-typed TypeScript declarations.
 */

export interface JsonToTsOptions {
  rootName?: string;
  declarationType?: "interface" | "type";
  exportDeclarations?: boolean;
  optionalProperties?: boolean;
  semicolons?: boolean;
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "") || "NestedType";
}

function isValidIdentifier(key: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

function formatKey(key: string): string {
  return isValidIdentifier(key) ? key : JSON.stringify(key);
}

export function jsonToTypeScript(
  jsonValue: any,
  options: JsonToTsOptions = {}
): string {
  const rootName = options.rootName?.trim() || "RootObject";
  const isType = options.declarationType === "type";
  const exportPrefix = options.exportDeclarations ? "export " : "";
  const semi = options.semicolons !== false ? ";" : "";

  const generatedTypes: Map<string, string> = new Map();
  const typeNameCounts: Map<string, number> = new Map();

  function getUniqueTypeName(baseName: string): string {
    const pascal = toPascalCase(baseName);
    const count = typeNameCounts.get(pascal) || 0;
    typeNameCounts.set(pascal, count + 1);
    return count === 0 ? pascal : `${pascal}${count + 1}`;
  }

  function resolveType(val: any, propertyName: string): string {
    if (val === null) return "null";
    if (typeof val === "boolean") return "boolean";
    if (typeof val === "number") return "number";
    if (typeof val === "string") return "string";

    if (Array.isArray(val)) {
      if (val.length === 0) return "any[]";

      // Inspect elements
      const elementTypes = new Set<string>();
      val.forEach((item) => {
        if (typeof item === "object" && item !== null) {
          const subTypeName = getUniqueTypeName(propertyName.replace(/s$/, "") || "Item");
          generateDeclaration(item, subTypeName);
          elementTypes.add(subTypeName);
        } else {
          elementTypes.add(resolveType(item, propertyName));
        }
      });

      const typesArr = Array.from(elementTypes);
      if (typesArr.length === 1) {
        return `${typesArr[0]}[]`;
      }
      return `(${typesArr.join(" | ")})[]`;
    }

    if (typeof val === "object") {
      const subTypeName = getUniqueTypeName(propertyName || "Nested");
      generateDeclaration(val, subTypeName);
      return subTypeName;
    }

    return "any";
  }

  function generateDeclaration(obj: Record<string, any>, typeName: string): void {
    if (generatedTypes.has(typeName)) return;

    const entries = Object.entries(obj);
    const lines: string[] = [];

    for (const [key, val] of entries) {
      let isOptional = false;
      let typeStr = resolveType(val, key);

      if (val === null) {
        isOptional = !!options.optionalProperties;
        typeStr = "any";
      }

      const optMark = isOptional ? "?" : "";
      lines.push(`  ${formatKey(key)}${optMark}: ${typeStr}${semi}`);
    }

    let code = "";
    if (isType) {
      code = `${exportPrefix}type ${typeName} = {\n${lines.join("\n")}\n}${semi}`;
    } else {
      code = `${exportPrefix}interface ${typeName} {\n${lines.join("\n")}\n}`;
    }

    generatedTypes.set(typeName, code);
  }

  // Handle root
  if (Array.isArray(jsonValue)) {
    if (jsonValue.length === 0) {
      return `${exportPrefix}type ${rootName} = any[]${semi}`;
    }
    const item = jsonValue[0];
    if (typeof item === "object" && item !== null) {
      const itemTypeName = getUniqueTypeName(rootName.replace(/s$/, "") || "Item");
      generateDeclaration(item, itemTypeName);
      const rootDecl = `${exportPrefix}type ${rootName} = ${itemTypeName}[]${semi}`;
      const declarations = Array.from(generatedTypes.values());
      return [...declarations, rootDecl].join("\n\n");
    } else {
      const itemType = resolveType(item, "item");
      return `${exportPrefix}type ${rootName} = ${itemType}[]${semi}`;
    }
  } else if (typeof jsonValue === "object" && jsonValue !== null) {
    generateDeclaration(jsonValue, rootName);
    // Return all declarations, root first or last
    const declarations = Array.from(generatedTypes.values());
    // Move rootName declaration to the top
    const rootDecl = generatedTypes.get(rootName);
    const otherDecls = declarations.filter((d) => d !== rootDecl);
    return otherDecls.length > 0 ? [...otherDecls, rootDecl].join("\n\n") : rootDecl || "";
  } else {
    const primType = typeof jsonValue;
    return `${exportPrefix}type ${rootName} = ${primType}${semi}`;
  }
}
