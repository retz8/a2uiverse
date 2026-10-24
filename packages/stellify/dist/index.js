import {createRequire as __stellifyRequire} from 'node:module';
const require = __stellifyRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e2) {
    throw mod = 0, e2;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/code.js
var require_code = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/code.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
    var _CodeOrName = class {
    };
    exports._CodeOrName = _CodeOrName;
    exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
    var Name = class extends _CodeOrName {
      constructor(s2) {
        super();
        if (!exports.IDENTIFIER.test(s2))
          throw new Error("CodeGen: name must be a valid identifier");
        this.str = s2;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        return false;
      }
      get names() {
        return { [this.str]: 1 };
      }
    };
    exports.Name = Name;
    var _Code = class extends _CodeOrName {
      constructor(code) {
        super();
        this._items = typeof code === "string" ? [code] : code;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        if (this._items.length > 1)
          return false;
        const item = this._items[0];
        return item === "" || item === '""';
      }
      get str() {
        var _a;
        return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s2, c2) => `${s2}${c2}`, "");
      }
      get names() {
        var _a;
        return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names, c2) => {
          if (c2 instanceof Name)
            names[c2.str] = (names[c2.str] || 0) + 1;
          return names;
        }, {});
      }
    };
    exports._Code = _Code;
    exports.nil = new _Code("");
    function _2(strs, ...args) {
      const code = [strs[0]];
      let i2 = 0;
      while (i2 < args.length) {
        addCodeArg(code, args[i2]);
        code.push(strs[++i2]);
      }
      return new _Code(code);
    }
    exports._ = _2;
    var plus = new _Code("+");
    function str(strs, ...args) {
      const expr = [safeStringify(strs[0])];
      let i2 = 0;
      while (i2 < args.length) {
        expr.push(plus);
        addCodeArg(expr, args[i2]);
        expr.push(plus, safeStringify(strs[++i2]));
      }
      optimize(expr);
      return new _Code(expr);
    }
    exports.str = str;
    function addCodeArg(code, arg) {
      if (arg instanceof _Code)
        code.push(...arg._items);
      else if (arg instanceof Name)
        code.push(arg);
      else
        code.push(interpolate(arg));
    }
    exports.addCodeArg = addCodeArg;
    function optimize(expr) {
      let i2 = 1;
      while (i2 < expr.length - 1) {
        if (expr[i2] === plus) {
          const res = mergeExprItems(expr[i2 - 1], expr[i2 + 1]);
          if (res !== void 0) {
            expr.splice(i2 - 1, 3, res);
            continue;
          }
          expr[i2++] = "+";
        }
        i2++;
      }
    }
    function mergeExprItems(a2, b2) {
      if (b2 === '""')
        return a2;
      if (a2 === '""')
        return b2;
      if (typeof a2 == "string") {
        if (b2 instanceof Name || a2[a2.length - 1] !== '"')
          return;
        if (typeof b2 != "string")
          return `${a2.slice(0, -1)}${b2}"`;
        if (b2[0] === '"')
          return a2.slice(0, -1) + b2.slice(1);
        return;
      }
      if (typeof b2 == "string" && b2[0] === '"' && !(a2 instanceof Name))
        return `"${a2}${b2.slice(1)}`;
      return;
    }
    function strConcat(c1, c2) {
      return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
    }
    exports.strConcat = strConcat;
    function interpolate(x2) {
      return typeof x2 == "number" || typeof x2 == "boolean" || x2 === null ? x2 : safeStringify(Array.isArray(x2) ? x2.join(",") : x2);
    }
    function stringify(x2) {
      return new _Code(safeStringify(x2));
    }
    exports.stringify = stringify;
    function safeStringify(x2) {
      return JSON.stringify(x2).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }
    exports.safeStringify = safeStringify;
    function getProperty(key) {
      return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _2`[${key}]`;
    }
    exports.getProperty = getProperty;
    function getEsmExportName(key) {
      if (typeof key == "string" && exports.IDENTIFIER.test(key)) {
        return new _Code(`${key}`);
      }
      throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
    }
    exports.getEsmExportName = getEsmExportName;
    function regexpCode(rx) {
      return new _Code(rx.toString());
    }
    exports.regexpCode = regexpCode;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/scope.js
var require_scope = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/scope.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
    var code_1 = require_code();
    var ValueError = class extends Error {
      constructor(name) {
        super(`CodeGen: "code" for ${name} not defined`);
        this.value = name.value;
      }
    };
    var UsedValueState;
    (function(UsedValueState2) {
      UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
      UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
    })(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
    exports.varKinds = {
      const: new code_1.Name("const"),
      let: new code_1.Name("let"),
      var: new code_1.Name("var")
    };
    var Scope = class {
      constructor({ prefixes, parent } = {}) {
        this._names = {};
        this._prefixes = prefixes;
        this._parent = parent;
      }
      toName(nameOrPrefix) {
        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
      }
      name(prefix) {
        return new code_1.Name(this._newName(prefix));
      }
      _newName(prefix) {
        const ng = this._names[prefix] || this._nameGroup(prefix);
        return `${prefix}${ng.index++}`;
      }
      _nameGroup(prefix) {
        var _a, _b;
        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
          throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
        }
        return this._names[prefix] = { prefix, index: 0 };
      }
    };
    exports.Scope = Scope;
    var ValueScopeName = class extends code_1.Name {
      constructor(prefix, nameStr) {
        super(nameStr);
        this.prefix = prefix;
      }
      setValue(value, { property, itemIndex }) {
        this.value = value;
        this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
      }
    };
    exports.ValueScopeName = ValueScopeName;
    var line = (0, code_1._)`\n`;
    var ValueScope = class extends Scope {
      constructor(opts) {
        super(opts);
        this._values = {};
        this._scope = opts.scope;
        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
      }
      get() {
        return this._scope;
      }
      name(prefix) {
        return new ValueScopeName(prefix, this._newName(prefix));
      }
      value(nameOrPrefix, value) {
        var _a;
        if (value.ref === void 0)
          throw new Error("CodeGen: ref must be passed in value");
        const name = this.toName(nameOrPrefix);
        const { prefix } = name;
        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
        let vs = this._values[prefix];
        if (vs) {
          const _name = vs.get(valueKey);
          if (_name)
            return _name;
        } else {
          vs = this._values[prefix] = /* @__PURE__ */ new Map();
        }
        vs.set(valueKey, name);
        const s2 = this._scope[prefix] || (this._scope[prefix] = []);
        const itemIndex = s2.length;
        s2[itemIndex] = value.ref;
        name.setValue(value, { property: prefix, itemIndex });
        return name;
      }
      getValue(prefix, keyOrRef) {
        const vs = this._values[prefix];
        if (!vs)
          return;
        return vs.get(keyOrRef);
      }
      scopeRefs(scopeName, values = this._values) {
        return this._reduceValues(values, (name) => {
          if (name.scopePath === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return (0, code_1._)`${scopeName}${name.scopePath}`;
        });
      }
      scopeCode(values = this._values, usedValues, getCode) {
        return this._reduceValues(values, (name) => {
          if (name.value === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return name.value.code;
        }, usedValues, getCode);
      }
      _reduceValues(values, valueCode, usedValues = {}, getCode) {
        let code = code_1.nil;
        for (const prefix in values) {
          const vs = values[prefix];
          if (!vs)
            continue;
          const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
          vs.forEach((name) => {
            if (nameSet.has(name))
              return;
            nameSet.set(name, UsedValueState.Started);
            let c2 = valueCode(name);
            if (c2) {
              const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
              code = (0, code_1._)`${code}${def} ${name} = ${c2};${this.opts._n}`;
            } else if (c2 = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
              code = (0, code_1._)`${code}${c2}${this.opts._n}`;
            } else {
              throw new ValueError(name);
            }
            nameSet.set(name, UsedValueState.Completed);
          });
        }
        return code;
      }
    };
    exports.ValueScope = ValueScope;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js
var require_codegen = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
    var code_1 = require_code();
    var scope_1 = require_scope();
    var code_2 = require_code();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return code_2._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return code_2.str;
    } });
    Object.defineProperty(exports, "strConcat", { enumerable: true, get: function() {
      return code_2.strConcat;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return code_2.nil;
    } });
    Object.defineProperty(exports, "getProperty", { enumerable: true, get: function() {
      return code_2.getProperty;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return code_2.stringify;
    } });
    Object.defineProperty(exports, "regexpCode", { enumerable: true, get: function() {
      return code_2.regexpCode;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return code_2.Name;
    } });
    var scope_2 = require_scope();
    Object.defineProperty(exports, "Scope", { enumerable: true, get: function() {
      return scope_2.Scope;
    } });
    Object.defineProperty(exports, "ValueScope", { enumerable: true, get: function() {
      return scope_2.ValueScope;
    } });
    Object.defineProperty(exports, "ValueScopeName", { enumerable: true, get: function() {
      return scope_2.ValueScopeName;
    } });
    Object.defineProperty(exports, "varKinds", { enumerable: true, get: function() {
      return scope_2.varKinds;
    } });
    exports.operators = {
      GT: new code_1._Code(">"),
      GTE: new code_1._Code(">="),
      LT: new code_1._Code("<"),
      LTE: new code_1._Code("<="),
      EQ: new code_1._Code("==="),
      NEQ: new code_1._Code("!=="),
      NOT: new code_1._Code("!"),
      OR: new code_1._Code("||"),
      AND: new code_1._Code("&&"),
      ADD: new code_1._Code("+")
    };
    var Node = class {
      optimizeNodes() {
        return this;
      }
      optimizeNames(_names, _constants) {
        return this;
      }
    };
    var Def = class extends Node {
      constructor(varKind, name, rhs) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.rhs = rhs;
      }
      render({ es5, _n }) {
        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
        const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
        return `${varKind} ${this.name}${rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (!names[this.name.str])
          return;
        if (this.rhs)
          this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
      }
    };
    var Assign = class extends Node {
      constructor(lhs, rhs, sideEffects) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
        this.sideEffects = sideEffects;
      }
      render({ _n }) {
        return `${this.lhs} = ${this.rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
          return;
        this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
        return addExprNames(names, this.rhs);
      }
    };
    var AssignOp = class extends Assign {
      constructor(lhs, op, rhs, sideEffects) {
        super(lhs, rhs, sideEffects);
        this.op = op;
      }
      render({ _n }) {
        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
      }
    };
    var Label = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        return `${this.label}:` + _n;
      }
    };
    var Break = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        const label = this.label ? ` ${this.label}` : "";
        return `break${label};` + _n;
      }
    };
    var Throw = class extends Node {
      constructor(error) {
        super();
        this.error = error;
      }
      render({ _n }) {
        return `throw ${this.error};` + _n;
      }
      get names() {
        return this.error.names;
      }
    };
    var AnyCode = class extends Node {
      constructor(code) {
        super();
        this.code = code;
      }
      render({ _n }) {
        return `${this.code};` + _n;
      }
      optimizeNodes() {
        return `${this.code}` ? this : void 0;
      }
      optimizeNames(names, constants) {
        this.code = optimizeExpr(this.code, names, constants);
        return this;
      }
      get names() {
        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
      }
    };
    var ParentNode = class extends Node {
      constructor(nodes = []) {
        super();
        this.nodes = nodes;
      }
      render(opts) {
        return this.nodes.reduce((code, n2) => code + n2.render(opts), "");
      }
      optimizeNodes() {
        const { nodes } = this;
        let i2 = nodes.length;
        while (i2--) {
          const n2 = nodes[i2].optimizeNodes();
          if (Array.isArray(n2))
            nodes.splice(i2, 1, ...n2);
          else if (n2)
            nodes[i2] = n2;
          else
            nodes.splice(i2, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      optimizeNames(names, constants) {
        const { nodes } = this;
        let i2 = nodes.length;
        while (i2--) {
          const n2 = nodes[i2];
          if (n2.optimizeNames(names, constants))
            continue;
          subtractNames(names, n2.names);
          nodes.splice(i2, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      get names() {
        return this.nodes.reduce((names, n2) => addNames(names, n2.names), {});
      }
    };
    var BlockNode = class extends ParentNode {
      render(opts) {
        return "{" + opts._n + super.render(opts) + "}" + opts._n;
      }
    };
    var Root = class extends ParentNode {
    };
    var Else = class extends BlockNode {
    };
    Else.kind = "else";
    var If = class _If extends BlockNode {
      constructor(condition, nodes) {
        super(nodes);
        this.condition = condition;
      }
      render(opts) {
        let code = `if(${this.condition})` + super.render(opts);
        if (this.else)
          code += "else " + this.else.render(opts);
        return code;
      }
      optimizeNodes() {
        super.optimizeNodes();
        const cond = this.condition;
        if (cond === true)
          return this.nodes;
        let e2 = this.else;
        if (e2) {
          const ns = e2.optimizeNodes();
          e2 = this.else = Array.isArray(ns) ? new Else(ns) : ns;
        }
        if (e2) {
          if (cond === false)
            return e2 instanceof _If ? e2 : e2.nodes;
          if (this.nodes.length)
            return this;
          return new _If(not(cond), e2 instanceof _If ? [e2] : e2.nodes);
        }
        if (cond === false || !this.nodes.length)
          return void 0;
        return this;
      }
      optimizeNames(names, constants) {
        var _a;
        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        if (!(super.optimizeNames(names, constants) || this.else))
          return;
        this.condition = optimizeExpr(this.condition, names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        addExprNames(names, this.condition);
        if (this.else)
          addNames(names, this.else.names);
        return names;
      }
    };
    If.kind = "if";
    var For = class extends BlockNode {
    };
    For.kind = "for";
    var ForLoop = class extends For {
      constructor(iteration) {
        super();
        this.iteration = iteration;
      }
      render(opts) {
        return `for(${this.iteration})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iteration = optimizeExpr(this.iteration, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iteration.names);
      }
    };
    var ForRange = class extends For {
      constructor(varKind, name, from, to) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.from = from;
        this.to = to;
      }
      render(opts) {
        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
        const { name, from, to } = this;
        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
      }
      get names() {
        const names = addExprNames(super.names, this.from);
        return addExprNames(names, this.to);
      }
    };
    var ForIter = class extends For {
      constructor(loop, varKind, name, iterable) {
        super();
        this.loop = loop;
        this.varKind = varKind;
        this.name = name;
        this.iterable = iterable;
      }
      render(opts) {
        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iterable = optimizeExpr(this.iterable, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iterable.names);
      }
    };
    var Func = class extends BlockNode {
      constructor(name, args, async) {
        super();
        this.name = name;
        this.args = args;
        this.async = async;
      }
      render(opts) {
        const _async = this.async ? "async " : "";
        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
      }
    };
    Func.kind = "func";
    var Return = class extends ParentNode {
      render(opts) {
        return "return " + super.render(opts);
      }
    };
    Return.kind = "return";
    var Try = class extends BlockNode {
      render(opts) {
        let code = "try" + super.render(opts);
        if (this.catch)
          code += this.catch.render(opts);
        if (this.finally)
          code += this.finally.render(opts);
        return code;
      }
      optimizeNodes() {
        var _a, _b;
        super.optimizeNodes();
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
        return this;
      }
      optimizeNames(names, constants) {
        var _a, _b;
        super.optimizeNames(names, constants);
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        if (this.catch)
          addNames(names, this.catch.names);
        if (this.finally)
          addNames(names, this.finally.names);
        return names;
      }
    };
    var Catch = class extends BlockNode {
      constructor(error) {
        super();
        this.error = error;
      }
      render(opts) {
        return `catch(${this.error})` + super.render(opts);
      }
    };
    Catch.kind = "catch";
    var Finally = class extends BlockNode {
      render(opts) {
        return "finally" + super.render(opts);
      }
    };
    Finally.kind = "finally";
    var CodeGen = class {
      constructor(extScope, opts = {}) {
        this._values = {};
        this._blockStarts = [];
        this._constants = {};
        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
        this._extScope = extScope;
        this._scope = new scope_1.Scope({ parent: extScope });
        this._nodes = [new Root()];
      }
      toString() {
        return this._root.render(this.opts);
      }
      // returns unique name in the internal scope
      name(prefix) {
        return this._scope.name(prefix);
      }
      // reserves unique name in the external scope
      scopeName(prefix) {
        return this._extScope.name(prefix);
      }
      // reserves unique name in the external scope and assigns value to it
      scopeValue(prefixOrName, value) {
        const name = this._extScope.value(prefixOrName, value);
        const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
        vs.add(name);
        return name;
      }
      getScopeValue(prefix, keyOrRef) {
        return this._extScope.getValue(prefix, keyOrRef);
      }
      // return code that assigns values in the external scope to the names that are used internally
      // (same names that were returned by gen.scopeName or gen.scopeValue)
      scopeRefs(scopeName) {
        return this._extScope.scopeRefs(scopeName, this._values);
      }
      scopeCode() {
        return this._extScope.scopeCode(this._values);
      }
      _def(varKind, nameOrPrefix, rhs, constant) {
        const name = this._scope.toName(nameOrPrefix);
        if (rhs !== void 0 && constant)
          this._constants[name.str] = rhs;
        this._leafNode(new Def(varKind, name, rhs));
        return name;
      }
      // `const` declaration (`var` in es5 mode)
      const(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
      }
      // `let` declaration with optional assignment (`var` in es5 mode)
      let(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
      }
      // `var` declaration with optional assignment
      var(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
      }
      // assignment code
      assign(lhs, rhs, sideEffects) {
        return this._leafNode(new Assign(lhs, rhs, sideEffects));
      }
      // `+=` code
      add(lhs, rhs) {
        return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
      }
      // appends passed SafeExpr to code or executes Block
      code(c2) {
        if (typeof c2 == "function")
          c2();
        else if (c2 !== code_1.nil)
          this._leafNode(new AnyCode(c2));
        return this;
      }
      // returns code for object literal for the passed argument list of key-value pairs
      object(...keyValues) {
        const code = ["{"];
        for (const [key, value] of keyValues) {
          if (code.length > 1)
            code.push(",");
          code.push(key);
          if (key !== value || this.opts.es5) {
            code.push(":");
            (0, code_1.addCodeArg)(code, value);
          }
        }
        code.push("}");
        return new code_1._Code(code);
      }
      // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
      if(condition, thenBody, elseBody) {
        this._blockNode(new If(condition));
        if (thenBody && elseBody) {
          this.code(thenBody).else().code(elseBody).endIf();
        } else if (thenBody) {
          this.code(thenBody).endIf();
        } else if (elseBody) {
          throw new Error('CodeGen: "else" body without "then" body');
        }
        return this;
      }
      // `else if` clause - invalid without `if` or after `else` clauses
      elseIf(condition) {
        return this._elseNode(new If(condition));
      }
      // `else` clause - only valid after `if` or `else if` clauses
      else() {
        return this._elseNode(new Else());
      }
      // end `if` statement (needed if gen.if was used only with condition)
      endIf() {
        return this._endBlockNode(If, Else);
      }
      _for(node, forBody) {
        this._blockNode(node);
        if (forBody)
          this.code(forBody).endFor();
        return this;
      }
      // a generic `for` clause (or statement if `forBody` is passed)
      for(iteration, forBody) {
        return this._for(new ForLoop(iteration), forBody);
      }
      // `for` statement for a range of values
      forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
      }
      // `for-of` statement (in es5 mode replace with a normal for loop)
      forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
        const name = this._scope.toName(nameOrPrefix);
        if (this.opts.es5) {
          const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
          return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i2) => {
            this.var(name, (0, code_1._)`${arr}[${i2}]`);
            forBody(name);
          });
        }
        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
      }
      // `for-in` statement.
      // With option `ownProperties` replaced with a `for-of` loop for object keys
      forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
        if (this.opts.ownProperties) {
          return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
        }
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
      }
      // end `for` loop
      endFor() {
        return this._endBlockNode(For);
      }
      // `label` statement
      label(label) {
        return this._leafNode(new Label(label));
      }
      // `break` statement
      break(label) {
        return this._leafNode(new Break(label));
      }
      // `return` statement
      return(value) {
        const node = new Return();
        this._blockNode(node);
        this.code(value);
        if (node.nodes.length !== 1)
          throw new Error('CodeGen: "return" should have one node');
        return this._endBlockNode(Return);
      }
      // `try` statement
      try(tryBody, catchCode, finallyCode) {
        if (!catchCode && !finallyCode)
          throw new Error('CodeGen: "try" without "catch" and "finally"');
        const node = new Try();
        this._blockNode(node);
        this.code(tryBody);
        if (catchCode) {
          const error = this.name("e");
          this._currNode = node.catch = new Catch(error);
          catchCode(error);
        }
        if (finallyCode) {
          this._currNode = node.finally = new Finally();
          this.code(finallyCode);
        }
        return this._endBlockNode(Catch, Finally);
      }
      // `throw` statement
      throw(error) {
        return this._leafNode(new Throw(error));
      }
      // start self-balancing block
      block(body, nodeCount) {
        this._blockStarts.push(this._nodes.length);
        if (body)
          this.code(body).endBlock(nodeCount);
        return this;
      }
      // end the current self-balancing block
      endBlock(nodeCount) {
        const len = this._blockStarts.pop();
        if (len === void 0)
          throw new Error("CodeGen: not in self-balancing block");
        const toClose = this._nodes.length - len;
        if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
          throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
        }
        this._nodes.length = len;
        return this;
      }
      // `function` heading (or definition if funcBody is passed)
      func(name, args = code_1.nil, async, funcBody) {
        this._blockNode(new Func(name, args, async));
        if (funcBody)
          this.code(funcBody).endFunc();
        return this;
      }
      // end function definition
      endFunc() {
        return this._endBlockNode(Func);
      }
      optimize(n2 = 1) {
        while (n2-- > 0) {
          this._root.optimizeNodes();
          this._root.optimizeNames(this._root.names, this._constants);
        }
      }
      _leafNode(node) {
        this._currNode.nodes.push(node);
        return this;
      }
      _blockNode(node) {
        this._currNode.nodes.push(node);
        this._nodes.push(node);
      }
      _endBlockNode(N1, N2) {
        const n2 = this._currNode;
        if (n2 instanceof N1 || N2 && n2 instanceof N2) {
          this._nodes.pop();
          return this;
        }
        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
      }
      _elseNode(node) {
        const n2 = this._currNode;
        if (!(n2 instanceof If)) {
          throw new Error('CodeGen: "else" without "if"');
        }
        this._currNode = n2.else = node;
        return this;
      }
      get _root() {
        return this._nodes[0];
      }
      get _currNode() {
        const ns = this._nodes;
        return ns[ns.length - 1];
      }
      set _currNode(node) {
        const ns = this._nodes;
        ns[ns.length - 1] = node;
      }
    };
    exports.CodeGen = CodeGen;
    function addNames(names, from) {
      for (const n2 in from)
        names[n2] = (names[n2] || 0) + (from[n2] || 0);
      return names;
    }
    function addExprNames(names, from) {
      return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
    }
    function optimizeExpr(expr, names, constants) {
      if (expr instanceof code_1.Name)
        return replaceName(expr);
      if (!canOptimize(expr))
        return expr;
      return new code_1._Code(expr._items.reduce((items, c2) => {
        if (c2 instanceof code_1.Name)
          c2 = replaceName(c2);
        if (c2 instanceof code_1._Code)
          items.push(...c2._items);
        else
          items.push(c2);
        return items;
      }, []));
      function replaceName(n2) {
        const c2 = constants[n2.str];
        if (c2 === void 0 || names[n2.str] !== 1)
          return n2;
        delete names[n2.str];
        return c2;
      }
      function canOptimize(e2) {
        return e2 instanceof code_1._Code && e2._items.some((c2) => c2 instanceof code_1.Name && names[c2.str] === 1 && constants[c2.str] !== void 0);
      }
    }
    function subtractNames(names, from) {
      for (const n2 in from)
        names[n2] = (names[n2] || 0) - (from[n2] || 0);
    }
    function not(x2) {
      return typeof x2 == "boolean" || typeof x2 == "number" || x2 === null ? !x2 : (0, code_1._)`!${par(x2)}`;
    }
    exports.not = not;
    var andCode = mappend(exports.operators.AND);
    function and(...args) {
      return args.reduce(andCode);
    }
    exports.and = and;
    var orCode = mappend(exports.operators.OR);
    function or(...args) {
      return args.reduce(orCode);
    }
    exports.or = or;
    function mappend(op) {
      return (x2, y2) => x2 === code_1.nil ? y2 : y2 === code_1.nil ? x2 : (0, code_1._)`${par(x2)} ${op} ${par(y2)}`;
    }
    function par(x2) {
      return x2 instanceof code_1.Name ? x2 : (0, code_1._)`(${x2})`;
    }
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js
var require_util = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.checkStrictMode = exports.getErrorPath = exports.Type = exports.useFunc = exports.setEvaluated = exports.evaluatedPropsToName = exports.mergeEvaluated = exports.eachItem = exports.unescapeJsonPointer = exports.escapeJsonPointer = exports.escapeFragment = exports.unescapeFragment = exports.schemaRefOrVal = exports.schemaHasRulesButRef = exports.schemaHasRules = exports.checkUnknownRules = exports.alwaysValidSchema = exports.toHash = void 0;
    var codegen_1 = require_codegen();
    var code_1 = require_code();
    function toHash(arr) {
      const hash = {};
      for (const item of arr)
        hash[item] = true;
      return hash;
    }
    exports.toHash = toHash;
    function alwaysValidSchema(it, schema) {
      if (typeof schema == "boolean")
        return schema;
      if (Object.keys(schema).length === 0)
        return true;
      checkUnknownRules(it, schema);
      return !schemaHasRules(schema, it.self.RULES.all);
    }
    exports.alwaysValidSchema = alwaysValidSchema;
    function checkUnknownRules(it, schema = it.schema) {
      const { opts, self } = it;
      if (!opts.strictSchema)
        return;
      if (typeof schema === "boolean")
        return;
      const rules = self.RULES.keywords;
      for (const key in schema) {
        if (!rules[key])
          checkStrictMode(it, `unknown keyword: "${key}"`);
      }
    }
    exports.checkUnknownRules = checkUnknownRules;
    function schemaHasRules(schema, rules) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (rules[key])
          return true;
      return false;
    }
    exports.schemaHasRules = schemaHasRules;
    function schemaHasRulesButRef(schema, RULES) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (key !== "$ref" && RULES.all[key])
          return true;
      return false;
    }
    exports.schemaHasRulesButRef = schemaHasRulesButRef;
    function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
      if (!$data) {
        if (typeof schema == "number" || typeof schema == "boolean")
          return schema;
        if (typeof schema == "string")
          return (0, codegen_1._)`${schema}`;
      }
      return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
    }
    exports.schemaRefOrVal = schemaRefOrVal;
    function unescapeFragment(str) {
      return unescapeJsonPointer(decodeURIComponent(str));
    }
    exports.unescapeFragment = unescapeFragment;
    function escapeFragment(str) {
      return encodeURIComponent(escapeJsonPointer(str));
    }
    exports.escapeFragment = escapeFragment;
    function escapeJsonPointer(str) {
      if (typeof str == "number")
        return `${str}`;
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    exports.escapeJsonPointer = escapeJsonPointer;
    function unescapeJsonPointer(str) {
      return str.replace(/~1/g, "/").replace(/~0/g, "~");
    }
    exports.unescapeJsonPointer = unescapeJsonPointer;
    function eachItem(xs, f2) {
      if (Array.isArray(xs)) {
        for (const x2 of xs)
          f2(x2);
      } else {
        f2(xs);
      }
    }
    exports.eachItem = eachItem;
    function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues: mergeValues2, resultToName }) {
      return (gen, from, to, toName) => {
        const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues2(from, to);
        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
      };
    }
    exports.mergeEvaluated = {
      props: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
          gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
        }),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
          if (from === true) {
            gen.assign(to, true);
          } else {
            gen.assign(to, (0, codegen_1._)`${to} || {}`);
            setEvaluated(gen, to, from);
          }
        }),
        mergeValues: (from, to) => from === true ? true : { ...from, ...to },
        resultToName: evaluatedPropsToName
      }),
      items: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
        mergeValues: (from, to) => from === true ? true : Math.max(from, to),
        resultToName: (gen, items) => gen.var("items", items)
      })
    };
    function evaluatedPropsToName(gen, ps) {
      if (ps === true)
        return gen.var("props", true);
      const props = gen.var("props", (0, codegen_1._)`{}`);
      if (ps !== void 0)
        setEvaluated(gen, props, ps);
      return props;
    }
    exports.evaluatedPropsToName = evaluatedPropsToName;
    function setEvaluated(gen, props, ps) {
      Object.keys(ps).forEach((p2) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p2)}`, true));
    }
    exports.setEvaluated = setEvaluated;
    var snippets = {};
    function useFunc(gen, f2) {
      return gen.scopeValue("func", {
        ref: f2,
        code: snippets[f2.code] || (snippets[f2.code] = new code_1._Code(f2.code))
      });
    }
    exports.useFunc = useFunc;
    var Type;
    (function(Type2) {
      Type2[Type2["Num"] = 0] = "Num";
      Type2[Type2["Str"] = 1] = "Str";
    })(Type || (exports.Type = Type = {}));
    function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
      if (dataProp instanceof codegen_1.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
    }
    exports.getErrorPath = getErrorPath;
    function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
      if (!mode)
        return;
      msg = `strict mode: ${msg}`;
      if (mode === true)
        throw new Error(msg);
      it.self.logger.warn(msg);
    }
    exports.checkStrictMode = checkStrictMode;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/names.js
var require_names = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/names.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var names = {
      // validation function arguments
      data: new codegen_1.Name("data"),
      // data passed to validation function
      // args passed from referencing schema
      valCxt: new codegen_1.Name("valCxt"),
      // validation/data context - should not be used directly, it is destructured to the names below
      instancePath: new codegen_1.Name("instancePath"),
      parentData: new codegen_1.Name("parentData"),
      parentDataProperty: new codegen_1.Name("parentDataProperty"),
      rootData: new codegen_1.Name("rootData"),
      // root data - same as the data passed to the first/top validation function
      dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
      // used to support recursiveRef and dynamicRef
      // function scoped variables
      vErrors: new codegen_1.Name("vErrors"),
      // null or array of validation errors
      errors: new codegen_1.Name("errors"),
      // counter of validation errors
      this: new codegen_1.Name("this"),
      // "globals"
      self: new codegen_1.Name("self"),
      scope: new codegen_1.Name("scope"),
      // JTD serialize/parse name for JSON string and position
      json: new codegen_1.Name("json"),
      jsonPos: new codegen_1.Name("jsonPos"),
      jsonLen: new codegen_1.Name("jsonLen"),
      jsonPart: new codegen_1.Name("jsonPart")
    };
    exports.default = names;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js
var require_errors = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    exports.keywordError = {
      message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation`
    };
    exports.keyword$DataError = {
      message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)`
    };
    function reportError(cxt, error = exports.keywordError, errorPaths, overrideAllErrors) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
        addError(gen, errObj);
      } else {
        returnErrors(it, (0, codegen_1._)`[${errObj}]`);
      }
    }
    exports.reportError = reportError;
    function reportExtraError(cxt, error = exports.keywordError, errorPaths) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      addError(gen, errObj);
      if (!(compositeRule || allErrors)) {
        returnErrors(it, names_1.default.vErrors);
      }
    }
    exports.reportExtraError = reportExtraError;
    function resetErrorsCount(gen, errsCount) {
      gen.assign(names_1.default.errors, errsCount);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
    }
    exports.resetErrorsCount = resetErrorsCount;
    function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
      if (errsCount === void 0)
        throw new Error("ajv implementation error");
      const err = gen.name("err");
      gen.forRange("i", errsCount, names_1.default.errors, (i2) => {
        gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i2}]`);
        gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
        gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
        if (it.opts.verbose) {
          gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
          gen.assign((0, codegen_1._)`${err}.data`, data);
        }
      });
    }
    exports.extendErrors = extendErrors;
    function addError(gen, errObj) {
      const err = gen.const("err", errObj);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
      gen.code((0, codegen_1._)`${names_1.default.errors}++`);
    }
    function returnErrors(it, errs) {
      const { gen, validateName, schemaEnv } = it;
      if (schemaEnv.$async) {
        gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
        gen.return(false);
      }
    }
    var E2 = {
      keyword: new codegen_1.Name("keyword"),
      schemaPath: new codegen_1.Name("schemaPath"),
      // also used in JTD errors
      params: new codegen_1.Name("params"),
      propertyName: new codegen_1.Name("propertyName"),
      message: new codegen_1.Name("message"),
      schema: new codegen_1.Name("schema"),
      parentSchema: new codegen_1.Name("parentSchema")
    };
    function errorObjectCode(cxt, error, errorPaths) {
      const { createErrors } = cxt.it;
      if (createErrors === false)
        return (0, codegen_1._)`{}`;
      return errorObject(cxt, error, errorPaths);
    }
    function errorObject(cxt, error, errorPaths = {}) {
      const { gen, it } = cxt;
      const keyValues = [
        errorInstancePath(it, errorPaths),
        errorSchemaPath(cxt, errorPaths)
      ];
      extraErrorProps(cxt, error, keyValues);
      return gen.object(...keyValues);
    }
    function errorInstancePath({ errorPath }, { instancePath }) {
      const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
      return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
    }
    function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
      let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
      if (schemaPath) {
        schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
      }
      return [E2.schemaPath, schPath];
    }
    function extraErrorProps(cxt, { params, message }, keyValues) {
      const { keyword, data, schemaValue, it } = cxt;
      const { opts, propertyName, topSchemaRef, schemaPath } = it;
      keyValues.push([E2.keyword, keyword], [E2.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
      if (opts.messages) {
        keyValues.push([E2.message, typeof message == "function" ? message(cxt) : message]);
      }
      if (opts.verbose) {
        keyValues.push([E2.schema, schemaValue], [E2.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
      }
      if (propertyName)
        keyValues.push([E2.propertyName, propertyName]);
    }
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js
var require_boolSchema = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.boolOrEmptySchema = exports.topBoolOrEmptySchema = void 0;
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var boolError = {
      message: "boolean schema is false"
    };
    function topBoolOrEmptySchema(it) {
      const { gen, schema, validateName } = it;
      if (schema === false) {
        falseSchemaError(it, false);
      } else if (typeof schema == "object" && schema.$async === true) {
        gen.return(names_1.default.data);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, null);
        gen.return(true);
      }
    }
    exports.topBoolOrEmptySchema = topBoolOrEmptySchema;
    function boolOrEmptySchema(it, valid) {
      const { gen, schema } = it;
      if (schema === false) {
        gen.var(valid, false);
        falseSchemaError(it);
      } else {
        gen.var(valid, true);
      }
    }
    exports.boolOrEmptySchema = boolOrEmptySchema;
    function falseSchemaError(it, overrideAllErrors) {
      const { gen, data } = it;
      const cxt = {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it
      };
      (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
    }
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/rules.js
var require_rules = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/rules.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRules = exports.isJSONType = void 0;
    var _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
    var jsonTypes = new Set(_jsonTypes);
    function isJSONType(x2) {
      return typeof x2 == "string" && jsonTypes.has(x2);
    }
    exports.isJSONType = isJSONType;
    function getRules() {
      const groups = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] }
      };
      return {
        types: { ...groups, integer: true, boolean: true, null: true },
        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
        post: { rules: [] },
        all: {},
        keywords: {}
      };
    }
    exports.getRules = getRules;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/applicability.js
var require_applicability = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/applicability.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.shouldUseRule = exports.shouldUseGroup = exports.schemaHasRulesForType = void 0;
    function schemaHasRulesForType({ schema, self }, type) {
      const group = self.RULES.types[type];
      return group && group !== true && shouldUseGroup(schema, group);
    }
    exports.schemaHasRulesForType = schemaHasRulesForType;
    function shouldUseGroup(schema, group) {
      return group.rules.some((rule) => shouldUseRule(schema, rule));
    }
    exports.shouldUseGroup = shouldUseGroup;
    function shouldUseRule(schema, rule) {
      var _a;
      return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
    }
    exports.shouldUseRule = shouldUseRule;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/dataType.js
var require_dataType = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/dataType.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reportTypeError = exports.checkDataTypes = exports.checkDataType = exports.coerceAndCheckDataType = exports.getJSONTypes = exports.getSchemaTypes = exports.DataType = void 0;
    var rules_1 = require_rules();
    var applicability_1 = require_applicability();
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var DataType;
    (function(DataType2) {
      DataType2[DataType2["Correct"] = 0] = "Correct";
      DataType2[DataType2["Wrong"] = 1] = "Wrong";
    })(DataType || (exports.DataType = DataType = {}));
    function getSchemaTypes(schema) {
      const types = getJSONTypes(schema.type);
      const hasNull = types.includes("null");
      if (hasNull) {
        if (schema.nullable === false)
          throw new Error("type: null contradicts nullable: false");
      } else {
        if (!types.length && schema.nullable !== void 0) {
          throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
          types.push("null");
      }
      return types;
    }
    exports.getSchemaTypes = getSchemaTypes;
    function getJSONTypes(ts) {
      const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
      if (types.every(rules_1.isJSONType))
        return types;
      throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
    }
    exports.getJSONTypes = getJSONTypes;
    function coerceAndCheckDataType(it, types) {
      const { gen, data, opts } = it;
      const coerceTo = coerceToTypes(types, opts.coerceTypes);
      const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
      if (checkTypes) {
        const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
        gen.if(wrongType, () => {
          if (coerceTo.length)
            coerceData(it, types, coerceTo);
          else
            reportTypeError(it);
        });
      }
      return checkTypes;
    }
    exports.coerceAndCheckDataType = coerceAndCheckDataType;
    var COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
    function coerceToTypes(types, coerceTypes) {
      return coerceTypes ? types.filter((t2) => COERCIBLE.has(t2) || coerceTypes === "array" && t2 === "array") : [];
    }
    function coerceData(it, types, coerceTo) {
      const { gen, data, opts } = it;
      const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
      const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
      if (opts.coerceTypes === "array") {
        gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
      }
      gen.if((0, codegen_1._)`${coerced} !== undefined`);
      for (const t2 of coerceTo) {
        if (COERCIBLE.has(t2) || t2 === "array" && opts.coerceTypes === "array") {
          coerceSpecificType(t2);
        }
      }
      gen.else();
      reportTypeError(it);
      gen.endIf();
      gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
      });
      function coerceSpecificType(t2) {
        switch (t2) {
          case "string":
            gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
            return;
          case "number":
            gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "integer":
            gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "boolean":
            gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
            return;
          case "null":
            gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
            gen.assign(coerced, null);
            return;
          case "array":
            gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
        }
      }
    }
    function assignParentData({ gen, parentData, parentDataProperty }, expr) {
      gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
    }
    function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
      const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
      let cond;
      switch (dataType) {
        case "null":
          return (0, codegen_1._)`${data} ${EQ} null`;
        case "array":
          cond = (0, codegen_1._)`Array.isArray(${data})`;
          break;
        case "object":
          cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
          break;
        case "integer":
          cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
          break;
        case "number":
          cond = numCond();
          break;
        default:
          return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
      }
      return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
      function numCond(_cond = codegen_1.nil) {
        return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
      }
    }
    exports.checkDataType = checkDataType;
    function checkDataTypes(dataTypes, data, strictNums, correct) {
      if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
      }
      let cond;
      const types = (0, util_1.toHash)(dataTypes);
      if (types.array && types.object) {
        const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
        cond = types.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
        delete types.null;
        delete types.array;
        delete types.object;
      } else {
        cond = codegen_1.nil;
      }
      if (types.number)
        delete types.integer;
      for (const t2 in types)
        cond = (0, codegen_1.and)(cond, checkDataType(t2, data, strictNums, correct));
      return cond;
    }
    exports.checkDataTypes = checkDataTypes;
    var typeError = {
      message: ({ schema }) => `must be ${schema}`,
      params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
    };
    function reportTypeError(it) {
      const cxt = getTypeErrorContext(it);
      (0, errors_1.reportError)(cxt, typeError);
    }
    exports.reportTypeError = reportTypeError;
    function getTypeErrorContext(it) {
      const { gen, data, schema } = it;
      const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
      return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it
      };
    }
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/defaults.js
var require_defaults = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/defaults.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.assignDefaults = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function assignDefaults(it, ty) {
      const { properties, items } = it.schema;
      if (ty === "object" && properties) {
        for (const key in properties) {
          assignDefault(it, key, properties[key].default);
        }
      } else if (ty === "array" && Array.isArray(items)) {
        items.forEach((sch, i2) => assignDefault(it, i2, sch.default));
      }
    }
    exports.assignDefaults = assignDefaults;
    function assignDefault(it, prop, defaultValue) {
      const { gen, compositeRule, data, opts } = it;
      if (defaultValue === void 0)
        return;
      const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
      if (compositeRule) {
        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
        return;
      }
      let condition = (0, codegen_1._)`${childData} === undefined`;
      if (opts.useDefaults === "empty") {
        condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
      }
      gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
    }
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/code.js
var require_code2 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/code.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateUnion = exports.validateArray = exports.usePattern = exports.callValidateCode = exports.schemaProperties = exports.allSchemaProperties = exports.noPropertyInData = exports.propertyInData = exports.isOwnProperty = exports.hasPropFunc = exports.reportMissingProp = exports.checkMissingProp = exports.checkReportMissingProp = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var util_2 = require_util();
    function checkReportMissingProp(cxt, prop) {
      const { gen, data, it } = cxt;
      gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
        cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
        cxt.error();
      });
    }
    exports.checkReportMissingProp = checkReportMissingProp;
    function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
      return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
    }
    exports.checkMissingProp = checkMissingProp;
    function reportMissingProp(cxt, missing) {
      cxt.setParams({ missingProperty: missing }, true);
      cxt.error();
    }
    exports.reportMissingProp = reportMissingProp;
    function hasPropFunc(gen) {
      return gen.scopeValue("func", {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: Object.prototype.hasOwnProperty,
        code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
      });
    }
    exports.hasPropFunc = hasPropFunc;
    function isOwnProperty(gen, data, property) {
      return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
    }
    exports.isOwnProperty = isOwnProperty;
    function propertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
      return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
    }
    exports.propertyInData = propertyInData;
    function noPropertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
      return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
    }
    exports.noPropertyInData = noPropertyInData;
    function allSchemaProperties(schemaMap) {
      return schemaMap ? Object.keys(schemaMap).filter((p2) => p2 !== "__proto__") : [];
    }
    exports.allSchemaProperties = allSchemaProperties;
    function schemaProperties(it, schemaMap) {
      return allSchemaProperties(schemaMap).filter((p2) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p2]));
    }
    exports.schemaProperties = schemaProperties;
    function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
      const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
      const valCxt = [
        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
        [names_1.default.parentData, it.parentData],
        [names_1.default.parentDataProperty, it.parentDataProperty],
        [names_1.default.rootData, names_1.default.rootData]
      ];
      if (it.opts.dynamicRef)
        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
      const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
      return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
    }
    exports.callValidateCode = callValidateCode;
    var newRegExp = (0, codegen_1._)`new RegExp`;
    function usePattern({ gen, it: { opts } }, pattern) {
      const u2 = opts.unicodeRegExp ? "u" : "";
      const { regExp } = opts.code;
      const rx = regExp(pattern, u2);
      return gen.scopeValue("pattern", {
        key: rx.toString(),
        ref: rx,
        code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u2})`
      });
    }
    exports.usePattern = usePattern;
    function validateArray(cxt) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      if (it.allErrors) {
        const validArr = gen.let("valid", true);
        validateItems(() => gen.assign(validArr, false));
        return validArr;
      }
      gen.var(valid, true);
      validateItems(() => gen.break());
      return valid;
      function validateItems(notValid) {
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        gen.forRange("i", 0, len, (i2) => {
          cxt.subschema({
            keyword,
            dataProp: i2,
            dataPropType: util_1.Type.Num
          }, valid);
          gen.if((0, codegen_1.not)(valid), notValid);
        });
      }
    }
    exports.validateArray = validateArray;
    function validateUnion(cxt) {
      const { gen, schema, keyword, it } = cxt;
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
      if (alwaysValid && !it.opts.unevaluated)
        return;
      const valid = gen.let("valid", false);
      const schValid = gen.name("_valid");
      gen.block(() => schema.forEach((_sch, i2) => {
        const schCxt = cxt.subschema({
          keyword,
          schemaProp: i2,
          compositeRule: true
        }, schValid);
        gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
        if (!merged)
          gen.if((0, codegen_1.not)(valid));
      }));
      cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
    }
    exports.validateUnion = validateUnion;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/keyword.js
var require_keyword = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/keyword.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateKeywordUsage = exports.validSchemaType = exports.funcKeywordCode = exports.macroKeywordCode = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var code_1 = require_code2();
    var errors_1 = require_errors();
    function macroKeywordCode(cxt, def) {
      const { gen, keyword, schema, parentSchema, it } = cxt;
      const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
      const schemaRef = useKeyword(gen, keyword, macroSchema);
      if (it.opts.validateSchema !== false)
        it.self.validateSchema(macroSchema, true);
      const valid = gen.name("valid");
      cxt.subschema({
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true
      }, valid);
      cxt.pass(valid, () => cxt.error(true));
    }
    exports.macroKeywordCode = macroKeywordCode;
    function funcKeywordCode(cxt, def) {
      var _a;
      const { gen, keyword, schema, parentSchema, $data, it } = cxt;
      checkAsyncKeyword(it, def);
      const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
      const validateRef = useKeyword(gen, keyword, validate);
      const valid = gen.let("valid");
      cxt.block$data(valid, validateKeyword);
      cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
      function validateKeyword() {
        if (def.errors === false) {
          assignValid();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => cxt.error());
        } else {
          const ruleErrs = def.async ? validateAsync() : validateSync();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => addErrs(cxt, ruleErrs));
        }
      }
      function validateAsync() {
        const ruleErrs = gen.let("ruleErrs", null);
        gen.try(() => assignValid((0, codegen_1._)`await `), (e2) => gen.assign(valid, false).if((0, codegen_1._)`${e2} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e2}.errors`), () => gen.throw(e2)));
        return ruleErrs;
      }
      function validateSync() {
        const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
        gen.assign(validateErrs, null);
        assignValid(codegen_1.nil);
        return validateErrs;
      }
      function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
        const passSchema = !("compile" in def && !$data || def.schema === false);
        gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
      }
      function reportErrs(errors) {
        var _a2;
        gen.if((0, codegen_1.not)((_a2 = def.valid) !== null && _a2 !== void 0 ? _a2 : valid), errors);
      }
    }
    exports.funcKeywordCode = funcKeywordCode;
    function modifyData(cxt) {
      const { gen, data, it } = cxt;
      gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
    }
    function addErrs(cxt, errs) {
      const { gen } = cxt;
      gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
        (0, errors_1.extendErrors)(cxt);
      }, () => cxt.error());
    }
    function checkAsyncKeyword({ schemaEnv }, def) {
      if (def.async && !schemaEnv.$async)
        throw new Error("async keyword in sync schema");
    }
    function useKeyword(gen, keyword, result) {
      if (result === void 0)
        throw new Error(`keyword "${keyword}" failed to compile`);
      return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1.stringify)(result) });
    }
    function validSchemaType(schema, schemaType, allowUndefined = false) {
      return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
    }
    exports.validSchemaType = validSchemaType;
    function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
      if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
        throw new Error("ajv implementation error");
      }
      const deps = def.dependencies;
      if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
      }
      if (def.validateSchema) {
        const valid = def.validateSchema(schema[keyword]);
        if (!valid) {
          const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
          if (opts.validateSchema === "log")
            self.logger.error(msg);
          else
            throw new Error(msg);
        }
      }
    }
    exports.validateKeywordUsage = validateKeywordUsage;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/subschema.js
var require_subschema = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/subschema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extendSubschemaMode = exports.extendSubschemaData = exports.getSubschema = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
      }
      if (keyword !== void 0) {
        const sch = it.schema[keyword];
        return schemaProp === void 0 ? {
          schema: sch,
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}`
        } : {
          schema: sch[schemaProp],
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
        };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        };
      }
      throw new Error('either "keyword" or "schema" must be passed');
    }
    exports.getSubschema = getSubschema;
    function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
      if (data !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
      }
      const { gen } = it;
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
        dataContextProps(nextData);
        subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
      }
      if (data !== void 0) {
        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true);
        dataContextProps(nextData);
        if (propertyName !== void 0)
          subschema.propertyName = propertyName;
      }
      if (dataTypes)
        subschema.dataTypes = dataTypes;
      function dataContextProps(_nextData) {
        subschema.data = _nextData;
        subschema.dataLevel = it.dataLevel + 1;
        subschema.dataTypes = [];
        it.definedProperties = /* @__PURE__ */ new Set();
        subschema.parentData = it.data;
        subschema.dataNames = [...it.dataNames, _nextData];
      }
    }
    exports.extendSubschemaData = extendSubschemaData;
    function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
      if (compositeRule !== void 0)
        subschema.compositeRule = compositeRule;
      if (createErrors !== void 0)
        subschema.createErrors = createErrors;
      if (allErrors !== void 0)
        subschema.allErrors = allErrors;
      subschema.jtdDiscriminator = jtdDiscriminator;
      subschema.jtdMetadata = jtdMetadata;
    }
    exports.extendSubschemaMode = extendSubschemaMode;
  }
});

// ../../node_modules/.pnpm/fast-deep-equal@3.1.3/node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "../../node_modules/.pnpm/fast-deep-equal@3.1.3/node_modules/fast-deep-equal/index.js"(exports, module) {
    "use strict";
    module.exports = function equal(a2, b2) {
      if (a2 === b2) return true;
      if (a2 && b2 && typeof a2 == "object" && typeof b2 == "object") {
        if (a2.constructor !== b2.constructor) return false;
        var length, i2, keys;
        if (Array.isArray(a2)) {
          length = a2.length;
          if (length != b2.length) return false;
          for (i2 = length; i2-- !== 0; )
            if (!equal(a2[i2], b2[i2])) return false;
          return true;
        }
        if (a2.constructor === RegExp) return a2.source === b2.source && a2.flags === b2.flags;
        if (a2.valueOf !== Object.prototype.valueOf) return a2.valueOf() === b2.valueOf();
        if (a2.toString !== Object.prototype.toString) return a2.toString() === b2.toString();
        keys = Object.keys(a2);
        length = keys.length;
        if (length !== Object.keys(b2).length) return false;
        for (i2 = length; i2-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b2, keys[i2])) return false;
        for (i2 = length; i2-- !== 0; ) {
          var key = keys[i2];
          if (!equal(a2[key], b2[key])) return false;
        }
        return true;
      }
      return a2 !== a2 && b2 !== b2;
    };
  }
});

// ../../node_modules/.pnpm/json-schema-traverse@1.0.0/node_modules/json-schema-traverse/index.js
var require_json_schema_traverse = __commonJS({
  "../../node_modules/.pnpm/json-schema-traverse@1.0.0/node_modules/json-schema-traverse/index.js"(exports, module) {
    "use strict";
    var traverse = module.exports = function(schema, opts, cb) {
      if (typeof opts == "function") {
        cb = opts;
        opts = {};
      }
      cb = opts.cb || cb;
      var pre = typeof cb == "function" ? cb : cb.pre || function() {
      };
      var post2 = cb.post || function() {
      };
      _traverse(opts, pre, post2, schema, "", schema);
    };
    traverse.keywords = {
      additionalItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      propertyNames: true,
      not: true,
      if: true,
      then: true,
      else: true
    };
    traverse.arrayKeywords = {
      items: true,
      allOf: true,
      anyOf: true,
      oneOf: true
    };
    traverse.propsKeywords = {
      $defs: true,
      definitions: true,
      properties: true,
      patternProperties: true,
      dependencies: true
    };
    traverse.skipKeywords = {
      default: true,
      enum: true,
      const: true,
      required: true,
      maximum: true,
      minimum: true,
      exclusiveMaximum: true,
      exclusiveMinimum: true,
      multipleOf: true,
      maxLength: true,
      minLength: true,
      pattern: true,
      format: true,
      maxItems: true,
      minItems: true,
      uniqueItems: true,
      maxProperties: true,
      minProperties: true
    };
    function _traverse(opts, pre, post2, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
      if (schema && typeof schema == "object" && !Array.isArray(schema)) {
        pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for (var key in schema) {
          var sch = schema[key];
          if (Array.isArray(sch)) {
            if (key in traverse.arrayKeywords) {
              for (var i2 = 0; i2 < sch.length; i2++)
                _traverse(opts, pre, post2, sch[i2], jsonPtr + "/" + key + "/" + i2, rootSchema, jsonPtr, key, schema, i2);
            }
          } else if (key in traverse.propsKeywords) {
            if (sch && typeof sch == "object") {
              for (var prop in sch)
                _traverse(opts, pre, post2, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
            }
          } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
            _traverse(opts, pre, post2, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
          }
        }
        post2(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      }
    }
    function escapeJsonPtr(str) {
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/resolve.js
var require_resolve = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/resolve.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getSchemaRefs = exports.resolveUrl = exports.normalizeId = exports._getFullPath = exports.getFullPath = exports.inlineRef = void 0;
    var util_1 = require_util();
    var equal = require_fast_deep_equal();
    var traverse = require_json_schema_traverse();
    var SIMPLE_INLINED = /* @__PURE__ */ new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const"
    ]);
    function inlineRef(schema, limit = true) {
      if (typeof schema == "boolean")
        return true;
      if (limit === true)
        return !hasRef(schema);
      if (!limit)
        return false;
      return countKeys(schema) <= limit;
    }
    exports.inlineRef = inlineRef;
    var REF_KEYWORDS = /* @__PURE__ */ new Set([
      "$ref",
      "$recursiveRef",
      "$recursiveAnchor",
      "$dynamicRef",
      "$dynamicAnchor"
    ]);
    function hasRef(schema) {
      for (const key in schema) {
        if (REF_KEYWORDS.has(key))
          return true;
        const sch = schema[key];
        if (Array.isArray(sch) && sch.some(hasRef))
          return true;
        if (typeof sch == "object" && hasRef(sch))
          return true;
      }
      return false;
    }
    function countKeys(schema) {
      let count = 0;
      for (const key in schema) {
        if (key === "$ref")
          return Infinity;
        count++;
        if (SIMPLE_INLINED.has(key))
          continue;
        if (typeof schema[key] == "object") {
          (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
        }
        if (count === Infinity)
          return Infinity;
      }
      return count;
    }
    function getFullPath(resolver, id = "", normalize) {
      if (normalize !== false)
        id = normalizeId(id);
      const p2 = resolver.parse(id);
      return _getFullPath(resolver, p2);
    }
    exports.getFullPath = getFullPath;
    function _getFullPath(resolver, p2) {
      const serialized = resolver.serialize(p2);
      return serialized.split("#")[0] + "#";
    }
    exports._getFullPath = _getFullPath;
    var TRAILING_SLASH_HASH = /#\/?$/;
    function normalizeId(id) {
      return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
    }
    exports.normalizeId = normalizeId;
    function resolveUrl(resolver, baseId, id) {
      id = normalizeId(id);
      return resolver.resolve(baseId, id);
    }
    exports.resolveUrl = resolveUrl;
    var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
    function getSchemaRefs(schema, baseId) {
      if (typeof schema == "boolean")
        return {};
      const { schemaId, uriResolver } = this.opts;
      const schId = normalizeId(schema[schemaId] || baseId);
      const baseIds = { "": schId };
      const pathPrefix = getFullPath(uriResolver, schId, false);
      const localRefs = {};
      const schemaRefs = /* @__PURE__ */ new Set();
      traverse(schema, { allKeys: true }, (sch, jsonPtr, _2, parentJsonPtr) => {
        if (parentJsonPtr === void 0)
          return;
        const fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string")
          innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
          const _resolve = this.opts.uriResolver.resolve;
          ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
          if (schemaRefs.has(ref))
            throw ambiguos(ref);
          schemaRefs.add(ref);
          let schOrRef = this.refs[ref];
          if (typeof schOrRef == "string")
            schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") {
            checkAmbiguosRef(sch, schOrRef.schema, ref);
          } else if (ref !== normalizeId(fullPath)) {
            if (ref[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref], ref);
              localRefs[ref] = sch;
            } else {
              this.refs[ref] = fullPath;
            }
          }
          return ref;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor))
              throw new Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      });
      return localRefs;
      function checkAmbiguosRef(sch1, sch2, ref) {
        if (sch2 !== void 0 && !equal(sch1, sch2))
          throw ambiguos(ref);
      }
      function ambiguos(ref) {
        return new Error(`reference "${ref}" resolves to more than one schema`);
      }
    }
    exports.getSchemaRefs = getSchemaRefs;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js
var require_validate = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getData = exports.KeywordCxt = exports.validateFunctionCode = void 0;
    var boolSchema_1 = require_boolSchema();
    var dataType_1 = require_dataType();
    var applicability_1 = require_applicability();
    var dataType_2 = require_dataType();
    var defaults_1 = require_defaults();
    var keyword_1 = require_keyword();
    var subschema_1 = require_subschema();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var errors_1 = require_errors();
    function validateFunctionCode(it) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          topSchemaObjCode(it);
          return;
        }
      }
      validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
    }
    exports.validateFunctionCode = validateFunctionCode;
    function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
      if (opts.code.es5) {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
          gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
          destructureValCxtES5(gen, opts);
          gen.code(body);
        });
      } else {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
      }
    }
    function destructureValCxt(opts) {
      return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
    }
    function destructureValCxtES5(gen, opts) {
      gen.if(names_1.default.valCxt, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
        gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
      }, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.rootData, names_1.default.data);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
      });
    }
    function topSchemaObjCode(it) {
      const { schema, opts, gen } = it;
      validateFunction(it, () => {
        if (opts.$comment && schema.$comment)
          commentKeyword(it);
        checkNoDefault(it);
        gen.let(names_1.default.vErrors, null);
        gen.let(names_1.default.errors, 0);
        if (opts.unevaluated)
          resetEvaluated(it);
        typeAndKeywords(it);
        returnResults(it);
      });
      return;
    }
    function resetEvaluated(it) {
      const { gen, validateName } = it;
      it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
    }
    function funcSourceUrl(schema, opts) {
      const schId = typeof schema == "object" && schema[opts.schemaId];
      return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
    }
    function subschemaCode(it, valid) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          subSchemaObjCode(it, valid);
          return;
        }
      }
      (0, boolSchema_1.boolOrEmptySchema)(it, valid);
    }
    function schemaCxtHasRules({ schema, self }) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (self.RULES.all[key])
          return true;
      return false;
    }
    function isSchemaObj(it) {
      return typeof it.schema != "boolean";
    }
    function subSchemaObjCode(it, valid) {
      const { schema, gen, opts } = it;
      if (opts.$comment && schema.$comment)
        commentKeyword(it);
      updateContext(it);
      checkAsyncSchema(it);
      const errsCount = gen.const("_errs", names_1.default.errors);
      typeAndKeywords(it, errsCount);
      gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
    }
    function checkKeywords(it) {
      (0, util_1.checkUnknownRules)(it);
      checkRefsAndKeywords(it);
    }
    function typeAndKeywords(it, errsCount) {
      if (it.opts.jtd)
        return schemaKeywords(it, [], false, errsCount);
      const types = (0, dataType_1.getSchemaTypes)(it.schema);
      const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types);
      schemaKeywords(it, types, !checkedTypes, errsCount);
    }
    function checkRefsAndKeywords(it) {
      const { schema, errSchemaPath, opts, self } = it;
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) {
        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
      }
    }
    function checkNoDefault(it) {
      const { schema, opts } = it;
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
      }
    }
    function updateContext(it) {
      const schId = it.schema[it.opts.schemaId];
      if (schId)
        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
    }
    function checkAsyncSchema(it) {
      if (it.schema.$async && !it.schemaEnv.$async)
        throw new Error("async schema in sync schema");
    }
    function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
      const msg = schema.$comment;
      if (opts.$comment === true) {
        gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
      } else if (typeof opts.$comment == "function") {
        const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
      }
    }
    function returnResults(it) {
      const { gen, schemaEnv, validateName, ValidationError, opts } = it;
      if (schemaEnv.$async) {
        gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
        if (opts.unevaluated)
          assignEvaluated(it);
        gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
      }
    }
    function assignEvaluated({ gen, evaluated, props, items }) {
      if (props instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.props`, props);
      if (items instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.items`, items);
    }
    function schemaKeywords(it, types, typeErrors, errsCount) {
      const { gen, schema, data, allErrors, opts, self } = it;
      const { RULES } = self;
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
        return;
      }
      if (!opts.jtd)
        checkStrictTypes(it, types);
      gen.block(() => {
        for (const group of RULES.rules)
          groupKeywords(group);
        groupKeywords(RULES.post);
      });
      function groupKeywords(group) {
        if (!(0, applicability_1.shouldUseGroup)(schema, group))
          return;
        if (group.type) {
          gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
          iterateKeywords(it, group);
          if (types.length === 1 && types[0] === group.type && typeErrors) {
            gen.else();
            (0, dataType_2.reportTypeError)(it);
          }
          gen.endIf();
        } else {
          iterateKeywords(it, group);
        }
        if (!allErrors)
          gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
      }
    }
    function iterateKeywords(it, group) {
      const { gen, schema, opts: { useDefaults } } = it;
      if (useDefaults)
        (0, defaults_1.assignDefaults)(it, group.type);
      gen.block(() => {
        for (const rule of group.rules) {
          if ((0, applicability_1.shouldUseRule)(schema, rule)) {
            keywordCode(it, rule.keyword, rule.definition, group.type);
          }
        }
      });
    }
    function checkStrictTypes(it, types) {
      if (it.schemaEnv.meta || !it.opts.strictTypes)
        return;
      checkContextTypes(it, types);
      if (!it.opts.allowUnionTypes)
        checkMultipleTypes(it, types);
      checkKeywordTypes(it, it.dataTypes);
    }
    function checkContextTypes(it, types) {
      if (!types.length)
        return;
      if (!it.dataTypes.length) {
        it.dataTypes = types;
        return;
      }
      types.forEach((t2) => {
        if (!includesType(it.dataTypes, t2)) {
          strictTypesError(it, `type "${t2}" not allowed by context "${it.dataTypes.join(",")}"`);
        }
      });
      narrowSchemaTypes(it, types);
    }
    function checkMultipleTypes(it, ts) {
      if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
      }
    }
    function checkKeywordTypes(it, ts) {
      const rules = it.self.RULES.all;
      for (const keyword in rules) {
        const rule = rules[keyword];
        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
          const { type } = rule.definition;
          if (type.length && !type.some((t2) => hasApplicableType(ts, t2))) {
            strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
          }
        }
      }
    }
    function hasApplicableType(schTs, kwdT) {
      return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
    }
    function includesType(ts, t2) {
      return ts.includes(t2) || t2 === "integer" && ts.includes("number");
    }
    function narrowSchemaTypes(it, withTypes) {
      const ts = [];
      for (const t2 of it.dataTypes) {
        if (includesType(withTypes, t2))
          ts.push(t2);
        else if (withTypes.includes("integer") && t2 === "number")
          ts.push("integer");
      }
      it.dataTypes = ts;
    }
    function strictTypesError(it, msg) {
      const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
      msg += ` at "${schemaPath}" (strictTypes)`;
      (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
    }
    var KeywordCxt = class {
      constructor(it, def, keyword) {
        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
        this.gen = it.gen;
        this.allErrors = it.allErrors;
        this.keyword = keyword;
        this.data = it.data;
        this.schema = it.schema[keyword];
        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
        this.schemaType = def.schemaType;
        this.parentSchema = it.schema;
        this.params = {};
        this.it = it;
        this.def = def;
        if (this.$data) {
          this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
        } else {
          this.schemaCode = this.schemaValue;
          if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
            throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
          }
        }
        if ("code" in def ? def.trackErrors : def.errors !== false) {
          this.errsCount = it.gen.const("_errs", names_1.default.errors);
        }
      }
      result(condition, successAction, failAction) {
        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
      }
      failResult(condition, successAction, failAction) {
        this.gen.if(condition);
        if (failAction)
          failAction();
        else
          this.error();
        if (successAction) {
          this.gen.else();
          successAction();
          if (this.allErrors)
            this.gen.endIf();
        } else {
          if (this.allErrors)
            this.gen.endIf();
          else
            this.gen.else();
        }
      }
      pass(condition, failAction) {
        this.failResult((0, codegen_1.not)(condition), void 0, failAction);
      }
      fail(condition) {
        if (condition === void 0) {
          this.error();
          if (!this.allErrors)
            this.gen.if(false);
          return;
        }
        this.gen.if(condition);
        this.error();
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
      fail$data(condition) {
        if (!this.$data)
          return this.fail(condition);
        const { schemaCode } = this;
        this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
      }
      error(append, errorParams, errorPaths) {
        if (errorParams) {
          this.setParams(errorParams);
          this._error(append, errorPaths);
          this.setParams({});
          return;
        }
        this._error(append, errorPaths);
      }
      _error(append, errorPaths) {
        ;
        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
      }
      $dataError() {
        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
      }
      reset() {
        if (this.errsCount === void 0)
          throw new Error('add "trackErrors" to keyword definition');
        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
      }
      ok(cond) {
        if (!this.allErrors)
          this.gen.if(cond);
      }
      setParams(obj, assign) {
        if (assign)
          Object.assign(this.params, obj);
        else
          this.params = obj;
      }
      block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
        this.gen.block(() => {
          this.check$data(valid, $dataValid);
          codeBlock();
        });
      }
      check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
        if (!this.$data)
          return;
        const { gen, schemaCode, schemaType, def } = this;
        gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
        if (valid !== codegen_1.nil)
          gen.assign(valid, true);
        if (schemaType.length || def.validateSchema) {
          gen.elseIf(this.invalid$data());
          this.$dataError();
          if (valid !== codegen_1.nil)
            gen.assign(valid, false);
        }
        gen.else();
      }
      invalid$data() {
        const { gen, schemaCode, schemaType, def, it } = this;
        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
        function wrong$DataType() {
          if (schemaType.length) {
            if (!(schemaCode instanceof codegen_1.Name))
              throw new Error("ajv implementation error");
            const st = Array.isArray(schemaType) ? schemaType : [schemaType];
            return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
          }
          return codegen_1.nil;
        }
        function invalid$DataSchema() {
          if (def.validateSchema) {
            const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
            return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
          }
          return codegen_1.nil;
        }
      }
      subschema(appl, valid) {
        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
        (0, subschema_1.extendSubschemaMode)(subschema, appl);
        const nextContext = { ...this.it, ...subschema, items: void 0, props: void 0 };
        subschemaCode(nextContext, valid);
        return nextContext;
      }
      mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this;
        if (!it.opts.unevaluated)
          return;
        if (it.props !== true && schemaCxt.props !== void 0) {
          it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
        }
        if (it.items !== true && schemaCxt.items !== void 0) {
          it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
        }
      }
      mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this;
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
          gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
          return true;
        }
      }
    };
    exports.KeywordCxt = KeywordCxt;
    function keywordCode(it, keyword, def, ruleType) {
      const cxt = new KeywordCxt(it, def, keyword);
      if ("code" in def) {
        def.code(cxt, ruleType);
      } else if (cxt.$data && def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      } else if ("macro" in def) {
        (0, keyword_1.macroKeywordCode)(cxt, def);
      } else if (def.compile || def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      }
    }
    var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
    var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
    function getData($data, { dataLevel, dataNames, dataPathArr }) {
      let jsonPointer;
      let data;
      if ($data === "")
        return names_1.default.rootData;
      if ($data[0] === "/") {
        if (!JSON_POINTER.test($data))
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        jsonPointer = $data;
        data = names_1.default.rootData;
      } else {
        const matches = RELATIVE_JSON_POINTER.exec($data);
        if (!matches)
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        const up = +matches[1];
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
          if (up >= dataLevel)
            throw new Error(errorMsg("property/index", up));
          return dataPathArr[dataLevel - up];
        }
        if (up > dataLevel)
          throw new Error(errorMsg("data", up));
        data = dataNames[dataLevel - up];
        if (!jsonPointer)
          return data;
      }
      let expr = data;
      const segments = jsonPointer.split("/");
      for (const segment of segments) {
        if (segment) {
          data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
          expr = (0, codegen_1._)`${expr} && ${data}`;
        }
      }
      return expr;
      function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
      }
    }
    exports.getData = getData;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/validation_error.js
var require_validation_error = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/validation_error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ValidationError = class extends Error {
      constructor(errors) {
        super("validation failed");
        this.errors = errors;
        this.ajv = this.validation = true;
      }
    };
    exports.default = ValidationError;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/ref_error.js
var require_ref_error = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/ref_error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var resolve_1 = require_resolve();
    var MissingRefError = class extends Error {
      constructor(resolver, baseId, ref, msg) {
        super(msg || `can't resolve reference ${ref} from id ${baseId}`);
        this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
        this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
      }
    };
    exports.default = MissingRefError;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/index.js
var require_compile = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resolveSchema = exports.getCompilingSchema = exports.resolveRef = exports.compileSchema = exports.SchemaEnv = void 0;
    var codegen_1 = require_codegen();
    var validation_error_1 = require_validation_error();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var validate_1 = require_validate();
    var SchemaEnv = class {
      constructor(env) {
        var _a;
        this.refs = {};
        this.dynamicAnchors = {};
        let schema;
        if (typeof env.schema == "object")
          schema = env.schema;
        this.schema = env.schema;
        this.schemaId = env.schemaId;
        this.root = env.root || this;
        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
        this.schemaPath = env.schemaPath;
        this.localRefs = env.localRefs;
        this.meta = env.meta;
        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
        this.refs = {};
      }
    };
    exports.SchemaEnv = SchemaEnv;
    function compileSchema(sch) {
      const _sch = getCompilingSchema.call(this, sch);
      if (_sch)
        return _sch;
      const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
      const { es5, lines } = this.opts.code;
      const { ownProperties } = this.opts;
      const gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
      let _ValidationError;
      if (sch.$async) {
        _ValidationError = gen.scopeValue("Error", {
          ref: validation_error_1.default,
          code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
        });
      }
      const validateName = gen.scopeName("validate");
      sch.validateName = validateName;
      const schemaCxt = {
        gen,
        allErrors: this.opts.allErrors,
        data: names_1.default.data,
        parentData: names_1.default.parentData,
        parentDataProperty: names_1.default.parentDataProperty,
        dataNames: [names_1.default.data],
        dataPathArr: [codegen_1.nil],
        // TODO can its length be used as dataLevel if nil is removed?
        dataLevel: 0,
        dataTypes: [],
        definedProperties: /* @__PURE__ */ new Set(),
        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) } : { ref: sch.schema }),
        validateName,
        ValidationError: _ValidationError,
        schema: sch.schema,
        schemaEnv: sch,
        rootId,
        baseId: sch.baseId || rootId,
        schemaPath: codegen_1.nil,
        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: (0, codegen_1._)`""`,
        opts: this.opts,
        self: this
      };
      let sourceCode;
      try {
        this._compilations.add(sch);
        (0, validate_1.validateFunctionCode)(schemaCxt);
        gen.optimize(this.opts.code.optimize);
        const validateCode = gen.toString();
        sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
        if (this.opts.code.process)
          sourceCode = this.opts.code.process(sourceCode, sch);
        const makeValidate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode);
        const validate = makeValidate(this, this.scope.get());
        this.scope.value(validateName, { ref: validate });
        validate.errors = null;
        validate.schema = sch.schema;
        validate.schemaEnv = sch;
        if (sch.$async)
          validate.$async = true;
        if (this.opts.code.source === true) {
          validate.source = { validateName, validateCode, scopeValues: gen._values };
        }
        if (this.opts.unevaluated) {
          const { props, items } = schemaCxt;
          validate.evaluated = {
            props: props instanceof codegen_1.Name ? void 0 : props,
            items: items instanceof codegen_1.Name ? void 0 : items,
            dynamicProps: props instanceof codegen_1.Name,
            dynamicItems: items instanceof codegen_1.Name
          };
          if (validate.source)
            validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
        }
        sch.validate = validate;
        return sch;
      } catch (e2) {
        delete sch.validate;
        delete sch.validateName;
        if (sourceCode)
          this.logger.error("Error compiling schema, function code:", sourceCode);
        throw e2;
      } finally {
        this._compilations.delete(sch);
      }
    }
    exports.compileSchema = compileSchema;
    function resolveRef(root, baseId, ref) {
      var _a;
      ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
      const schOrFunc = root.refs[ref];
      if (schOrFunc)
        return schOrFunc;
      let _sch = resolve3.call(this, root, ref);
      if (_sch === void 0) {
        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref];
        const { schemaId } = this.opts;
        if (schema)
          _sch = new SchemaEnv({ schema, schemaId, root, baseId });
      }
      if (_sch === void 0)
        return;
      return root.refs[ref] = inlineOrCompile.call(this, _sch);
    }
    exports.resolveRef = resolveRef;
    function inlineOrCompile(sch) {
      if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
        return sch.schema;
      return sch.validate ? sch : compileSchema.call(this, sch);
    }
    function getCompilingSchema(schEnv) {
      for (const sch of this._compilations) {
        if (sameSchemaEnv(sch, schEnv))
          return sch;
      }
    }
    exports.getCompilingSchema = getCompilingSchema;
    function sameSchemaEnv(s1, s2) {
      return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
    }
    function resolve3(root, ref) {
      let sch;
      while (typeof (sch = this.refs[ref]) == "string")
        ref = sch;
      return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
    }
    function resolveSchema(root, ref) {
      const p2 = this.opts.uriResolver.parse(ref);
      const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p2);
      let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
      if (Object.keys(root.schema).length > 0 && refPath === baseId) {
        return getJsonPointer.call(this, p2, root);
      }
      const id = (0, resolve_1.normalizeId)(refPath);
      const schOrRef = this.refs[id] || this.schemas[id];
      if (typeof schOrRef == "string") {
        const sch = resolveSchema.call(this, root, schOrRef);
        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
          return;
        return getJsonPointer.call(this, p2, sch);
      }
      if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
        return;
      if (!schOrRef.validate)
        compileSchema.call(this, schOrRef);
      if (id === (0, resolve_1.normalizeId)(ref)) {
        const { schema } = schOrRef;
        const { schemaId } = this.opts;
        const schId = schema[schemaId];
        if (schId)
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        return new SchemaEnv({ schema, schemaId, root, baseId });
      }
      return getJsonPointer.call(this, p2, schOrRef);
    }
    exports.resolveSchema = resolveSchema;
    var PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
      "properties",
      "patternProperties",
      "enum",
      "dependencies",
      "definitions"
    ]);
    function getJsonPointer(parsedRef, { baseId, schema, root }) {
      var _a;
      if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
        return;
      for (const part of parsedRef.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean")
          return;
        const partSchema = schema[(0, util_1.unescapeFragment)(part)];
        if (partSchema === void 0)
          return;
        schema = partSchema;
        const schId = typeof schema === "object" && schema[this.opts.schemaId];
        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        }
      }
      let env;
      if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        env = resolveSchema.call(this, root, $ref);
      }
      const { schemaId } = this.opts;
      env = env || new SchemaEnv({ schema, schemaId, root, baseId });
      if (env.schema !== env.root.schema)
        return env;
      return void 0;
    }
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/data.json
var require_data = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/data.json"(exports, module) {
    module.exports = {
      $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
      description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
      type: "object",
      required: ["$data"],
      properties: {
        $data: {
          type: "string",
          anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }]
        }
      },
      additionalProperties: false
    };
  }
});

// ../../node_modules/.pnpm/fast-uri@3.1.7/node_modules/fast-uri/lib/utils.js
var require_utils = __commonJS({
  "../../node_modules/.pnpm/fast-uri@3.1.7/node_modules/fast-uri/lib/utils.js"(exports, module) {
    "use strict";
    var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
    var isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
    var isPort = RegExp.prototype.test.bind(/^\d*$/u);
    var isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
    var isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
    var isPathCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u);
    var isQueryFragmentCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u);
    var isUserinfoCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:]$/u);
    var BYTE_HEX = new Array(256);
    {
      const HEX_DIGITS = "0123456789ABCDEF";
      for (let i2 = 0; i2 < 256; i2++) {
        BYTE_HEX[i2] = "%" + HEX_DIGITS[i2 >> 4] + HEX_DIGITS[i2 & 15];
      }
    }
    function percentEncodeNonAscii(cp) {
      if (cp < 2048) {
        return BYTE_HEX[192 | cp >> 6] + BYTE_HEX[128 | cp & 63];
      }
      if (cp < 65536) {
        return BYTE_HEX[224 | cp >> 12] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
      }
      return BYTE_HEX[240 | cp >> 18] + BYTE_HEX[128 | cp >> 12 & 63] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
    }
    function stringArrayToHexStripped(input) {
      let acc = "";
      let code = 0;
      let i2 = 0;
      for (i2 = 0; i2 < input.length; i2++) {
        code = input[i2].charCodeAt(0);
        if (code === 48) {
          continue;
        }
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i2];
        break;
      }
      for (i2 += 1; i2 < input.length; i2++) {
        code = input[i2].charCodeAt(0);
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i2];
      }
      return acc;
    }
    var isHextet = RegExp.prototype.test.bind(/^[\dA-Fa-f]{1,4}$/);
    var isIPvFuture = RegExp.prototype.test.bind(/^[vV][\dA-Fa-f]+\.[A-Za-z\d\-._~!$&'()*+,;=:]+$/);
    var isZoneCharacter = RegExp.prototype.test.bind(/^[A-Za-z\d\-._~]$/);
    var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
    function isZoneIdentifier(zone) {
      if (zone.length === 0) return false;
      for (let i2 = 0; i2 < zone.length; i2++) {
        if (isZoneCharacter(zone[i2])) continue;
        if (zone[i2] === "%" && i2 + 2 < zone.length && isHexPair(zone.slice(i2 + 1, i2 + 3))) {
          i2 += 2;
          continue;
        }
        return false;
      }
      return true;
    }
    function compressIPv6ZeroRun(hextets) {
      let bestStart = -1;
      let bestLength = 0;
      let runStart = -1;
      let runLength = 0;
      for (let i2 = 0; i2 < hextets.length; i2++) {
        if (hextets[i2] === "0") {
          if (runStart === -1) runStart = i2;
          runLength++;
          if (runLength > bestLength) {
            bestLength = runLength;
            bestStart = runStart;
          }
        } else {
          runStart = -1;
          runLength = 0;
        }
      }
      if (bestLength < 2) return hextets.join(":");
      const head = hextets.slice(0, bestStart).join(":");
      const tail = hextets.slice(bestStart + bestLength).join(":");
      return head + "::" + tail;
    }
    function normalizeIPv6Address(input) {
      const compression = input.indexOf("::");
      if (compression !== -1 && input.indexOf("::", compression + 1) !== -1) return void 0;
      const left = compression === -1 ? input.split(":") : input.slice(0, compression).split(":");
      const right = compression === -1 ? [] : input.slice(compression + 2).split(":");
      if (compression !== -1) {
        if (left.length === 1 && left[0] === "") left.length = 0;
        if (right.length === 1 && right[0] === "") right.length = 0;
      }
      const parts = left.concat(right);
      let hextetCount = 0;
      for (let i2 = 0; i2 < parts.length; i2++) {
        const part = parts[i2];
        if (part === "") return void 0;
        if (part.indexOf(".") !== -1) {
          if (i2 !== parts.length - 1 || compression !== -1 && right.length === 0 || !isIPv4(part)) return void 0;
          hextetCount += 2;
          continue;
        }
        if (!isHextet(part)) return void 0;
        parts[i2] = parseInt(part, 16).toString(16);
        hextetCount++;
      }
      if (compression === -1) {
        if (hextetCount !== 8) return void 0;
        return compressIPv6ZeroRun(parts);
      }
      if (hextetCount >= 8) return void 0;
      const expanded = parts.slice(0, left.length);
      for (let i2 = hextetCount; i2 < 8; i2++) expanded.push("0");
      for (let i2 = left.length; i2 < parts.length; i2++) expanded.push(parts[i2]);
      return compressIPv6ZeroRun(expanded);
    }
    function normalizeIPv6(host) {
      const bracketed = host[0] === "[" && host[host.length - 1] === "]";
      const hasBracket = host[0] === "[" || host[host.length - 1] === "]";
      if (hasBracket && !bracketed) return { host, isIPV6: false, error: true };
      let input = bracketed ? host.slice(1, -1) : host;
      if (bracketed && isIPvFuture(input)) {
        input = input.toLowerCase();
        return { host: `[${input}]`, escapedHost: input, isIPV6: false, isIPVFuture: true };
      }
      if (findToken(input, ":") < 2) {
        return { host, isIPV6: false, error: bracketed };
      }
      let zoneIdentifier = "";
      const zoneSeparator = input.indexOf("%");
      if (zoneSeparator !== -1) {
        const separatorLength = input.slice(zoneSeparator, zoneSeparator + 3).toLowerCase() === "%25" ? 3 : 1;
        zoneIdentifier = input.slice(zoneSeparator + separatorLength);
        if (!isZoneIdentifier(zoneIdentifier)) return { host, isIPV6: false, error: true };
        input = input.slice(0, zoneSeparator);
      }
      const address = normalizeIPv6Address(input);
      if (address === void 0) return { host, isIPV6: false, error: true };
      return {
        host: address + (zoneIdentifier ? "%" + zoneIdentifier : ""),
        escapedHost: address + (zoneIdentifier ? "%25" + zoneIdentifier : ""),
        isIPV6: true
      };
    }
    function findToken(str, token) {
      let ind = 0;
      for (let i2 = 0; i2 < str.length; i2++) {
        if (str[i2] === token) ind++;
      }
      return ind;
    }
    function removeDotSegments(path) {
      let input = path;
      const output = [];
      let nextSlash = -1;
      let len = 0;
      while (len = input.length) {
        if (len === 1) {
          if (input === ".") {
            break;
          } else if (input === "/") {
            output.push("/");
            break;
          } else {
            output.push(input);
            break;
          }
        } else if (len === 2) {
          if (input[0] === ".") {
            if (input[1] === ".") {
              break;
            } else if (input[1] === "/") {
              input = input.slice(2);
              continue;
            }
          } else if (input[0] === "/") {
            if (input[1] === "." || input[1] === "/") {
              output.push("/");
              break;
            }
          }
        } else if (len === 3) {
          if (input === "/..") {
            if (output.length !== 0) {
              output.pop();
            }
            output.push("/");
            break;
          }
        }
        if (input[0] === ".") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(3);
              continue;
            }
          } else if (input[1] === "/") {
            input = input.slice(2);
            continue;
          }
        } else if (input[0] === "/") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(2);
              continue;
            } else if (input[2] === ".") {
              if (input[3] === "/") {
                input = input.slice(3);
                if (output.length !== 0) {
                  output.pop();
                }
                continue;
              }
            }
          }
        }
        if ((nextSlash = input.indexOf("/", 1)) === -1) {
          output.push(input);
          break;
        } else {
          output.push(input.slice(0, nextSlash));
          input = input.slice(nextSlash);
        }
      }
      return output.join("");
    }
    var HOST_DELIMS = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" };
    var HOST_DELIM_RE = /[@/?#:]/g;
    var HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
    function reescapeHostDelimiters(host, isIP) {
      const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
      re.lastIndex = 0;
      return host.replace(re, (ch) => HOST_DELIMS[ch]);
    }
    function normalizePercentEncoding(input, decodeUnreserved = false) {
      if (input.indexOf("%") === -1) {
        return input;
      }
      let output = "";
      for (let i2 = 0; i2 < input.length; i2++) {
        if (input[i2] === "%" && i2 + 2 < input.length) {
          const hex = input.slice(i2 + 1, i2 + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decodeUnreserved && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i2 += 2;
            continue;
          }
        }
        output += input[i2];
      }
      return output;
    }
    function normalizePathEncoding(input) {
      let output = "";
      for (let i2 = 0; i2 < input.length; i2++) {
        const ch = input[i2];
        if (ch === "%" && i2 + 2 < input.length) {
          const hex = input.slice(i2 + 1, i2 + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decoded !== "." && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i2 += 2;
            continue;
          }
        }
        if (isPathCharacter(ch)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i2);
          if (code < 128) {
            output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i2 + 1 < input.length) {
            const low = input.charCodeAt(i2 + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i2++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function serializePathEncoding(input, pathNoScheme = false) {
      let output = "";
      let firstSegment = pathNoScheme && input[0] !== "/";
      for (let i2 = 0; i2 < input.length; i2++) {
        const ch = input[i2];
        if (ch === "%" && i2 + 2 < input.length) {
          const hex = input.slice(i2 + 1, i2 + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i2 += 2;
            continue;
          }
        }
        if (ch === "/") {
          firstSegment = false;
        }
        if (isPathCharacter(ch) && (ch !== ":" || !firstSegment)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i2);
          if (code < 128) {
            output += BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i2 + 1 < input.length) {
            const low = input.charCodeAt(i2 + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i2++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function encodeComponent(input, isAllowed) {
      let output = "";
      for (let i2 = 0; i2 < input.length; i2++) {
        const ch = input[i2];
        if (ch === "%" && i2 + 2 < input.length) {
          const hex = input.slice(i2 + 1, i2 + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i2 += 2;
            continue;
          }
        }
        if (isAllowed(ch)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i2);
          if (code < 128) {
            output += BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i2 + 1 < input.length) {
            const low = input.charCodeAt(i2 + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i2++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function encodeUserinfo(input) {
      return encodeComponent(input, isUserinfoCharacter);
    }
    function encodeQuery(input) {
      return encodeComponent(input, isQueryFragmentCharacter);
    }
    function encodeFragment(input) {
      return encodeComponent(input, isQueryFragmentCharacter);
    }
    function isEscapeSafe(cp) {
      return cp >= 48 && cp <= 57 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp === 42 || cp === 43 || cp === 45 || cp === 46 || cp === 47 || cp === 64 || cp === 95;
    }
    function normalizeQueryFragmentEncoding(input) {
      let output = "";
      for (let i2 = 0; i2 < input.length; i2++) {
        const ch = input[i2];
        if (ch === "%" && i2 + 2 < input.length) {
          const hex = input.slice(i2 + 1, i2 + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i2 += 2;
            continue;
          }
        }
        if (isQueryFragmentCharacter(ch)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i2);
          if (code < 128) {
            output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i2 + 1 < input.length) {
            const low = input.charCodeAt(i2 + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i2++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function escapePreservingEscapes(input) {
      let output = "";
      for (let i2 = 0; i2 < input.length; i2++) {
        if (input[i2] === "%" && i2 + 2 < input.length) {
          const hex = input.slice(i2 + 1, i2 + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i2 += 2;
            continue;
          }
        }
        output += escape(input[i2]);
      }
      return output;
    }
    function recomposeAuthority(component) {
      const uriTokens = [];
      if (component.userinfo !== void 0) {
        uriTokens.push(encodeUserinfo(component.userinfo));
        uriTokens.push("@");
      }
      if (component.host !== void 0) {
        let host = component.host;
        if (!isIPv4(host)) {
          let ipV6res = normalizeIPv6(host);
          if (ipV6res.isIPV6 !== true && ipV6res.isIPVFuture !== true) {
            host = normalizePercentEncoding(host, true);
            ipV6res = normalizeIPv6(host);
          }
          if (ipV6res.isIPV6 === true || ipV6res.isIPVFuture === true) {
            host = `[${ipV6res.escapedHost}]`;
          } else {
            host = reescapeHostDelimiters(host, false);
          }
        }
        uriTokens.push(host);
      }
      if (typeof component.port === "number" || typeof component.port === "string") {
        const port = String(component.port);
        if (!isPort(port)) {
          throw new TypeError("URI port is malformed.");
        }
        uriTokens.push(":");
        uriTokens.push(port);
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    module.exports = {
      nonSimpleDomain,
      recomposeAuthority,
      reescapeHostDelimiters,
      normalizePercentEncoding,
      normalizePathEncoding,
      serializePathEncoding,
      normalizeQueryFragmentEncoding,
      encodeUserinfo,
      encodeQuery,
      encodeFragment,
      escapePreservingEscapes,
      removeDotSegments,
      isIPv4,
      isUUID,
      normalizeIPv6,
      stringArrayToHexStripped
    };
  }
});

// ../../node_modules/.pnpm/fast-uri@3.1.7/node_modules/fast-uri/lib/schemes.js
var require_schemes = __commonJS({
  "../../node_modules/.pnpm/fast-uri@3.1.7/node_modules/fast-uri/lib/schemes.js"(exports, module) {
    "use strict";
    var { isUUID } = require_utils();
    var URN_REG = /^([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-./:;=@]|%[\da-f]{2})+)$/iu;
    var supportedSchemeNames = (
      /** @type {const} */
      [
        "http",
        "https",
        "ws",
        "wss",
        "urn",
        "urn:uuid"
      ]
    );
    function isValidSchemeName(name) {
      return supportedSchemeNames.indexOf(
        /** @type {*} */
        name
      ) !== -1;
    }
    function wsIsSecure(wsComponent) {
      if (wsComponent.secure === true) {
        return true;
      } else if (wsComponent.secure === false) {
        return false;
      } else if (wsComponent.scheme) {
        return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
      } else {
        return false;
      }
    }
    function httpParse(component) {
      if (!component.host) {
        component.error = component.error || "HTTP URIs must have a host.";
      }
      return component;
    }
    function httpSerialize(component) {
      const secure = String(component.scheme).toLowerCase() === "https";
      if (component.port === (secure ? 443 : 80) || component.port === "") {
        component.port = void 0;
      }
      if (!component.path) {
        component.path = "/";
      }
      return component;
    }
    function wsParse(wsComponent) {
      wsComponent.secure = wsIsSecure(wsComponent);
      wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
      wsComponent.path = void 0;
      wsComponent.query = void 0;
      return wsComponent;
    }
    function wsSerialize(wsComponent) {
      if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") {
        wsComponent.port = void 0;
      }
      if (typeof wsComponent.secure === "boolean") {
        wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
        wsComponent.secure = void 0;
      }
      if (wsComponent.resourceName) {
        const queryIndex = wsComponent.resourceName.indexOf("?");
        const path = queryIndex === -1 ? wsComponent.resourceName : wsComponent.resourceName.slice(0, queryIndex);
        wsComponent.path = path && path !== "/" ? path : void 0;
        wsComponent.query = queryIndex === -1 ? void 0 : wsComponent.resourceName.slice(queryIndex + 1);
        wsComponent.resourceName = void 0;
      }
      wsComponent.fragment = void 0;
      return wsComponent;
    }
    function urnParse(urnComponent, options) {
      if (!urnComponent.path) {
        urnComponent.error = "URN can not be parsed";
        return urnComponent;
      }
      const matches = urnComponent.path.match(URN_REG);
      if (matches && matches[0] === urnComponent.path) {
        const scheme = options.scheme || urnComponent.scheme || "urn";
        urnComponent.nid = matches[1].toLowerCase();
        urnComponent.nss = matches[2];
        const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
        const schemeHandler = getSchemeHandler(urnScheme);
        urnComponent.path = void 0;
        if (schemeHandler) {
          urnComponent = schemeHandler.parse(urnComponent, options);
        }
      } else {
        urnComponent.error = urnComponent.error || "URN can not be parsed.";
      }
      return urnComponent;
    }
    function urnSerialize(urnComponent, options) {
      if (urnComponent.nid === void 0) {
        throw new Error("URN without nid cannot be serialized");
      }
      const scheme = options.scheme || urnComponent.scheme || "urn";
      const nid = urnComponent.nid.toLowerCase();
      const urnScheme = `${scheme}:${options.nid || nid}`;
      const schemeHandler = getSchemeHandler(urnScheme);
      if (schemeHandler) {
        urnComponent = schemeHandler.serialize(urnComponent, options);
      }
      const uriComponent = urnComponent;
      const nss = urnComponent.nss;
      uriComponent.path = `${nid || options.nid}:${nss}`;
      options.skipEscape = true;
      return uriComponent;
    }
    function urnuuidParse(urnComponent, options) {
      const uuidComponent = urnComponent;
      uuidComponent.uuid = uuidComponent.nss;
      uuidComponent.nss = void 0;
      if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
        uuidComponent.error = uuidComponent.error || "UUID is not valid.";
      }
      return uuidComponent;
    }
    function urnuuidSerialize(uuidComponent) {
      const urnComponent = uuidComponent;
      urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
      return urnComponent;
    }
    var http = (
      /** @type {SchemeHandler} */
      {
        scheme: "http",
        domainHost: true,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var https = (
      /** @type {SchemeHandler} */
      {
        scheme: "https",
        domainHost: http.domainHost,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var ws = (
      /** @type {SchemeHandler} */
      {
        scheme: "ws",
        domainHost: true,
        parse: wsParse,
        serialize: wsSerialize
      }
    );
    var wss = (
      /** @type {SchemeHandler} */
      {
        scheme: "wss",
        domainHost: ws.domainHost,
        parse: ws.parse,
        serialize: ws.serialize
      }
    );
    var urn = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn",
        parse: urnParse,
        serialize: urnSerialize,
        skipNormalize: true
      }
    );
    var urnuuid = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn:uuid",
        parse: urnuuidParse,
        serialize: urnuuidSerialize,
        skipNormalize: true
      }
    );
    var SCHEMES = (
      /** @type {Record<SchemeName, SchemeHandler>} */
      {
        http,
        https,
        ws,
        wss,
        urn,
        "urn:uuid": urnuuid
      }
    );
    Object.setPrototypeOf(SCHEMES, null);
    function getSchemeHandler(scheme) {
      return scheme && (SCHEMES[
        /** @type {SchemeName} */
        scheme
      ] || SCHEMES[
        /** @type {SchemeName} */
        scheme.toLowerCase()
      ]) || void 0;
    }
    module.exports = {
      wsIsSecure,
      SCHEMES,
      isValidSchemeName,
      getSchemeHandler
    };
  }
});

// ../../node_modules/.pnpm/fast-uri@3.1.7/node_modules/fast-uri/index.js
var require_fast_uri = __commonJS({
  "../../node_modules/.pnpm/fast-uri@3.1.7/node_modules/fast-uri/index.js"(exports, module) {
    "use strict";
    var { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, serializePathEncoding, normalizeQueryFragmentEncoding, encodeQuery, encodeFragment, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = require_utils();
    var { SCHEMES, getSchemeHandler } = require_schemes();
    var VALID_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*$/u;
    var MALFORMED_SCHEME_ERROR = "URI scheme is malformed.";
    function decodeValidScheme(scheme) {
      const decodedScheme = unescape(String(scheme));
      if (!VALID_SCHEME.test(decodedScheme)) {
        throw new TypeError(MALFORMED_SCHEME_ERROR);
      }
      return decodedScheme;
    }
    function normalize(uri, options) {
      if (typeof uri === "string") {
        uri = /** @type {T} */
        normalizeString(uri, options);
      } else if (typeof uri === "object") {
        uri = /** @type {T} */
        parse(serialize(uri, options), options);
      }
      return uri;
    }
    function resolve3(baseURI, relativeURI, options) {
      const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
      const {
        parsed: baseParsed,
        malformedAuthorityOrPort: baseMalformed,
        malformedPercentEncoding: baseMalformedPercentEncoding,
        malformedSchemeSpecific: baseMalformedSchemeSpecific,
        malformedHost: baseMalformedHost,
        malformedScheme: baseMalformedScheme
      } = parseWithStatus(baseURI, schemelessOptions);
      const {
        parsed: relativeParsed,
        malformedAuthorityOrPort: relativeMalformed,
        malformedPercentEncoding: relativeMalformedPercentEncoding,
        malformedSchemeSpecific: relativeMalformedSchemeSpecific,
        malformedHost: relativeMalformedHost,
        malformedScheme: relativeMalformedScheme
      } = parseWithStatus(relativeURI, schemelessOptions);
      if (baseMalformed || relativeMalformed || baseMalformedPercentEncoding || relativeMalformedPercentEncoding || baseMalformedSchemeSpecific || relativeMalformedSchemeSpecific || baseMalformedHost || relativeMalformedHost || baseMalformedScheme || relativeMalformedScheme) {
        throw new Error(baseParsed.error || relativeParsed.error || "URI is malformed.");
      }
      const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
      const resolvedSchemeHandler = getSchemeHandler(options && options.scheme || resolved.scheme);
      const resolvedHost = resolved.host;
      const resolvedHostIsIP = resolvedHost !== void 0 && resolvedHost !== "" && (isIPv4(resolvedHost) || normalizeIPv6(resolvedHost).isIPV6);
      canonicalizeHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP);
      const encodedASCIIHost = resolvedHost && resolvedHost.indexOf("%") !== -1 && !new RegExp("\\P{ASCII}", "u").test(resolvedHost);
      if (resolved.error && !encodedASCIIHost) {
        throw new Error(resolved.error);
      }
      schemelessOptions.skipEscape = true;
      return serialize(resolved, schemelessOptions);
    }
    function resolveComponent(base, relative3, options, skipNormalization) {
      const target = {};
      if (!skipNormalization) {
        base = parse(serialize(base, options), options);
        relative3 = parse(serialize(relative3, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative3.scheme) {
        target.scheme = relative3.scheme;
        target.userinfo = relative3.userinfo;
        target.host = relative3.host;
        target.port = relative3.port;
        target.path = removeDotSegments(relative3.path || "");
        target.query = relative3.query;
      } else {
        if (relative3.userinfo !== void 0 || relative3.host !== void 0 || relative3.port !== void 0) {
          target.userinfo = relative3.userinfo;
          target.host = relative3.host;
          target.port = relative3.port;
          target.path = removeDotSegments(relative3.path || "");
          target.query = relative3.query;
        } else {
          if (!relative3.path) {
            target.path = base.path;
            if (relative3.query !== void 0) {
              target.query = relative3.query;
            } else {
              target.query = base.query;
            }
          } else {
            if (relative3.path[0] === "/") {
              target.path = removeDotSegments(relative3.path);
            } else {
              if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
                target.path = "/" + relative3.path;
              } else if (!base.path) {
                target.path = relative3.path;
              } else {
                target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative3.path;
              }
              target.path = removeDotSegments(target.path);
            }
            target.query = relative3.query;
          }
          target.userinfo = base.userinfo;
          target.host = base.host;
          target.port = base.port;
        }
        target.scheme = base.scheme;
      }
      target.fragment = relative3.fragment;
      return target;
    }
    function equal(uriA, uriB, options) {
      const normalizedA = normalizeComparableURI(uriA, options);
      const normalizedB = normalizeComparableURI(uriB, options);
      return normalizedA !== void 0 && normalizedB !== void 0 && normalizedA === normalizedB;
    }
    function serialize(cmpts, opts) {
      const component = {
        host: cmpts.host,
        scheme: cmpts.scheme,
        userinfo: cmpts.userinfo,
        port: cmpts.port,
        path: cmpts.path,
        query: cmpts.query,
        nid: cmpts.nid,
        nss: cmpts.nss,
        uuid: cmpts.uuid,
        fragment: cmpts.fragment,
        reference: cmpts.reference,
        resourceName: cmpts.resourceName,
        secure: cmpts.secure,
        error: ""
      };
      const options = Object.assign({}, opts);
      const uriTokens = [];
      if (component.scheme) {
        component.scheme = decodeValidScheme(component.scheme);
      }
      const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
      const hasAuthority = component.userinfo !== void 0 || component.host !== void 0 || component.port !== void 0;
      const pathNoScheme = !options.skipEscape && component.scheme === void 0 && !hasAuthority;
      if (component.path !== void 0) {
        if (!options.skipEscape) {
          component.path = serializePathEncoding(component.path, pathNoScheme);
        } else {
          component.path = normalizePercentEncoding(component.path);
        }
      }
      if (options.reference !== "suffix" && component.scheme) {
        component.scheme = decodeValidScheme(component.scheme);
        uriTokens.push(component.scheme, ":");
      }
      const authority = recomposeAuthority(component);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (component.path && component.path[0] !== "/") {
          uriTokens.push("/");
        }
      }
      if (component.path !== void 0) {
        let s2 = component.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s2 = removeDotSegments(s2);
        }
        if (pathNoScheme) {
          s2 = serializePathEncoding(s2, true);
        }
        if (authority === void 0 && s2[0] === "/" && s2[1] === "/") {
          s2 = "/%2F" + s2.slice(2);
        }
        uriTokens.push(s2);
      }
      if (component.query !== void 0) {
        uriTokens.push("?", encodeQuery(component.query));
      }
      if (component.fragment !== void 0) {
        uriTokens.push("#", encodeFragment(component.fragment));
      }
      return uriTokens.join("");
    }
    var URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
    var AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;
    var AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;
    function getParseError(parsed, matches) {
      if (matches[2] !== void 0 && parsed.path && parsed.path[0] !== "/") {
        return 'URI path must start with "/" when authority is present.';
      }
      if (typeof parsed.port === "number" && (parsed.port < 0 || parsed.port > 65535)) {
        return "URI port is malformed.";
      }
      return void 0;
    }
    function hasMalformedPercentEncoding(component) {
      if (component === void 0) return false;
      let percent = component.indexOf("%");
      while (percent !== -1) {
        if (percent + 2 >= component.length || !/^[\da-f]{2}$/iu.test(component.slice(percent + 1, percent + 3))) {
          return true;
        }
        percent = component.indexOf("%", percent + 3);
      }
      return false;
    }
    function isIPLiteral(host) {
      return host[0] === "[" && host[host.length - 1] === "]";
    }
    function hasMalformedComponentPercentEncoding(matches) {
      const host = matches[4];
      return hasMalformedPercentEncoding(matches[3]) || host !== void 0 && !isIPLiteral(host) && hasMalformedPercentEncoding(host) || hasMalformedPercentEncoding(matches[6]) || hasMalformedPercentEncoding(matches[7]) || hasMalformedPercentEncoding(matches[8]);
    }
    function canonicalizeHost(parsed, options, schemeHandler, isIP) {
      if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport) && parsed.host && !isIPLiteral(parsed.host) && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
        try {
          parsed.host = new URL("http://" + parsed.host).hostname;
        } catch (e2) {
          parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e2;
          return true;
        }
      }
      return false;
    }
    function parseWithStatus(uri, opts) {
      const options = Object.assign({}, opts);
      const parsed = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0
      };
      let malformedAuthorityOrPort = false;
      let malformedPercentEncoding = false;
      let malformedSchemeSpecific = false;
      let malformedHost = false;
      let malformedIPLiteral = false;
      let malformedScheme = false;
      let isIP = false;
      if (options.reference === "suffix") {
        if (options.scheme) {
          uri = options.scheme + ":" + uri;
        } else {
          uri = "//" + uri;
        }
      }
      const authorityMatch = uri.match(AUTHORITY_PREFIX);
      if (authorityMatch !== null && authorityMatch[1].indexOf("\\") !== -1) {
        parsed.error = "URI authority must not contain a literal backslash.";
        malformedAuthorityOrPort = true;
      }
      const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
      if (introducerMatch !== null) {
        const region = introducerMatch[1];
        const normalizedRegion = region.replace(/[\t\n\r]/g, "");
        if (normalizedRegion.length >= 2) {
          if (normalizedRegion.slice(0, 2) !== "//") {
            parsed.error = parsed.error || "URI authority must not contain a literal backslash.";
            malformedAuthorityOrPort = true;
          } else if (region.length !== normalizedRegion.length) {
            parsed.error = parsed.error || "URI authority introducer must not contain whitespace.";
            malformedAuthorityOrPort = true;
          }
        }
      }
      const matches = uri.match(URI_PARSE);
      if (matches) {
        parsed.scheme = matches[1];
        parsed.userinfo = matches[3];
        parsed.host = matches[4];
        parsed.port = parseInt(matches[5], 10);
        parsed.path = matches[6] || "";
        parsed.query = matches[7];
        parsed.fragment = matches[8];
        if (parsed.scheme !== void 0) {
          const decodedScheme = unescape(parsed.scheme);
          if (VALID_SCHEME.test(decodedScheme)) {
            parsed.scheme = decodedScheme.toLowerCase();
          } else {
            parsed.error = parsed.error || MALFORMED_SCHEME_ERROR;
            malformedScheme = true;
          }
        }
        malformedPercentEncoding = hasMalformedComponentPercentEncoding(matches);
        if (malformedPercentEncoding) {
          parsed.error = parsed.error || "URI contains malformed percent-encoding.";
        }
        if (isNaN(parsed.port)) {
          parsed.port = matches[5];
        }
        const parseError = getParseError(parsed, matches);
        if (parseError !== void 0) {
          parsed.error = parsed.error || parseError;
          malformedAuthorityOrPort = true;
        }
        if (parsed.host) {
          const ipv4result = isIPv4(parsed.host);
          if (ipv4result === false) {
            const bracketedIPLiteral = isIPLiteral(parsed.host);
            const hasIPLiteralBracket = parsed.host.indexOf("[") !== -1 || parsed.host.indexOf("]") !== -1;
            const ipv6result = normalizeIPv6(parsed.host);
            isIP = ipv6result.isIPV6 || ipv6result.isIPVFuture === true;
            malformedIPLiteral = hasIPLiteralBracket && (!bracketedIPLiteral || ipv6result.error === true);
            parsed.host = isIP ? ipv6result.host : ipv6result.host.toLowerCase();
            if (malformedIPLiteral) {
              parsed.error = parsed.error || "URI host is malformed.";
              malformedAuthorityOrPort = true;
            }
          } else {
            isIP = true;
          }
        }
        if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) {
          parsed.reference = "same-document";
        } else if (parsed.scheme === void 0) {
          parsed.reference = "relative";
        } else if (parsed.fragment === void 0) {
          parsed.reference = "absolute";
        } else {
          parsed.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
          parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
        }
        const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
        if (!malformedIPLiteral) {
          malformedHost = canonicalizeHost(parsed, options, schemeHandler, isIP);
        }
        if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
          if (uri.indexOf("%") !== -1) {
            if (parsed.host !== void 0 && !malformedIPLiteral) {
              const host = isIP ? parsed.host : normalizePercentEncoding(parsed.host, true);
              parsed.host = reescapeHostDelimiters(host, isIP);
            }
          }
          if (parsed.path) {
            parsed.path = normalizePathEncoding(parsed.path);
          }
          if (parsed.query) {
            parsed.query = normalizeQueryFragmentEncoding(parsed.query);
          }
          if (parsed.fragment) {
            parsed.fragment = normalizeQueryFragmentEncoding(parsed.fragment);
          }
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(parsed, options);
          if (schemeHandler === SCHEMES.urn && parsed.nid === void 0) {
            malformedSchemeSpecific = true;
          }
        }
      } else {
        parsed.error = parsed.error || "URI can not be parsed.";
      }
      return { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme };
    }
    function parse(uri, opts) {
      return parseWithStatus(uri, opts).parsed;
    }
    function normalizeString(uri, opts) {
      return normalizeStringWithStatus(uri, opts).normalized;
    }
    function normalizeStringWithStatus(uri, opts) {
      const { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = parseWithStatus(uri, opts);
      return {
        normalized: malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? uri : serialize(parsed, opts),
        malformedAuthorityOrPort,
        malformedPercentEncoding,
        malformedSchemeSpecific,
        malformedHost,
        malformedScheme
      };
    }
    function normalizeComparableURI(uri, opts) {
      if (typeof uri !== "string" && typeof uri !== "object") {
        return void 0;
      }
      let value;
      try {
        value = typeof uri === "string" ? uri : serialize(uri, opts);
      } catch {
        return void 0;
      }
      const { normalized, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = normalizeStringWithStatus(value, opts);
      return malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? void 0 : normalized;
    }
    var fastUri = {
      SCHEMES,
      normalize,
      resolve: resolve3,
      resolveComponent,
      equal,
      serialize,
      parse
    };
    module.exports = fastUri;
    module.exports.default = fastUri;
    module.exports.fastUri = fastUri;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js
var require_uri = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var uri = require_fast_uri();
    uri.code = 'require("ajv/dist/runtime/uri").default';
    exports.default = uri;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js
var require_core = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
    var validate_1 = require_validate();
    Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    var ref_error_1 = require_ref_error();
    var rules_1 = require_rules();
    var compile_1 = require_compile();
    var codegen_2 = require_codegen();
    var resolve_1 = require_resolve();
    var dataType_1 = require_dataType();
    var util_1 = require_util();
    var $dataRefSchema = require_data();
    var uri_1 = require_uri();
    var defaultRegExp = (str, flags) => new RegExp(str, flags);
    defaultRegExp.code = "new RegExp";
    var META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
    var EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
      "validate",
      "serialize",
      "parse",
      "wrapper",
      "root",
      "schema",
      "keyword",
      "pattern",
      "formats",
      "validate$data",
      "func",
      "obj",
      "Error"
    ]);
    var removedOptions = {
      errorDataPath: "",
      format: "`validateFormats: false` can be used instead.",
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
      extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
      missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
      processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
      sourceCode: "Use option `code: {source: true}`",
      strictDefaults: "It is default now, see option `strict`.",
      strictKeywords: "It is default now, see option `strict`.",
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
      cache: "Map is used as cache, schema object as key.",
      serialize: "Map is used as cache, schema object as key.",
      ajvErrors: "It is default now."
    };
    var deprecatedOptions = {
      ignoreKeywordsWithRef: "",
      jsPropertySyntax: "",
      unicode: '"minLength"/"maxLength" account for unicode characters by default.'
    };
    var MAX_EXPRESSION = 200;
    function requiredOptions(o2) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
      const s2 = o2.strict;
      const _optz = (_a = o2.code) === null || _a === void 0 ? void 0 : _a.optimize;
      const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
      const regExp = (_c = (_b = o2.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
      const uriResolver = (_d = o2.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
      return {
        strictSchema: (_f = (_e = o2.strictSchema) !== null && _e !== void 0 ? _e : s2) !== null && _f !== void 0 ? _f : true,
        strictNumbers: (_h = (_g = o2.strictNumbers) !== null && _g !== void 0 ? _g : s2) !== null && _h !== void 0 ? _h : true,
        strictTypes: (_k = (_j = o2.strictTypes) !== null && _j !== void 0 ? _j : s2) !== null && _k !== void 0 ? _k : "log",
        strictTuples: (_m = (_l = o2.strictTuples) !== null && _l !== void 0 ? _l : s2) !== null && _m !== void 0 ? _m : "log",
        strictRequired: (_p = (_o = o2.strictRequired) !== null && _o !== void 0 ? _o : s2) !== null && _p !== void 0 ? _p : false,
        code: o2.code ? { ...o2.code, optimize, regExp } : { optimize, regExp },
        loopRequired: (_q = o2.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
        loopEnum: (_r = o2.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
        meta: (_s = o2.meta) !== null && _s !== void 0 ? _s : true,
        messages: (_t = o2.messages) !== null && _t !== void 0 ? _t : true,
        inlineRefs: (_u = o2.inlineRefs) !== null && _u !== void 0 ? _u : true,
        schemaId: (_v = o2.schemaId) !== null && _v !== void 0 ? _v : "$id",
        addUsedSchema: (_w = o2.addUsedSchema) !== null && _w !== void 0 ? _w : true,
        validateSchema: (_x = o2.validateSchema) !== null && _x !== void 0 ? _x : true,
        validateFormats: (_y = o2.validateFormats) !== null && _y !== void 0 ? _y : true,
        unicodeRegExp: (_z = o2.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
        int32range: (_0 = o2.int32range) !== null && _0 !== void 0 ? _0 : true,
        uriResolver
      };
    }
    var Ajv = class {
      constructor(opts = {}) {
        this.schemas = {};
        this.refs = {};
        this.formats = /* @__PURE__ */ Object.create(null);
        this._compilations = /* @__PURE__ */ new Set();
        this._loading = {};
        this._cache = /* @__PURE__ */ new Map();
        opts = this.opts = { ...opts, ...requiredOptions(opts) };
        const { es5, lines } = this.opts.code;
        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
        this.logger = getLogger(opts.logger);
        const formatOpt = opts.validateFormats;
        opts.validateFormats = false;
        this.RULES = (0, rules_1.getRules)();
        checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
        checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
        this._metaOpts = getMetaSchemaOptions.call(this);
        if (opts.formats)
          addInitialFormats.call(this);
        this._addVocabularies();
        this._addDefaultMetaSchema();
        if (opts.keywords)
          addInitialKeywords.call(this, opts.keywords);
        if (typeof opts.meta == "object")
          this.addMetaSchema(opts.meta);
        addInitialSchemas.call(this);
        opts.validateFormats = formatOpt;
      }
      _addVocabularies() {
        this.addKeyword("$async");
      }
      _addDefaultMetaSchema() {
        const { $data, meta, schemaId } = this.opts;
        let _dataRefSchema = $dataRefSchema;
        if (schemaId === "id") {
          _dataRefSchema = { ...$dataRefSchema };
          _dataRefSchema.id = _dataRefSchema.$id;
          delete _dataRefSchema.$id;
        }
        if (meta && $data)
          this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
      }
      defaultMeta() {
        const { meta, schemaId } = this.opts;
        return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
      }
      validate(schemaKeyRef, data) {
        let v2;
        if (typeof schemaKeyRef == "string") {
          v2 = this.getSchema(schemaKeyRef);
          if (!v2)
            throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
        } else {
          v2 = this.compile(schemaKeyRef);
        }
        const valid = v2(data);
        if (!("$async" in v2))
          this.errors = v2.errors;
        return valid;
      }
      compile(schema, _meta) {
        const sch = this._addSchema(schema, _meta);
        return sch.validate || this._compileSchemaEnv(sch);
      }
      compileAsync(schema, meta) {
        if (typeof this.opts.loadSchema != "function") {
          throw new Error("options.loadSchema should be a function");
        }
        const { loadSchema } = this.opts;
        return runCompileAsync.call(this, schema, meta);
        async function runCompileAsync(_schema, _meta) {
          await loadMetaSchema.call(this, _schema.$schema);
          const sch = this._addSchema(_schema, _meta);
          return sch.validate || _compileAsync.call(this, sch);
        }
        async function loadMetaSchema($ref) {
          if ($ref && !this.getSchema($ref)) {
            await runCompileAsync.call(this, { $ref }, true);
          }
        }
        async function _compileAsync(sch) {
          try {
            return this._compileSchemaEnv(sch);
          } catch (e2) {
            if (!(e2 instanceof ref_error_1.default))
              throw e2;
            checkLoaded.call(this, e2);
            await loadMissingSchema.call(this, e2.missingSchema);
            return _compileAsync.call(this, sch);
          }
        }
        function checkLoaded({ missingSchema: ref, missingRef }) {
          if (this.refs[ref]) {
            throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
          }
        }
        async function loadMissingSchema(ref) {
          const _schema = await _loadSchema.call(this, ref);
          if (!this.refs[ref])
            await loadMetaSchema.call(this, _schema.$schema);
          if (!this.refs[ref])
            this.addSchema(_schema, ref, meta);
        }
        async function _loadSchema(ref) {
          const p2 = this._loading[ref];
          if (p2)
            return p2;
          try {
            return await (this._loading[ref] = loadSchema(ref));
          } finally {
            delete this._loading[ref];
          }
        }
      }
      // Adds schema to the instance
      addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
        if (Array.isArray(schema)) {
          for (const sch of schema)
            this.addSchema(sch, void 0, _meta, _validateSchema);
          return this;
        }
        let id;
        if (typeof schema === "object") {
          const { schemaId } = this.opts;
          id = schema[schemaId];
          if (id !== void 0 && typeof id != "string") {
            throw new Error(`schema ${schemaId} must be string`);
          }
        }
        key = (0, resolve_1.normalizeId)(key || id);
        this._checkUnique(key);
        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
        return this;
      }
      // Add schema that will be used to validate other schemas
      // options in META_IGNORE_OPTIONS are alway set to false
      addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
        this.addSchema(schema, key, true, _validateSchema);
        return this;
      }
      //  Validate schema against its meta-schema
      validateSchema(schema, throwOrLogError) {
        if (typeof schema == "boolean")
          return true;
        let $schema;
        $schema = schema.$schema;
        if ($schema !== void 0 && typeof $schema != "string") {
          throw new Error("$schema must be a string");
        }
        $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
        if (!$schema) {
          this.logger.warn("meta-schema not available");
          this.errors = null;
          return true;
        }
        const valid = this.validate($schema, schema);
        if (!valid && throwOrLogError) {
          const message = "schema is invalid: " + this.errorsText();
          if (this.opts.validateSchema === "log")
            this.logger.error(message);
          else
            throw new Error(message);
        }
        return valid;
      }
      // Get compiled schema by `key` or `ref`.
      // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
      getSchema(keyRef) {
        let sch;
        while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
          keyRef = sch;
        if (sch === void 0) {
          const { schemaId } = this.opts;
          const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
          sch = compile_1.resolveSchema.call(this, root, keyRef);
          if (!sch)
            return;
          this.refs[keyRef] = sch;
        }
        return sch.validate || this._compileSchemaEnv(sch);
      }
      // Remove cached schema(s).
      // If no parameter is passed all schemas but meta-schemas are removed.
      // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
      // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
      removeSchema(schemaKeyRef) {
        if (schemaKeyRef instanceof RegExp) {
          this._removeAllSchemas(this.schemas, schemaKeyRef);
          this._removeAllSchemas(this.refs, schemaKeyRef);
          return this;
        }
        switch (typeof schemaKeyRef) {
          case "undefined":
            this._removeAllSchemas(this.schemas);
            this._removeAllSchemas(this.refs);
            this._cache.clear();
            return this;
          case "string": {
            const sch = getSchEnv.call(this, schemaKeyRef);
            if (typeof sch == "object")
              this._cache.delete(sch.schema);
            delete this.schemas[schemaKeyRef];
            delete this.refs[schemaKeyRef];
            return this;
          }
          case "object": {
            const cacheKey = schemaKeyRef;
            this._cache.delete(cacheKey);
            let id = schemaKeyRef[this.opts.schemaId];
            if (id) {
              id = (0, resolve_1.normalizeId)(id);
              delete this.schemas[id];
              delete this.refs[id];
            }
            return this;
          }
          default:
            throw new Error("ajv.removeSchema: invalid parameter");
        }
      }
      // add "vocabulary" - a collection of keywords
      addVocabulary(definitions2) {
        for (const def of definitions2)
          this.addKeyword(def);
        return this;
      }
      addKeyword(kwdOrDef, def) {
        let keyword;
        if (typeof kwdOrDef == "string") {
          keyword = kwdOrDef;
          if (typeof def == "object") {
            this.logger.warn("these parameters are deprecated, see docs for addKeyword");
            def.keyword = keyword;
          }
        } else if (typeof kwdOrDef == "object" && def === void 0) {
          def = kwdOrDef;
          keyword = def.keyword;
          if (Array.isArray(keyword) && !keyword.length) {
            throw new Error("addKeywords: keyword must be string or non-empty array");
          }
        } else {
          throw new Error("invalid addKeywords parameters");
        }
        checkKeyword.call(this, keyword, def);
        if (!def) {
          (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
          return this;
        }
        keywordMetaschema.call(this, def);
        const definition = {
          ...def,
          type: (0, dataType_1.getJSONTypes)(def.type),
          schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
        };
        (0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t2) => addRule.call(this, k, definition, t2)));
        return this;
      }
      getKeyword(keyword) {
        const rule = this.RULES.all[keyword];
        return typeof rule == "object" ? rule.definition : !!rule;
      }
      // Remove keyword
      removeKeyword(keyword) {
        const { RULES } = this;
        delete RULES.keywords[keyword];
        delete RULES.all[keyword];
        for (const group of RULES.rules) {
          const i2 = group.rules.findIndex((rule) => rule.keyword === keyword);
          if (i2 >= 0)
            group.rules.splice(i2, 1);
        }
        return this;
      }
      // Add format
      addFormat(name, format) {
        if (typeof format == "string")
          format = new RegExp(format);
        this.formats[name] = format;
        return this;
      }
      errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
        if (!errors || errors.length === 0)
          return "No errors";
        return errors.map((e2) => `${dataVar}${e2.instancePath} ${e2.message}`).reduce((text, msg) => text + separator + msg);
      }
      $dataMetaSchema(metaSchema, keywordsJsonPointers) {
        const rules = this.RULES.all;
        metaSchema = JSON.parse(JSON.stringify(metaSchema));
        for (const jsonPointer of keywordsJsonPointers) {
          const segments = jsonPointer.split("/").slice(1);
          let keywords = metaSchema;
          for (const seg of segments)
            keywords = keywords[seg];
          for (const key in rules) {
            const rule = rules[key];
            if (typeof rule != "object")
              continue;
            const { $data } = rule.definition;
            const schema = keywords[key];
            if ($data && schema)
              keywords[key] = schemaOrData(schema);
          }
        }
        return metaSchema;
      }
      _removeAllSchemas(schemas, regex) {
        for (const keyRef in schemas) {
          const sch = schemas[keyRef];
          if (!regex || regex.test(keyRef)) {
            if (typeof sch == "string") {
              delete schemas[keyRef];
            } else if (sch && !sch.meta) {
              this._cache.delete(sch.schema);
              delete schemas[keyRef];
            }
          }
        }
      }
      _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
        let id;
        const { schemaId } = this.opts;
        if (typeof schema == "object") {
          id = schema[schemaId];
        } else {
          if (this.opts.jtd)
            throw new Error("schema must be object");
          else if (typeof schema != "boolean")
            throw new Error("schema must be object or boolean");
        }
        let sch = this._cache.get(schema);
        if (sch !== void 0)
          return sch;
        baseId = (0, resolve_1.normalizeId)(id || baseId);
        const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
        sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
        this._cache.set(sch.schema, sch);
        if (addSchema && !baseId.startsWith("#")) {
          if (baseId)
            this._checkUnique(baseId);
          this.refs[baseId] = sch;
        }
        if (validateSchema)
          this.validateSchema(schema, true);
        return sch;
      }
      _checkUnique(id) {
        if (this.schemas[id] || this.refs[id]) {
          throw new Error(`schema with key or id "${id}" already exists`);
        }
      }
      _compileSchemaEnv(sch) {
        if (sch.meta)
          this._compileMetaSchema(sch);
        else
          compile_1.compileSchema.call(this, sch);
        if (!sch.validate)
          throw new Error("ajv implementation error");
        return sch.validate;
      }
      _compileMetaSchema(sch) {
        const currentOpts = this.opts;
        this.opts = this._metaOpts;
        try {
          compile_1.compileSchema.call(this, sch);
        } finally {
          this.opts = currentOpts;
        }
      }
    };
    Ajv.ValidationError = validation_error_1.default;
    Ajv.MissingRefError = ref_error_1.default;
    exports.default = Ajv;
    function checkOptions(checkOpts, options, msg, log = "error") {
      for (const key in checkOpts) {
        const opt = key;
        if (opt in options)
          this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
      }
    }
    function getSchEnv(keyRef) {
      keyRef = (0, resolve_1.normalizeId)(keyRef);
      return this.schemas[keyRef] || this.refs[keyRef];
    }
    function addInitialSchemas() {
      const optsSchemas = this.opts.schemas;
      if (!optsSchemas)
        return;
      if (Array.isArray(optsSchemas))
        this.addSchema(optsSchemas);
      else
        for (const key in optsSchemas)
          this.addSchema(optsSchemas[key], key);
    }
    function addInitialFormats() {
      for (const name in this.opts.formats) {
        const format = this.opts.formats[name];
        if (format)
          this.addFormat(name, format);
      }
    }
    function addInitialKeywords(defs) {
      if (Array.isArray(defs)) {
        this.addVocabulary(defs);
        return;
      }
      this.logger.warn("keywords option as map is deprecated, pass array");
      for (const keyword in defs) {
        const def = defs[keyword];
        if (!def.keyword)
          def.keyword = keyword;
        this.addKeyword(def);
      }
    }
    function getMetaSchemaOptions() {
      const metaOpts = { ...this.opts };
      for (const opt of META_IGNORE_OPTIONS)
        delete metaOpts[opt];
      return metaOpts;
    }
    var noLogs = { log() {
    }, warn() {
    }, error() {
    } };
    function getLogger(logger) {
      if (logger === false)
        return noLogs;
      if (logger === void 0)
        return console;
      if (logger.log && logger.warn && logger.error)
        return logger;
      throw new Error("logger must implement log, warn and error methods");
    }
    var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
    function checkKeyword(keyword, def) {
      const { RULES } = this;
      (0, util_1.eachItem)(keyword, (kwd) => {
        if (RULES.keywords[kwd])
          throw new Error(`Keyword ${kwd} is already defined`);
        if (!KEYWORD_NAME.test(kwd))
          throw new Error(`Keyword ${kwd} has invalid name`);
      });
      if (!def)
        return;
      if (def.$data && !("code" in def || "validate" in def)) {
        throw new Error('$data keyword must have "code" or "validate" function');
      }
    }
    function addRule(keyword, definition, dataType) {
      var _a;
      const post2 = definition === null || definition === void 0 ? void 0 : definition.post;
      if (dataType && post2)
        throw new Error('keyword with "post" flag cannot have "type"');
      const { RULES } = this;
      let ruleGroup = post2 ? RULES.post : RULES.rules.find(({ type: t2 }) => t2 === dataType);
      if (!ruleGroup) {
        ruleGroup = { type: dataType, rules: [] };
        RULES.rules.push(ruleGroup);
      }
      RULES.keywords[keyword] = true;
      if (!definition)
        return;
      const rule = {
        keyword,
        definition: {
          ...definition,
          type: (0, dataType_1.getJSONTypes)(definition.type),
          schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
        }
      };
      if (definition.before)
        addBeforeRule.call(this, ruleGroup, rule, definition.before);
      else
        ruleGroup.rules.push(rule);
      RULES.all[keyword] = rule;
      (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
    }
    function addBeforeRule(ruleGroup, rule, before) {
      const i2 = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
      if (i2 >= 0) {
        ruleGroup.rules.splice(i2, 0, rule);
      } else {
        ruleGroup.rules.push(rule);
        this.logger.warn(`rule ${before} is not defined`);
      }
    }
    function keywordMetaschema(def) {
      let { metaSchema } = def;
      if (metaSchema === void 0)
        return;
      if (def.$data && this.opts.$data)
        metaSchema = schemaOrData(metaSchema);
      def.validateSchema = this.compile(metaSchema, true);
    }
    var $dataRef = {
      $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
    };
    function schemaOrData(schema) {
      return { anyOf: [schema, $dataRef] };
    }
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/id.js
var require_id = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/id.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var def = {
      keyword: "id",
      code() {
        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/ref.js
var require_ref = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/ref.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.callRef = exports.getValidate = void 0;
    var ref_error_1 = require_ref_error();
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var util_1 = require_util();
    var def = {
      keyword: "$ref",
      schemaType: "string",
      code(cxt) {
        const { gen, schema: $ref, it } = cxt;
        const { baseId, schemaEnv: env, validateName, opts, self } = it;
        const { root } = env;
        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
          return callRootRef();
        const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
        if (schOrEnv === void 0)
          throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
        if (schOrEnv instanceof compile_1.SchemaEnv)
          return callValidate(schOrEnv);
        return inlineRefSchema(schOrEnv);
        function callRootRef() {
          if (env === root)
            return callRef(cxt, validateName, env, env.$async);
          const rootName = gen.scopeValue("root", { ref: root });
          return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
        }
        function callValidate(sch) {
          const v2 = getValidate(cxt, sch);
          callRef(cxt, v2, sch, sch.$async);
        }
        function inlineRefSchema(sch) {
          const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
          const valid = gen.name("valid");
          const schCxt = cxt.subschema({
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref
          }, valid);
          cxt.mergeEvaluated(schCxt);
          cxt.ok(valid);
        }
      }
    };
    function getValidate(cxt, sch) {
      const { gen } = cxt;
      return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
    }
    exports.getValidate = getValidate;
    function callRef(cxt, v2, sch, $async) {
      const { gen, it } = cxt;
      const { allErrors, schemaEnv: env, opts } = it;
      const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
      if ($async)
        callAsyncRef();
      else
        callSyncRef();
      function callAsyncRef() {
        if (!env.$async)
          throw new Error("async schema referenced by sync schema");
        const valid = gen.let("valid");
        gen.try(() => {
          gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v2, passCxt)}`);
          addEvaluatedFrom(v2);
          if (!allErrors)
            gen.assign(valid, true);
        }, (e2) => {
          gen.if((0, codegen_1._)`!(${e2} instanceof ${it.ValidationError})`, () => gen.throw(e2));
          addErrorsFrom(e2);
          if (!allErrors)
            gen.assign(valid, false);
        });
        cxt.ok(valid);
      }
      function callSyncRef() {
        cxt.result((0, code_1.callValidateCode)(cxt, v2, passCxt), () => addEvaluatedFrom(v2), () => addErrorsFrom(v2));
      }
      function addErrorsFrom(source) {
        const errs = (0, codegen_1._)`${source}.errors`;
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
        gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
      }
      function addEvaluatedFrom(source) {
        var _a;
        if (!it.opts.unevaluated)
          return;
        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
        if (it.props !== true) {
          if (schEvaluated && !schEvaluated.dynamicProps) {
            if (schEvaluated.props !== void 0) {
              it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
            }
          } else {
            const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
            it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
          }
        }
        if (it.items !== true) {
          if (schEvaluated && !schEvaluated.dynamicItems) {
            if (schEvaluated.items !== void 0) {
              it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
            }
          } else {
            const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
            it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
          }
        }
      }
    }
    exports.callRef = callRef;
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/index.js
var require_core2 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var id_1 = require_id();
    var ref_1 = require_ref();
    var core = [
      "$schema",
      "$id",
      "$defs",
      "$vocabulary",
      { keyword: "$comment" },
      "definitions",
      id_1.default,
      ref_1.default
    ];
    exports.default = core;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitNumber.js
var require_limitNumber = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitNumber.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    var def = {
      keyword: Object.keys(KWDs),
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/multipleOf.js
var require_multipleOf = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/multipleOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
    };
    var def = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, it } = cxt;
        const prec = it.opts.multipleOfPrecision;
        const res = gen.let("res");
        const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
        cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/ucs2length.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitLength.js
var require_limitLength = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitLength.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var ucs2length_1 = require_ucs2length();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxLength" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode, it } = cxt;
        const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
        const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
        cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/pattern.js
var require_pattern = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/pattern.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var util_1 = require_util();
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
    };
    var def = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const u2 = it.opts.unicodeRegExp ? "u" : "";
        if ($data) {
          const { regExp } = it.opts.code;
          const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._)`new RegExp` : (0, util_1.useFunc)(gen, regExp);
          const valid = gen.let("valid");
          gen.try(() => gen.assign(valid, (0, codegen_1._)`${regExpCode}(${schemaCode}, ${u2}).test(${data})`), () => gen.assign(valid, false));
          cxt.fail$data((0, codegen_1._)`!${valid}`);
        } else {
          const regExp = (0, code_1.usePattern)(cxt, schema);
          cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitProperties.js
var require_limitProperties = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/required.js
var require_required = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/required.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
    };
    var def = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, schema, schemaCode, data, $data, it } = cxt;
        const { opts } = it;
        if (!$data && schema.length === 0)
          return;
        const useLoop = schema.length >= opts.loopRequired;
        if (it.allErrors)
          allErrorsMode();
        else
          exitOnErrorMode();
        if (opts.strictRequired) {
          const props = cxt.parentSchema.properties;
          const { definedProperties } = cxt.it;
          for (const requiredKey of schema) {
            if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
              const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
              const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
              (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
            }
          }
        }
        function allErrorsMode() {
          if (useLoop || $data) {
            cxt.block$data(codegen_1.nil, loopAllRequired);
          } else {
            for (const prop of schema) {
              (0, code_1.checkReportMissingProp)(cxt, prop);
            }
          }
        }
        function exitOnErrorMode() {
          const missing = gen.let("missing");
          if (useLoop || $data) {
            const valid = gen.let("valid", true);
            cxt.block$data(valid, () => loopUntilMissing(missing, valid));
            cxt.ok(valid);
          } else {
            gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
            (0, code_1.reportMissingProp)(cxt, missing);
            gen.else();
          }
        }
        function loopAllRequired() {
          gen.forOf("prop", schemaCode, (prop) => {
            cxt.setParams({ missingProperty: prop });
            gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
          });
        }
        function loopUntilMissing(missing, valid) {
          cxt.setParams({ missingProperty: missing });
          gen.forOf(missing, schemaCode, () => {
            gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.error();
              gen.break();
            });
          }, codegen_1.nil);
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitItems.js
var require_limitItems = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxItems" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/equal.js
var require_equal = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/equal.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var equal = require_fast_deep_equal();
    equal.code = 'require("ajv/dist/runtime/equal").default';
    exports.default = equal;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js
var require_uniqueItems = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dataType_1 = require_dataType();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: ({ params: { i: i2, j: j2 } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j2} and ${i2} are identical)`,
      params: ({ params: { i: i2, j: j2 } }) => (0, codegen_1._)`{i: ${i2}, j: ${j2}}`
    };
    var def = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
        if (!$data && !schema)
          return;
        const valid = gen.let("valid");
        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
        cxt.ok(valid);
        function validateUniqueItems() {
          const i2 = gen.let("i", (0, codegen_1._)`${data}.length`);
          const j2 = gen.let("j");
          cxt.setParams({ i: i2, j: j2 });
          gen.assign(valid, true);
          gen.if((0, codegen_1._)`${i2} > 1`, () => (canOptimize() ? loopN : loopN2)(i2, j2));
        }
        function canOptimize() {
          return itemTypes.length > 0 && !itemTypes.some((t2) => t2 === "object" || t2 === "array");
        }
        function loopN(i2, j2) {
          const item = gen.name("item");
          const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
          const indices = gen.const("indices", (0, codegen_1._)`{}`);
          gen.for((0, codegen_1._)`;${i2}--;`, () => {
            gen.let(item, (0, codegen_1._)`${data}[${i2}]`);
            gen.if(wrongType, (0, codegen_1._)`continue`);
            if (itemTypes.length > 1)
              gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
            gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j2, (0, codegen_1._)`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            }).code((0, codegen_1._)`${indices}[${item}] = ${i2}`);
          });
        }
        function loopN2(i2, j2) {
          const eql = (0, util_1.useFunc)(gen, equal_1.default);
          const outer = gen.name("outer");
          gen.label(outer).for((0, codegen_1._)`;${i2}--;`, () => gen.for((0, codegen_1._)`${j2} = ${i2}; ${j2}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i2}], ${data}[${j2}])`, () => {
            cxt.error();
            gen.assign(valid, false).break(outer);
          })));
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/const.js
var require_const = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/const.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to constant",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
    };
    var def = {
      keyword: "const",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schemaCode, schema } = cxt;
        if ($data || schema && typeof schema == "object") {
          cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
        } else {
          cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/enum.js
var require_enum = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/enum.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
    };
    var def = {
      keyword: "enum",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        if (!$data && schema.length === 0)
          throw new Error("enum must have non-empty array");
        const useLoop = schema.length >= it.opts.loopEnum;
        let eql;
        const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
        let valid;
        if (useLoop || $data) {
          valid = gen.let("valid");
          cxt.block$data(valid, loopEnum);
        } else {
          if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
          const vSchema = gen.const("vSchema", schemaCode);
          valid = (0, codegen_1.or)(...schema.map((_x, i2) => equalCode(vSchema, i2)));
        }
        cxt.pass(valid);
        function loopEnum() {
          gen.assign(valid, false);
          gen.forOf("v", schemaCode, (v2) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v2})`, () => gen.assign(valid, true).break()));
        }
        function equalCode(vSchema, i2) {
          const sch = schema[i2];
          return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i2}])` : (0, codegen_1._)`${data} === ${sch}`;
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js
var require_validation = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var limitNumber_1 = require_limitNumber();
    var multipleOf_1 = require_multipleOf();
    var limitLength_1 = require_limitLength();
    var pattern_1 = require_pattern();
    var limitProperties_1 = require_limitProperties();
    var required_1 = require_required();
    var limitItems_1 = require_limitItems();
    var uniqueItems_1 = require_uniqueItems();
    var const_1 = require_const();
    var enum_1 = require_enum();
    var validation = [
      // number
      limitNumber_1.default,
      multipleOf_1.default,
      // string
      limitLength_1.default,
      pattern_1.default,
      // object
      limitProperties_1.default,
      required_1.default,
      // array
      limitItems_1.default,
      uniqueItems_1.default,
      // any
      { keyword: "type", schemaType: ["string", "array"] },
      { keyword: "nullable", schemaType: "boolean" },
      const_1.default,
      enum_1.default
    ];
    exports.default = validation;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/additionalItems.js
var require_additionalItems = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/additionalItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateAdditionalItems = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { parentSchema, it } = cxt;
        const { items } = parentSchema;
        if (!Array.isArray(items)) {
          (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
          return;
        }
        validateAdditionalItems(cxt, items);
      }
    };
    function validateAdditionalItems(cxt, items) {
      const { gen, schema, data, keyword, it } = cxt;
      it.items = true;
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      if (schema === false) {
        cxt.setParams({ len: items.length });
        cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
      } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
        const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
        gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
        cxt.ok(valid);
      }
      function validateItems(valid) {
        gen.forRange("i", items.length, len, (i2) => {
          cxt.subschema({ keyword, dataProp: i2, dataPropType: util_1.Type.Num }, valid);
          if (!it.allErrors)
            gen.if((0, codegen_1.not)(valid), () => gen.break());
        });
      }
    }
    exports.validateAdditionalItems = validateAdditionalItems;
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/items.js
var require_items = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/items.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateTuple = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(cxt) {
        const { schema, it } = cxt;
        if (Array.isArray(schema))
          return validateTuple(cxt, "additionalItems", schema);
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    function validateTuple(cxt, extraItems, schArr = cxt.schema) {
      const { gen, parentSchema, data, keyword, it } = cxt;
      checkStrictTuple(parentSchema);
      if (it.opts.unevaluated && schArr.length && it.items !== true) {
        it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
      }
      const valid = gen.name("valid");
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      schArr.forEach((sch, i2) => {
        if ((0, util_1.alwaysValidSchema)(it, sch))
          return;
        gen.if((0, codegen_1._)`${len} > ${i2}`, () => cxt.subschema({
          keyword,
          schemaProp: i2,
          dataProp: i2
        }, valid));
        cxt.ok(valid);
      });
      function checkStrictTuple(sch) {
        const { opts, errSchemaPath } = it;
        const l2 = schArr.length;
        const fullTuple = l2 === sch.minItems && (l2 === sch.maxItems || sch[extraItems] === false);
        if (opts.strictTuples && !fullTuple) {
          const msg = `"${keyword}" is ${l2}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
          (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
        }
      }
    }
    exports.validateTuple = validateTuple;
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/prefixItems.js
var require_prefixItems = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/prefixItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var items_1 = require_items();
    var def = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/items2020.js
var require_items2020 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/items2020.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var additionalItems_1 = require_additionalItems();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { schema, parentSchema, it } = cxt;
        const { prefixItems } = parentSchema;
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        if (prefixItems)
          (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
        else
          cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/contains.js
var require_contains = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/contains.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
    };
    var def = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        let min;
        let max;
        const { minContains, maxContains } = parentSchema;
        if (it.opts.next) {
          min = minContains === void 0 ? 1 : minContains;
          max = maxContains;
        } else {
          min = 1;
        }
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        cxt.setParams({ min, max });
        if (max === void 0 && min === 0) {
          (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
          return;
        }
        if (max !== void 0 && min > max) {
          (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
          cxt.fail();
          return;
        }
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          let cond = (0, codegen_1._)`${len} >= ${min}`;
          if (max !== void 0)
            cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
          cxt.pass(cond);
          return;
        }
        it.items = true;
        const valid = gen.name("valid");
        if (max === void 0 && min === 1) {
          validateItems(valid, () => gen.if(valid, () => gen.break()));
        } else if (min === 0) {
          gen.let(valid, true);
          if (max !== void 0)
            gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
        } else {
          gen.let(valid, false);
          validateItemsWithCount();
        }
        cxt.result(valid, () => cxt.reset());
        function validateItemsWithCount() {
          const schValid = gen.name("_valid");
          const count = gen.let("count", 0);
          validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
        }
        function validateItems(_valid, block) {
          gen.forRange("i", 0, len, (i2) => {
            cxt.subschema({
              keyword: "contains",
              dataProp: i2,
              dataPropType: util_1.Type.Num,
              compositeRule: true
            }, _valid);
            block();
          });
        }
        function checkLimits(count) {
          gen.code((0, codegen_1._)`${count}++`);
          if (max === void 0) {
            gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
          } else {
            gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
            if (min === 1)
              gen.assign(valid, true);
            else
              gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
          }
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/dependencies.js
var require_dependencies = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/dependencies.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    exports.error = {
      message: ({ params: { property, depsCount, deps } }) => {
        const property_ies = depsCount === 1 ? "property" : "properties";
        return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
      },
      params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
      // TODO change to reference
    };
    var def = {
      keyword: "dependencies",
      type: "object",
      schemaType: "object",
      error: exports.error,
      code(cxt) {
        const [propDeps, schDeps] = splitDependencies(cxt);
        validatePropertyDeps(cxt, propDeps);
        validateSchemaDeps(cxt, schDeps);
      }
    };
    function splitDependencies({ schema }) {
      const propertyDeps = {};
      const schemaDeps = {};
      for (const key in schema) {
        if (key === "__proto__")
          continue;
        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
        deps[key] = schema[key];
      }
      return [propertyDeps, schemaDeps];
    }
    function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
      const { gen, data, it } = cxt;
      if (Object.keys(propertyDeps).length === 0)
        return;
      const missing = gen.let("missing");
      for (const prop in propertyDeps) {
        const deps = propertyDeps[prop];
        if (deps.length === 0)
          continue;
        const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
        cxt.setParams({
          property: prop,
          depsCount: deps.length,
          deps: deps.join(", ")
        });
        if (it.allErrors) {
          gen.if(hasProperty, () => {
            for (const depProp of deps) {
              (0, code_1.checkReportMissingProp)(cxt, depProp);
            }
          });
        } else {
          gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
          (0, code_1.reportMissingProp)(cxt, missing);
          gen.else();
        }
      }
    }
    exports.validatePropertyDeps = validatePropertyDeps;
    function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      for (const prop in schemaDeps) {
        if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
          continue;
        gen.if(
          (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
          () => {
            const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
            cxt.mergeValidEvaluated(schCxt, valid);
          },
          () => gen.var(valid, true)
          // TODO var
        );
        cxt.ok(valid);
      }
    }
    exports.validateSchemaDeps = validateSchemaDeps;
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/propertyNames.js
var require_propertyNames = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/propertyNames.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "property name must be valid",
      params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
    };
    var def = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        const valid = gen.name("valid");
        gen.forIn("key", data, (key) => {
          cxt.setParams({ propertyName: key });
          cxt.subschema({
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true
          }, valid);
          gen.if((0, codegen_1.not)(valid), () => {
            cxt.error(true);
            if (!it.allErrors)
              gen.break();
          });
        });
        cxt.ok(valid);
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js
var require_additionalProperties = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var util_1 = require_util();
    var error = {
      message: "must NOT have additional properties",
      params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
    };
    var def = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: true,
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, opts } = it;
        it.props = true;
        if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema))
          return;
        const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
        const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
        checkAdditionalProperties();
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function checkAdditionalProperties() {
          gen.forIn("key", data, (key) => {
            if (!props.length && !patProps.length)
              additionalPropertyCode(key);
            else
              gen.if(isAdditional(key), () => additionalPropertyCode(key));
          });
        }
        function isAdditional(key) {
          let definedProp;
          if (props.length > 8) {
            const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
            definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
          } else if (props.length) {
            definedProp = (0, codegen_1.or)(...props.map((p2) => (0, codegen_1._)`${key} === ${p2}`));
          } else {
            definedProp = codegen_1.nil;
          }
          if (patProps.length) {
            definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p2) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p2)}.test(${key})`));
          }
          return (0, codegen_1.not)(definedProp);
        }
        function deleteAdditional(key) {
          gen.code((0, codegen_1._)`delete ${data}[${key}]`);
        }
        function additionalPropertyCode(key) {
          if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
            deleteAdditional(key);
            return;
          }
          if (schema === false) {
            cxt.setParams({ additionalProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            if (opts.removeAdditional === "failing") {
              applyAdditionalSchema(key, valid, false);
              gen.if((0, codegen_1.not)(valid), () => {
                cxt.reset();
                deleteAdditional(key);
              });
            } else {
              applyAdditionalSchema(key, valid);
              if (!allErrors)
                gen.if((0, codegen_1.not)(valid), () => gen.break());
            }
          }
        }
        function applyAdditionalSchema(key, valid, errors) {
          const subschema = {
            keyword: "additionalProperties",
            dataProp: key,
            dataPropType: util_1.Type.Str
          };
          if (errors === false) {
            Object.assign(subschema, {
              compositeRule: true,
              createErrors: false,
              allErrors: false
            });
          }
          cxt.subschema(subschema, valid);
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/properties.js
var require_properties = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/properties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var validate_1 = require_validate();
    var code_1 = require_code2();
    var util_1 = require_util();
    var additionalProperties_1 = require_additionalProperties();
    var def = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
          additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
        }
        const allProps = (0, code_1.allSchemaProperties)(schema);
        for (const prop of allProps) {
          it.definedProperties.add(prop);
        }
        if (it.opts.unevaluated && allProps.length && it.props !== true) {
          it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
        }
        const properties = allProps.filter((p2) => !(0, util_1.alwaysValidSchema)(it, schema[p2]));
        if (properties.length === 0)
          return;
        const valid = gen.name("valid");
        for (const prop of properties) {
          if (hasDefault(prop)) {
            applyPropertySchema(prop);
          } else {
            gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
            applyPropertySchema(prop);
            if (!it.allErrors)
              gen.else().var(valid, true);
            gen.endIf();
          }
          cxt.it.definedProperties.add(prop);
          cxt.ok(valid);
        }
        function hasDefault(prop) {
          return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
        }
        function applyPropertySchema(prop) {
          cxt.subschema({
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop
          }, valid);
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/patternProperties.js
var require_patternProperties = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/patternProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var util_2 = require_util();
    var def = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, data, parentSchema, it } = cxt;
        const { opts } = it;
        const patterns = (0, code_1.allSchemaProperties)(schema);
        const alwaysValidPatterns = patterns.filter((p2) => (0, util_1.alwaysValidSchema)(it, schema[p2]));
        if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
          return;
        }
        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
        const valid = gen.name("valid");
        if (it.props !== true && !(it.props instanceof codegen_1.Name)) {
          it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
        }
        const { props } = it;
        validatePatternProperties();
        function validatePatternProperties() {
          for (const pat of patterns) {
            if (checkProperties)
              checkMatchingProperties(pat);
            if (it.allErrors) {
              validateProperties(pat);
            } else {
              gen.var(valid, true);
              validateProperties(pat);
              gen.if(valid);
            }
          }
        }
        function checkMatchingProperties(pat) {
          for (const prop in checkProperties) {
            if (new RegExp(pat).test(prop)) {
              (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
            }
          }
        }
        function validateProperties(pat) {
          gen.forIn("key", data, (key) => {
            gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
              const alwaysValid = alwaysValidPatterns.includes(pat);
              if (!alwaysValid) {
                cxt.subschema({
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str
                }, valid);
              }
              if (it.opts.unevaluated && props !== true) {
                gen.assign((0, codegen_1._)`${props}[${key}]`, true);
              } else if (!alwaysValid && !it.allErrors) {
                gen.if((0, codegen_1.not)(valid), () => gen.break());
              }
            });
          });
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/not.js
var require_not = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/not.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      code(cxt) {
        const { gen, schema, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          cxt.fail();
          return;
        }
        const valid = gen.name("valid");
        cxt.subschema({
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false
        }, valid);
        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
      },
      error: { message: "must NOT be valid" }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/anyOf.js
var require_anyOf = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/anyOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var def = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: true,
      code: code_1.validateUnion,
      error: { message: "must match a schema in anyOf" }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/oneOf.js
var require_oneOf = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/oneOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
    };
    var def = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator)
          return;
        const schArr = schema;
        const valid = gen.let("valid", false);
        const passing = gen.let("passing", null);
        const schValid = gen.name("_valid");
        cxt.setParams({ passing });
        gen.block(validateOneOf);
        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
        function validateOneOf() {
          schArr.forEach((sch, i2) => {
            let schCxt;
            if ((0, util_1.alwaysValidSchema)(it, sch)) {
              gen.var(schValid, true);
            } else {
              schCxt = cxt.subschema({
                keyword: "oneOf",
                schemaProp: i2,
                compositeRule: true
              }, schValid);
            }
            if (i2 > 0) {
              gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i2}]`).else();
            }
            gen.if(schValid, () => {
              gen.assign(valid, true);
              gen.assign(passing, i2);
              if (schCxt)
                cxt.mergeEvaluated(schCxt, codegen_1.Name);
            });
          });
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/allOf.js
var require_allOf = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/allOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "allOf",
      schemaType: "array",
      code(cxt) {
        const { gen, schema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        const valid = gen.name("valid");
        schema.forEach((sch, i2) => {
          if ((0, util_1.alwaysValidSchema)(it, sch))
            return;
          const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i2 }, valid);
          cxt.ok(valid);
          cxt.mergeEvaluated(schCxt);
        });
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/if.js
var require_if = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/if.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
      params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
    };
    var def = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, parentSchema, it } = cxt;
        if (parentSchema.then === void 0 && parentSchema.else === void 0) {
          (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
        }
        const hasThen = hasSchema(it, "then");
        const hasElse = hasSchema(it, "else");
        if (!hasThen && !hasElse)
          return;
        const valid = gen.let("valid", true);
        const schValid = gen.name("_valid");
        validateIf();
        cxt.reset();
        if (hasThen && hasElse) {
          const ifClause = gen.let("ifClause");
          cxt.setParams({ ifClause });
          gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
        } else if (hasThen) {
          gen.if(schValid, validateClause("then"));
        } else {
          gen.if((0, codegen_1.not)(schValid), validateClause("else"));
        }
        cxt.pass(valid, () => cxt.error(true));
        function validateIf() {
          const schCxt = cxt.subschema({
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false
          }, schValid);
          cxt.mergeEvaluated(schCxt);
        }
        function validateClause(keyword, ifClause) {
          return () => {
            const schCxt = cxt.subschema({ keyword }, schValid);
            gen.assign(valid, schValid);
            cxt.mergeValidEvaluated(schCxt, valid);
            if (ifClause)
              gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
            else
              cxt.setParams({ ifClause: keyword });
          };
        }
      }
    };
    function hasSchema(it, keyword) {
      const schema = it.schema[keyword];
      return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
    }
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/thenElse.js
var require_thenElse = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/thenElse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword, parentSchema, it }) {
        if (parentSchema.if === void 0)
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js
var require_applicator = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var additionalItems_1 = require_additionalItems();
    var prefixItems_1 = require_prefixItems();
    var items_1 = require_items();
    var items2020_1 = require_items2020();
    var contains_1 = require_contains();
    var dependencies_1 = require_dependencies();
    var propertyNames_1 = require_propertyNames();
    var additionalProperties_1 = require_additionalProperties();
    var properties_1 = require_properties();
    var patternProperties_1 = require_patternProperties();
    var not_1 = require_not();
    var anyOf_1 = require_anyOf();
    var oneOf_1 = require_oneOf();
    var allOf_1 = require_allOf();
    var if_1 = require_if();
    var thenElse_1 = require_thenElse();
    function getApplicator(draft2020 = false) {
      const applicator = [
        // any
        not_1.default,
        anyOf_1.default,
        oneOf_1.default,
        allOf_1.default,
        if_1.default,
        thenElse_1.default,
        // object
        propertyNames_1.default,
        additionalProperties_1.default,
        dependencies_1.default,
        properties_1.default,
        patternProperties_1.default
      ];
      if (draft2020)
        applicator.push(prefixItems_1.default, items2020_1.default);
      else
        applicator.push(additionalItems_1.default, items_1.default);
      applicator.push(contains_1.default);
      return applicator;
    }
    exports.default = getApplicator;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/dynamicAnchor.js
var require_dynamicAnchor = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/dynamicAnchor.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dynamicAnchor = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var ref_1 = require_ref();
    var def = {
      keyword: "$dynamicAnchor",
      schemaType: "string",
      code: (cxt) => dynamicAnchor(cxt, cxt.schema)
    };
    function dynamicAnchor(cxt, anchor) {
      const { gen, it } = cxt;
      it.schemaEnv.root.dynamicAnchors[anchor] = true;
      const v2 = (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`;
      const validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
      gen.if((0, codegen_1._)`!${v2}`, () => gen.assign(v2, validate));
    }
    exports.dynamicAnchor = dynamicAnchor;
    function _getValidate(cxt) {
      const { schemaEnv, schema, self } = cxt.it;
      const { root, baseId, localRefs, meta } = schemaEnv.root;
      const { schemaId } = self.opts;
      const sch = new compile_1.SchemaEnv({ schema, schemaId, root, baseId, localRefs, meta });
      compile_1.compileSchema.call(self, sch);
      return (0, ref_1.getValidate)(cxt, sch);
    }
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/dynamicRef.js
var require_dynamicRef = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/dynamicRef.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dynamicRef = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var ref_1 = require_ref();
    var def = {
      keyword: "$dynamicRef",
      schemaType: "string",
      code: (cxt) => dynamicRef(cxt, cxt.schema)
    };
    function dynamicRef(cxt, ref) {
      const { gen, keyword, it } = cxt;
      if (ref[0] !== "#")
        throw new Error(`"${keyword}" only supports hash fragment reference`);
      const anchor = ref.slice(1);
      if (it.allErrors) {
        _dynamicRef();
      } else {
        const valid = gen.let("valid", false);
        _dynamicRef(valid);
        cxt.ok(valid);
      }
      function _dynamicRef(valid) {
        if (it.schemaEnv.root.dynamicAnchors[anchor]) {
          const v2 = gen.let("_v", (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`);
          gen.if(v2, _callRef(v2, valid), _callRef(it.validateName, valid));
        } else {
          _callRef(it.validateName, valid)();
        }
      }
      function _callRef(validate, valid) {
        return valid ? () => gen.block(() => {
          (0, ref_1.callRef)(cxt, validate);
          gen.let(valid, true);
        }) : () => (0, ref_1.callRef)(cxt, validate);
      }
    }
    exports.dynamicRef = dynamicRef;
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/recursiveAnchor.js
var require_recursiveAnchor = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/recursiveAnchor.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dynamicAnchor_1 = require_dynamicAnchor();
    var util_1 = require_util();
    var def = {
      keyword: "$recursiveAnchor",
      schemaType: "boolean",
      code(cxt) {
        if (cxt.schema)
          (0, dynamicAnchor_1.dynamicAnchor)(cxt, "");
        else
          (0, util_1.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/recursiveRef.js
var require_recursiveRef = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/recursiveRef.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dynamicRef_1 = require_dynamicRef();
    var def = {
      keyword: "$recursiveRef",
      schemaType: "string",
      code: (cxt) => (0, dynamicRef_1.dynamicRef)(cxt, cxt.schema)
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/index.js
var require_dynamic = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dynamicAnchor_1 = require_dynamicAnchor();
    var dynamicRef_1 = require_dynamicRef();
    var recursiveAnchor_1 = require_recursiveAnchor();
    var recursiveRef_1 = require_recursiveRef();
    var dynamic = [dynamicAnchor_1.default, dynamicRef_1.default, recursiveAnchor_1.default, recursiveRef_1.default];
    exports.default = dynamic;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/dependentRequired.js
var require_dependentRequired = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/dependentRequired.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dependencies_1 = require_dependencies();
    var def = {
      keyword: "dependentRequired",
      type: "object",
      schemaType: "object",
      error: dependencies_1.error,
      code: (cxt) => (0, dependencies_1.validatePropertyDeps)(cxt)
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/dependentSchemas.js
var require_dependentSchemas = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/dependentSchemas.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dependencies_1 = require_dependencies();
    var def = {
      keyword: "dependentSchemas",
      type: "object",
      schemaType: "object",
      code: (cxt) => (0, dependencies_1.validateSchemaDeps)(cxt)
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitContains.js
var require_limitContains = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitContains.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["maxContains", "minContains"],
      type: "array",
      schemaType: "number",
      code({ keyword, parentSchema, it }) {
        if (parentSchema.contains === void 0) {
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "contains" is ignored`);
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/next.js
var require_next = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/next.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dependentRequired_1 = require_dependentRequired();
    var dependentSchemas_1 = require_dependentSchemas();
    var limitContains_1 = require_limitContains();
    var next = [dependentRequired_1.default, dependentSchemas_1.default, limitContains_1.default];
    exports.default = next;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js
var require_unevaluatedProperties = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var error = {
      message: "must NOT have unevaluated properties",
      params: ({ params }) => (0, codegen_1._)`{unevaluatedProperty: ${params.unevaluatedProperty}}`
    };
    var def = {
      keyword: "unevaluatedProperties",
      type: "object",
      schemaType: ["boolean", "object"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, props } = it;
        if (props instanceof codegen_1.Name) {
          gen.if((0, codegen_1._)`${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
        } else if (props !== true) {
          gen.forIn("key", data, (key) => props === void 0 ? unevaluatedPropCode(key) : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
        }
        it.props = true;
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function unevaluatedPropCode(key) {
          if (schema === false) {
            cxt.setParams({ unevaluatedProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (!(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            cxt.subschema({
              keyword: "unevaluatedProperties",
              dataProp: key,
              dataPropType: util_1.Type.Str
            }, valid);
            if (!allErrors)
              gen.if((0, codegen_1.not)(valid), () => gen.break());
          }
        }
        function unevaluatedDynamic(evaluatedProps, key) {
          return (0, codegen_1._)`!${evaluatedProps} || !${evaluatedProps}[${key}]`;
        }
        function unevaluatedStatic(evaluatedProps, key) {
          const ps = [];
          for (const p2 in evaluatedProps) {
            if (evaluatedProps[p2] === true)
              ps.push((0, codegen_1._)`${key} !== ${p2}`);
          }
          return (0, codegen_1.and)(...ps);
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedItems.js
var require_unevaluatedItems = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "unevaluatedItems",
      type: "array",
      schemaType: ["boolean", "object"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        const items = it.items || 0;
        if (items === true)
          return;
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        if (schema === false) {
          cxt.setParams({ len: items });
          cxt.fail((0, codegen_1._)`${len} > ${items}`);
        } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
          const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items}`);
          gen.if((0, codegen_1.not)(valid), () => validateItems(valid, items));
          cxt.ok(valid);
        }
        it.items = true;
        function validateItems(valid, from) {
          gen.forRange("i", from, len, (i2) => {
            cxt.subschema({ keyword: "unevaluatedItems", dataProp: i2, dataPropType: util_1.Type.Num }, valid);
            if (!it.allErrors)
              gen.if((0, codegen_1.not)(valid), () => gen.break());
          });
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/index.js
var require_unevaluated = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var unevaluatedProperties_1 = require_unevaluatedProperties();
    var unevaluatedItems_1 = require_unevaluatedItems();
    var unevaluated = [unevaluatedProperties_1.default, unevaluatedItems_1.default];
    exports.default = unevaluated;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/format.js
var require_format = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/format.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
    };
    var def = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: true,
      error,
      code(cxt, ruleType) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const { opts, errSchemaPath, schemaEnv, self } = it;
        if (!opts.validateFormats)
          return;
        if ($data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
          const fType = gen.let("fType");
          const format = gen.let("format");
          gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
          cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
          function unknownFmt() {
            if (opts.strictSchema === false)
              return codegen_1.nil;
            return (0, codegen_1._)`${schemaCode} && !${format}`;
          }
          function invalidFmt() {
            const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
            const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
            return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
          }
        }
        function validateFormat() {
          const formatDef = self.formats[schema];
          if (!formatDef) {
            unknownFormat();
            return;
          }
          if (formatDef === true)
            return;
          const [fmtType, format, fmtRef] = getFormat(formatDef);
          if (fmtType === ruleType)
            cxt.pass(validCondition());
          function unknownFormat() {
            if (opts.strictSchema === false) {
              self.logger.warn(unknownMsg());
              return;
            }
            throw new Error(unknownMsg());
            function unknownMsg() {
              return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
            }
          }
          function getFormat(fmtDef) {
            const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
            const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
            if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
              return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._)`${fmt}.validate`];
            }
            return ["string", fmtDef, fmt];
          }
          function validCondition() {
            if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
              if (!schemaEnv.$async)
                throw new Error("async format in sync schema");
              return (0, codegen_1._)`await ${fmtRef}(${data})`;
            }
            return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
          }
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/index.js
var require_format2 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var format_1 = require_format();
    var format = [format_1.default];
    exports.default = format;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/metadata.js
var require_metadata = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/metadata.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.contentVocabulary = exports.metadataVocabulary = void 0;
    exports.metadataVocabulary = [
      "title",
      "description",
      "default",
      "deprecated",
      "readOnly",
      "writeOnly",
      "examples"
    ];
    exports.contentVocabulary = [
      "contentMediaType",
      "contentEncoding",
      "contentSchema"
    ];
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js
var require_draft2020 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var core_1 = require_core2();
    var validation_1 = require_validation();
    var applicator_1 = require_applicator();
    var dynamic_1 = require_dynamic();
    var next_1 = require_next();
    var unevaluated_1 = require_unevaluated();
    var format_1 = require_format2();
    var metadata_1 = require_metadata();
    var draft2020Vocabularies = [
      dynamic_1.default,
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(true),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary,
      next_1.default,
      unevaluated_1.default
    ];
    exports.default = draft2020Vocabularies;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/discriminator/types.js
var require_types = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/discriminator/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DiscrError = void 0;
    var DiscrError;
    (function(DiscrError2) {
      DiscrError2["Tag"] = "tag";
      DiscrError2["Mapping"] = "mapping";
    })(DiscrError || (exports.DiscrError = DiscrError = {}));
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/discriminator/index.js
var require_discriminator = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/discriminator/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var types_1 = require_types();
    var compile_1 = require_compile();
    var ref_error_1 = require_ref_error();
    var util_1 = require_util();
    var error = {
      message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
    };
    var def = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error,
      code(cxt) {
        const { gen, data, schema, parentSchema, it } = cxt;
        const { oneOf } = parentSchema;
        if (!it.opts.discriminator) {
          throw new Error("discriminator: requires discriminator option");
        }
        const tagName = schema.propertyName;
        if (typeof tagName != "string")
          throw new Error("discriminator: requires propertyName");
        if (schema.mapping)
          throw new Error("discriminator: mapping is not supported");
        if (!oneOf)
          throw new Error("discriminator: requires oneOf keyword");
        const valid = gen.let("valid", false);
        const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
        gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
        cxt.ok(valid);
        function validateMapping() {
          const mapping = getMapping();
          gen.if(false);
          for (const tagValue in mapping) {
            gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
            gen.assign(valid, applyTagSchema(mapping[tagValue]));
          }
          gen.else();
          cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
          gen.endIf();
        }
        function applyTagSchema(schemaProp) {
          const _valid = gen.name("valid");
          const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
          cxt.mergeEvaluated(schCxt, codegen_1.Name);
          return _valid;
        }
        function getMapping() {
          var _a;
          const oneOfMapping = {};
          const topRequired = hasRequired(parentSchema);
          let tagRequired = true;
          for (let i2 = 0; i2 < oneOf.length; i2++) {
            let sch = oneOf[i2];
            if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
              const ref = sch.$ref;
              sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
              if (sch instanceof compile_1.SchemaEnv)
                sch = sch.schema;
              if (sch === void 0)
                throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
            }
            const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
            if (typeof propSch != "object") {
              throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
            }
            tagRequired = tagRequired && (topRequired || hasRequired(sch));
            addMappings(propSch, i2);
          }
          if (!tagRequired)
            throw new Error(`discriminator: "${tagName}" must be required`);
          return oneOfMapping;
          function hasRequired({ required }) {
            return Array.isArray(required) && required.includes(tagName);
          }
          function addMappings(sch, i2) {
            if (sch.const) {
              addMapping(sch.const, i2);
            } else if (sch.enum) {
              for (const tagValue of sch.enum) {
                addMapping(tagValue, i2);
              }
            } else {
              throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
            }
          }
          function addMapping(tagValue, i2) {
            if (typeof tagValue != "string" || tagValue in oneOfMapping) {
              throw new Error(`discriminator: "${tagName}" values must be unique strings`);
            }
            oneOfMapping[tagValue] = i2;
          }
        }
      }
    };
    exports.default = def;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/schema.json
var require_schema = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/schema.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/schema",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/core": true,
        "https://json-schema.org/draft/2020-12/vocab/applicator": true,
        "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
        "https://json-schema.org/draft/2020-12/vocab/validation": true,
        "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
        "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
        "https://json-schema.org/draft/2020-12/vocab/content": true
      },
      $dynamicAnchor: "meta",
      title: "Core and Validation specifications meta-schema",
      allOf: [
        { $ref: "meta/core" },
        { $ref: "meta/applicator" },
        { $ref: "meta/unevaluated" },
        { $ref: "meta/validation" },
        { $ref: "meta/meta-data" },
        { $ref: "meta/format-annotation" },
        { $ref: "meta/content" }
      ],
      type: ["object", "boolean"],
      $comment: "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.",
      properties: {
        definitions: {
          $comment: '"definitions" has been replaced by "$defs".',
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          deprecated: true,
          default: {}
        },
        dependencies: {
          $comment: '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
          type: "object",
          additionalProperties: {
            anyOf: [{ $dynamicRef: "#meta" }, { $ref: "meta/validation#/$defs/stringArray" }]
          },
          deprecated: true,
          default: {}
        },
        $recursiveAnchor: {
          $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
          $ref: "meta/core#/$defs/anchorString",
          deprecated: true
        },
        $recursiveRef: {
          $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
          $ref: "meta/core#/$defs/uriReferenceString",
          deprecated: true
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/applicator.json
var require_applicator2 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/applicator.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/applicator",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/applicator": true
      },
      $dynamicAnchor: "meta",
      title: "Applicator vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        prefixItems: { $ref: "#/$defs/schemaArray" },
        items: { $dynamicRef: "#meta" },
        contains: { $dynamicRef: "#meta" },
        additionalProperties: { $dynamicRef: "#meta" },
        properties: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          default: {}
        },
        patternProperties: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          propertyNames: { format: "regex" },
          default: {}
        },
        dependentSchemas: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          default: {}
        },
        propertyNames: { $dynamicRef: "#meta" },
        if: { $dynamicRef: "#meta" },
        then: { $dynamicRef: "#meta" },
        else: { $dynamicRef: "#meta" },
        allOf: { $ref: "#/$defs/schemaArray" },
        anyOf: { $ref: "#/$defs/schemaArray" },
        oneOf: { $ref: "#/$defs/schemaArray" },
        not: { $dynamicRef: "#meta" }
      },
      $defs: {
        schemaArray: {
          type: "array",
          minItems: 1,
          items: { $dynamicRef: "#meta" }
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json
var require_unevaluated2 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/unevaluated",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/unevaluated": true
      },
      $dynamicAnchor: "meta",
      title: "Unevaluated applicator vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        unevaluatedItems: { $dynamicRef: "#meta" },
        unevaluatedProperties: { $dynamicRef: "#meta" }
      }
    };
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/content.json
var require_content = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/content.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/content",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/content": true
      },
      $dynamicAnchor: "meta",
      title: "Content vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        contentEncoding: { type: "string" },
        contentMediaType: { type: "string" },
        contentSchema: { $dynamicRef: "#meta" }
      }
    };
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/core.json
var require_core3 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/core.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/core",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/core": true
      },
      $dynamicAnchor: "meta",
      title: "Core vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        $id: {
          $ref: "#/$defs/uriReferenceString",
          $comment: "Non-empty fragments not allowed.",
          pattern: "^[^#]*#?$"
        },
        $schema: { $ref: "#/$defs/uriString" },
        $ref: { $ref: "#/$defs/uriReferenceString" },
        $anchor: { $ref: "#/$defs/anchorString" },
        $dynamicRef: { $ref: "#/$defs/uriReferenceString" },
        $dynamicAnchor: { $ref: "#/$defs/anchorString" },
        $vocabulary: {
          type: "object",
          propertyNames: { $ref: "#/$defs/uriString" },
          additionalProperties: {
            type: "boolean"
          }
        },
        $comment: {
          type: "string"
        },
        $defs: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" }
        }
      },
      $defs: {
        anchorString: {
          type: "string",
          pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
        },
        uriString: {
          type: "string",
          format: "uri"
        },
        uriReferenceString: {
          type: "string",
          format: "uri-reference"
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json
var require_format_annotation = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/format-annotation",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/format-annotation": true
      },
      $dynamicAnchor: "meta",
      title: "Format vocabulary meta-schema for annotation results",
      type: ["object", "boolean"],
      properties: {
        format: { type: "string" }
      }
    };
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/meta-data.json
var require_meta_data = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/meta-data.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/meta-data",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/meta-data": true
      },
      $dynamicAnchor: "meta",
      title: "Meta-data vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        default: true,
        deprecated: {
          type: "boolean",
          default: false
        },
        readOnly: {
          type: "boolean",
          default: false
        },
        writeOnly: {
          type: "boolean",
          default: false
        },
        examples: {
          type: "array",
          items: true
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/validation.json
var require_validation2 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/validation.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/validation",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/validation": true
      },
      $dynamicAnchor: "meta",
      title: "Validation vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        type: {
          anyOf: [
            { $ref: "#/$defs/simpleTypes" },
            {
              type: "array",
              items: { $ref: "#/$defs/simpleTypes" },
              minItems: 1,
              uniqueItems: true
            }
          ]
        },
        const: true,
        enum: {
          type: "array",
          items: true
        },
        multipleOf: {
          type: "number",
          exclusiveMinimum: 0
        },
        maximum: {
          type: "number"
        },
        exclusiveMaximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        exclusiveMinimum: {
          type: "number"
        },
        maxLength: { $ref: "#/$defs/nonNegativeInteger" },
        minLength: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        pattern: {
          type: "string",
          format: "regex"
        },
        maxItems: { $ref: "#/$defs/nonNegativeInteger" },
        minItems: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        uniqueItems: {
          type: "boolean",
          default: false
        },
        maxContains: { $ref: "#/$defs/nonNegativeInteger" },
        minContains: {
          $ref: "#/$defs/nonNegativeInteger",
          default: 1
        },
        maxProperties: { $ref: "#/$defs/nonNegativeInteger" },
        minProperties: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        required: { $ref: "#/$defs/stringArray" },
        dependentRequired: {
          type: "object",
          additionalProperties: {
            $ref: "#/$defs/stringArray"
          }
        }
      },
      $defs: {
        nonNegativeInteger: {
          type: "integer",
          minimum: 0
        },
        nonNegativeIntegerDefault0: {
          $ref: "#/$defs/nonNegativeInteger",
          default: 0
        },
        simpleTypes: {
          enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
        },
        stringArray: {
          type: "array",
          items: { type: "string" },
          uniqueItems: true,
          default: []
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/index.js
var require_json_schema_2020_12 = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var metaSchema = require_schema();
    var applicator = require_applicator2();
    var unevaluated = require_unevaluated2();
    var content = require_content();
    var core = require_core3();
    var format = require_format_annotation();
    var metadata = require_meta_data();
    var validation = require_validation2();
    var META_SUPPORT_DATA = ["/properties"];
    function addMetaSchema2020($data) {
      ;
      [
        metaSchema,
        applicator,
        unevaluated,
        content,
        core,
        with$data(this, format),
        metadata,
        with$data(this, validation)
      ].forEach((sch) => this.addMetaSchema(sch, void 0, false));
      return this;
      function with$data(ajv5, sch) {
        return $data ? ajv5.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
      }
    }
    exports.default = addMetaSchema2020;
  }
});

// ../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js
var require__ = __commonJS({
  "../../node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js"(exports, module) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv2020 = void 0;
    var core_1 = require_core();
    var draft2020_1 = require_draft2020();
    var discriminator_1 = require_discriminator();
    var json_schema_2020_12_1 = require_json_schema_2020_12();
    var META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
    var Ajv20206 = class extends core_1.default {
      constructor(opts = {}) {
        super({
          ...opts,
          dynamicRef: true,
          next: true,
          unevaluated: true
        });
      }
      _addVocabularies() {
        super._addVocabularies();
        draft2020_1.default.forEach((v2) => this.addVocabulary(v2));
        if (this.opts.discriminator)
          this.addKeyword(discriminator_1.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        const { $data, meta } = this.opts;
        if (!meta)
          return;
        json_schema_2020_12_1.default.call(this, $data);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
      }
      defaultMeta() {
        return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
      }
    };
    exports.Ajv2020 = Ajv20206;
    module.exports = exports = Ajv20206;
    module.exports.Ajv2020 = Ajv20206;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Ajv20206;
    var validate_1 = require_validate();
    Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function() {
      return validation_error_1.default;
    } });
    var ref_error_1 = require_ref_error();
    Object.defineProperty(exports, "MissingRefError", { enumerable: true, get: function() {
      return ref_error_1.default;
    } });
  }
});

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
    sorts: { type: "array", items: { $ref: "#/$defs/sort" } }
  }
};

// ../sdk/js/dist/validate.js
var import__ = __toESM(require__(), 1);
var ajv = new import__.Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
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
var import__2 = __toESM(require__(), 1);

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
  const list = supported.map((v2) => JSON.stringify(v2)).join(", ");
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
var ajv2 = new import__2.Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
var serverCapabilities = ajv2.compile(SERVER_CAPABILITIES_SCHEMA);
var serverCapabilitiesVersion = ajv2.compile(SERVER_CAPABILITIES_SCHEMA.properties[A2UI_CAPABILITIES_VERSION_KEY]);
function readSupportedCatalogIds(card) {
  const extension = card.capabilities?.extensions?.find((e2) => e2.uri === A2UI_EXTENSION_URI);
  const params = extension?.params;
  if (params === void 0)
    return { ok: true, value: [] };
  const versioned = Object.keys(params).some((key) => /^v\d/.test(key));
  const errors = versioned ? schemaErrors(serverCapabilities, params) : schemaErrors(serverCapabilitiesVersion, params);
  if (errors.length > 0) {
    return { ok: false, errors: errors.map((e2) => `A2UI extension params${e2}`) };
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
var import__4 = __toESM(require__(), 1);

// ../sdk/js/dist/a2ui/validator.js
var import__3 = __toESM(require__(), 1);

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_2) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e2) {
      return obj[e2];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_2, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t2 = typeof data;
  switch (t2) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i2 = 0;
          while (i2 < issue.path.length) {
            const el = issue.path[i2];
            const terminal = i2 === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i2++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m2) => !!m2).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x2) => !!x2)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s2 of results) {
      if (s2.status === "aborted")
        return INVALID;
      if (s2.status === "dirty")
        status.dirty();
      arrayValue.push(s2.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x2) => x2.status === "aborted";
var isDirty = (x2) => x2.status === "dirty";
var isValid = (x2) => x2.status === "valid";
var isAsync = (x2) => typeof Promise !== "undefined" && x2 instanceof Promise;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i2) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i2));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i2) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i2));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a2, b2) {
  const aType = getParsedType(a2);
  const bType = getParsedType(b2);
  if (a2 === b2) {
    return { valid: true, data: a2 };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b2);
    const sharedKeys = util.objectKeys(a2).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a2, ...b2 };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a2[key], b2[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a2.length !== b2.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a2.length; index++) {
      const itemA = a2[index];
      const itemB = b2[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a2 === +b2) {
    return { valid: true, data: a2 };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x2) => !!x2);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i2) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i2)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x2) => !!x2),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x2) => !!x2),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e2) => {
          error.addIssue(makeArgsIssue(args, e2));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e2) => {
          error.addIssue(makeReturnsIssue(result, e2));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect2 = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect2.type === "preprocess") {
      const processed = effect2.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect2.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect2.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect2.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect2.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect2.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect2);
  }
};
ZodEffects.create = (schema, effect2, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect: effect2,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a2, b2) {
    return new _ZodPipeline({
      in: a2,
      out: b2,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p2 = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p22 = typeof p2 === "string" ? { message: p2 } : p2;
  return p22;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r2 = check(data);
      if (r2 instanceof Promise) {
        return r2.then((r3) => {
          if (!r3) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r2) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/errors.js
var A2uiError = class extends Error {
  /**
   * Initializes a new `A2uiError` instance.
   *
   * @param message Human-readable error description.
   * @param code Machine-readable error category code.
   */
  constructor(message, code = "UNKNOWN_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};
var A2uiValidationError = class extends A2uiError {
  /**
   * Initializes a new `A2uiValidationError` instance.
   *
   * @param message Error description detailing the validation failure.
   * @param details Additional error context or Zod validation issues.
   * @param code Optional error category code.
   */
  constructor(message, details, code = "VALIDATION_ERROR") {
    super(message, code);
    this.details = details;
  }
};
var A2uiDataError = class extends A2uiError {
  /**
   * Initializes a new `A2uiDataError` instance.
   *
   * @param message Error description.
   * @param path Target data model path where the mutation failed.
   */
  constructor(message, path) {
    super(message, "DATA_ERROR");
    this.path = path;
  }
};
var A2uiExpressionError = class extends A2uiError {
  /**
   * Initializes a new `A2uiExpressionError` instance.
   *
   * @param message Error description.
   * @param expression Evaluated expression string.
   * @param details Additional error details.
   */
  constructor(message, expression, details) {
    super(message, "EXPRESSION_ERROR");
    this.expression = expression;
    this.details = details;
  }
};
var A2uiStateError = class extends A2uiError {
  /**
   * Initializes a new `A2uiStateError` instance.
   *
   * @param message Error description.
   */
  constructor(message) {
    super(message, "STATE_ERROR");
  }
};
var A2uiCatalogError = class extends A2uiError {
  /**
   * Initializes a new `A2uiCatalogError` instance.
   *
   * @param message Human-readable error description.
   * @param code Machine-readable error category code. Defaults to `'CATALOG_ERROR'`.
   */
  constructor(message, code = "CATALOG_ERROR") {
    super(message, code);
  }
};
var A2uiIntegrityError = class extends A2uiValidationError {
  /**
   * Initializes a new `A2uiIntegrityError` instance.
   *
   * @param message Error description.
   * @param details Additional error details.
   * @param code Error category code. Defaults to 'INTEGRITY_ERROR'.
   */
  constructor(message, details, code = "INTEGRITY_ERROR") {
    super(message, details, code);
    this.name = "A2uiIntegrityError";
  }
};
var A2uiRecursionError = class extends A2uiValidationError {
  /**
   * Initializes a new `A2uiRecursionError` instance.
   *
   * @param message Error description.
   * @param details Additional error details.
   * @param code Error category code. Defaults to 'RECURSION_ERROR'.
   */
  constructor(message, details, code = "RECURSION_ERROR") {
    super(message, details, code);
    this.name = "A2uiRecursionError";
  }
};
var RpcErrorCode;
(function(RpcErrorCode2) {
  RpcErrorCode2["INVALID_FUNCTION_CALL"] = "INVALID_FUNCTION_CALL";
  RpcErrorCode2["EXECUTION_ERROR"] = "EXECUTION_ERROR";
  RpcErrorCode2["UNKNOWN_FUNCTION"] = "UNKNOWN_FUNCTION";
  RpcErrorCode2["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
  RpcErrorCode2["TIMEOUT"] = "TIMEOUT";
  RpcErrorCode2["CANCELLED"] = "CANCELLED";
  RpcErrorCode2["DISPOSED"] = "DISPOSED";
  RpcErrorCode2["DUPLICATE"] = "DUPLICATE";
  RpcErrorCode2["NO_LISTENER"] = "NO_LISTENER";
})(RpcErrorCode || (RpcErrorCode = {}));
var A2uiRpcError = class extends A2uiError {
  /**
   * Initializes a new `A2uiRpcError` instance.
   *
   * @param message Human-readable error description.
   * @param code Category code or string identifying the RPC error.
   * @param functionCallId Optional identifier of the failed function call.
   * @param details Optional structured error details.
   */
  constructor(message, code = RpcErrorCode.UNKNOWN_ERROR, functionCallId, details) {
    const resolvedCode = code || RpcErrorCode.UNKNOWN_ERROR;
    super(`[${resolvedCode}] ${message}`, resolvedCode);
    this.functionCallId = functionCallId;
    this.details = details;
    this.name = "A2uiRpcError";
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/common/semver.js
var SEMVER_REGEX = /^[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
function normalizeVersionString(version) {
  if (!version || typeof version !== "string") {
    return "";
  }
  const text = version.trim().replace(/^[vV]/, "");
  const dashIdx = text.indexOf("-");
  const plusIdx = text.indexOf("+");
  let splitIdx = text.length;
  if (dashIdx !== -1 && plusIdx !== -1) {
    splitIdx = Math.min(dashIdx, plusIdx);
  } else if (dashIdx !== -1) {
    splitIdx = dashIdx;
  } else if (plusIdx !== -1) {
    splitIdx = plusIdx;
  }
  const core = text.slice(0, splitIdx).replace(/_/g, ".");
  return `${core}${text.slice(splitIdx)}`;
}
function parseSemVer(versionStr) {
  if (!versionStr || typeof versionStr !== "string") {
    return null;
  }
  const match = versionStr.trim().match(SEMVER_REGEX);
  if (!match) {
    return null;
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] !== void 0 ? parseInt(match[3], 10) : 0,
    prerelease: match[4] ? match[4].split(".") : [],
    build: match[5] ? match[5].split(".") : []
  };
}
function toSemVer(v2) {
  if (!v2) {
    return null;
  }
  if (typeof v2 === "object") {
    const obj = v2;
    if (typeof obj.major !== "number" || !Number.isInteger(obj.major) || obj.major < 0 || typeof obj.minor === "number" && (!Number.isInteger(obj.minor) || obj.minor < 0) || typeof obj.patch === "number" && (!Number.isInteger(obj.patch) || obj.patch < 0)) {
      return null;
    }
    return {
      major: obj.major,
      minor: typeof obj.minor === "number" ? obj.minor : 0,
      patch: typeof obj.patch === "number" ? obj.patch : 0,
      prerelease: Array.isArray(obj.prerelease) ? obj.prerelease : [],
      build: Array.isArray(obj.build) ? obj.build : []
    };
  }
  return parseSemVer(normalizeVersionString(v2));
}
function toCanonicalVersion(version) {
  if (!version) {
    return null;
  }
  const parsed = toSemVer(version);
  if (!parsed) {
    return null;
  }
  if (parsed.patch === 0 && parsed.prerelease.length === 0 && parsed.build.length === 0) {
    return `${parsed.major}.${parsed.minor}`;
  }
  const pre = parsed.prerelease.length > 0 ? `-${parsed.prerelease.join(".")}` : "";
  const bld = parsed.build.length > 0 ? `+${parsed.build.join(".")}` : "";
  return `${parsed.major}.${parsed.minor}.${parsed.patch}${pre}${bld}`;
}
function comparePrereleaseId(idA, idB) {
  const isNumA = /^\d+$/.test(idA);
  const isNumB = /^\d+$/.test(idB);
  if (isNumA && isNumB) {
    if (idA.length !== idB.length) {
      return idA.length - idB.length;
    }
    if (idA < idB) {
      return -1;
    }
    if (idA > idB) {
      return 1;
    }
    return 0;
  }
  if (isNumA) {
    return -1;
  }
  if (isNumB) {
    return 1;
  }
  if (idA < idB) {
    return -1;
  }
  if (idA > idB) {
    return 1;
  }
  return 0;
}
function comparePrereleaseLists(preA, preB) {
  if (preA.length === 0 && preB.length === 0) {
    return 0;
  }
  if (preA.length === 0) {
    return 1;
  }
  if (preB.length === 0) {
    return -1;
  }
  const minLen = Math.min(preA.length, preB.length);
  for (let i2 = 0; i2 < minLen; i2++) {
    const diff = comparePrereleaseId(preA[i2], preB[i2]);
    if (diff !== 0) {
      return diff;
    }
  }
  return preA.length - preB.length;
}
function compareSemVer(a2, b2) {
  const versionA = toSemVer(a2);
  const versionB = toSemVer(b2);
  if (!versionA && !versionB) {
    return 0;
  }
  if (!versionA) {
    return -1;
  }
  if (!versionB) {
    return 1;
  }
  if (versionA.major !== versionB.major) {
    return versionA.major - versionB.major;
  }
  if (versionA.minor !== versionB.minor) {
    return versionA.minor - versionB.minor;
  }
  if (versionA.patch !== versionB.patch) {
    return versionA.patch - versionB.patch;
  }
  return comparePrereleaseLists(versionA.prerelease, versionB.prerelease);
}
function isAtLeastVersion(version, minVersion) {
  if (!version) {
    return false;
  }
  const parsed = toSemVer(version);
  const minParsed = toSemVer(minVersion);
  if (!parsed || !minParsed) {
    return false;
  }
  return compareSemVer(parsed, minParsed) >= 0;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/spec_versions.js
var SpecVersion;
(function(SpecVersion2) {
  SpecVersion2["V0_8"] = "v0.8";
  SpecVersion2["V0_9"] = "v0.9";
  SpecVersion2["V0_9_1"] = "v0.9.1";
  SpecVersion2["V1_0"] = "v1.0";
})(SpecVersion || (SpecVersion = {}));

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/types/child-ref-helpers.js
function markChildRef(schema, ref) {
  schema._def.a2uiChildRef = ref;
  return schema;
}
function childRefKindOf(schema) {
  return schema?._def?.a2uiChildRef;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/types/common-types.js
var ComponentIdSchema = markChildRef(external_exports.string().describe("REF:common_types.json#/$defs/ComponentId|The unique identifier for a component, used for both definitions and references within the same surface."), "component-id");
var DataBindingSchema = external_exports.object({
  "path": external_exports.string().describe("A JSON Pointer path to a value in the data model.").optional(),
  "@path": external_exports.string().describe("A JSON Pointer path to a value in the data model.").optional()
}).refine((data) => data["@path"] !== void 0 || data.path !== void 0, {
  message: "Either '@path' or 'path' must be provided."
}).describe("REF:common_types.json#/$defs/DataBinding");
var FunctionCallSchema = external_exports.object({
  "call": external_exports.string().describe("The name of the function to call.").optional(),
  "@call": external_exports.string().describe("The name of the function to call.").optional(),
  "args": external_exports.record(external_exports.string(), external_exports.unknown()).describe("Arguments passed to the function.").optional(),
  "returnType": external_exports.enum(["string", "number", "boolean", "array", "object", "any", "void"]).describe("The expected return type of the function call.").optional(),
  "catalogId": external_exports.string().describe("The catalog ID for this function, overriding any surface-level default catalogId.").optional()
}).refine((data) => data["@call"] !== void 0 || data.call !== void 0, {
  message: "Either '@call' or 'call' must be provided."
}).describe("REF:common_types.json#/$defs/FunctionCall|Invokes a named function, combining common function properties with the catalog function definition.");
var DynamicStringSchema = external_exports.union([external_exports.string(), DataBindingSchema, FunctionCallSchema]).describe("REF:common_types.json#/$defs/DynamicString|Represents a string");
var DynamicBooleanSchema = external_exports.union([external_exports.boolean(), DataBindingSchema, FunctionCallSchema]).describe("REF:common_types.json#/$defs/DynamicBoolean|A boolean value that can be a literal, a path, or a function call returning a boolean or a validation result object (coerced to its \\'valid\\' boolean).");
var AccessibilityAttributesSchema = external_exports.object({
  "label": DynamicStringSchema.optional(),
  "description": DynamicStringSchema.optional(),
  "live": external_exports.enum(["off", "polite", "assertive"]).default("off").describe("Controls screen reader announcements for dynamic updates (WAI-ARIA aria-live). 'polite' waits for user pause; 'assertive' interrupts immediately for alerts.").optional(),
  "hidden": DynamicBooleanSchema.optional()
}).describe("REF:common_types.json#/$defs/AccessibilityAttributes|Attributes to enhance accessibility when using assistive technologies like screen readers or model understanding.");
var ExtensionsSchema = external_exports.record(external_exports.string(), external_exports.unknown()).superRefine((value, ctx) => {
  for (const key in value) {
    if (!key.match(/^[\p{XID_Start}_][\p{XID_Continue}]*$/u)) {
      ctx.addIssue({
        path: [key],
        code: external_exports.ZodIssueCode.custom,
        message: `Invalid extension key "${key}": Keys MUST be Unicode identifiers (UAX #31).`
      });
    }
  }
}).describe("REF:#/$defs/Extensions|Optional extension metadata. Keys MUST be Unicode identifiers (UAX #31). Keys starting with 'a2ui_' are reserved for official extensions.");
var ComponentCommonSchema = external_exports.object({
  "id": ComponentIdSchema,
  "accessibility": AccessibilityAttributesSchema.optional(),
  "catalogId": external_exports.string().describe("The catalog ID for this component, overriding any surface-level default catalogId.").optional(),
  "metadata": external_exports.object({
    "extensions": ExtensionsSchema.optional()
  }).strict().describe("Optional component-level metadata for vendor extensions.").optional()
}).describe("REF:common_types.json#/$defs/ComponentCommon");
var ChildListSchema = markChildRef(external_exports.union([
  external_exports.array(ComponentIdSchema).describe("A static list of child component IDs."),
  external_exports.object({
    "componentId": ComponentIdSchema,
    "path": external_exports.string().describe("The path to the list of component property objects in the data model.")
  }).describe("A template for generating a dynamic list of children.")
]).describe("REF:common_types.json#/$defs/ChildList"), "child-list");
var DynamicValueSchema = external_exports.union([
  external_exports.string(),
  external_exports.number(),
  external_exports.boolean(),
  external_exports.array(external_exports.unknown()),
  DataBindingSchema,
  FunctionCallSchema,
  external_exports.record(external_exports.string(), external_exports.unknown()).refine((obj) => !obj || !("@path" in obj) && !("path" in obj) && !("@call" in obj) && !("call" in obj))
]).describe("REF:common_types.json#/$defs/DynamicValue|A value that can be a literal, a path, or a function call returning any type.");
var DynamicNumberSchema = external_exports.union([external_exports.number(), DataBindingSchema, FunctionCallSchema]).describe("REF:common_types.json#/$defs/DynamicNumber|Represents a value that can be either a literal number, a path to a number in the data model, or a function call returning a number.");
var DynamicStringListSchema = external_exports.union([external_exports.array(external_exports.string()), DataBindingSchema, FunctionCallSchema]).describe("REF:common_types.json#/$defs/DynamicStringList|Represents a value that can be either a literal array of strings, a path to a string array in the data model, or a function call returning a string array.");
var CheckRuleSchema = external_exports.object({
  "condition": external_exports.union([DynamicBooleanSchema, DataBindingSchema, FunctionCallSchema]).describe("Path or function call evaluating to a structured validation result object or a boolean."),
  "message": external_exports.string().describe("Optional fallback error message.").optional()
}).describe("REF:common_types.json#/$defs/CheckRule|A single validation check rule applied to an input component. The condition function or path evaluates to a structured validation result object or a boolean (which is coerced to a validation result object).");
var CheckableSchema = external_exports.object({
  "checks": external_exports.array(CheckRuleSchema).describe("A list of validation check rules to perform on the component.").optional()
}).describe("REF:common_types.json#/$defs/Checkable|Properties for components that support renderer-side checks.");
var ActionSchema = external_exports.union([
  external_exports.object({
    "event": external_exports.object({
      "name": external_exports.string().describe("The name of the action to be dispatched to the server."),
      "context": external_exports.record(external_exports.string(), external_exports.unknown()).describe("A JSON object containing the key-value pairs for the action context. Values can be literals or paths. Use literal values unless the value must be dynamically bound to the data model. Do NOT use paths for static IDs.").optional()
    }).strict().describe("The event to dispatch to the server.")
  }).strict().describe("Triggers a server-side event."),
  external_exports.object({
    "functionCall": FunctionCallSchema
  }).strict().describe("Executes a local client-side function."),
  external_exports.object({
    "event": external_exports.object({
      "name": external_exports.string().describe("The name of the action to be dispatched to the agent."),
      "userMessage": DynamicStringSchema.optional(),
      "context": external_exports.record(external_exports.string(), external_exports.unknown()).describe("A JSON object containing the key-value pairs for the action context. Values can be literals or paths. Use literal values unless the value must be dynamically bound to the data model. Do NOT use paths for static IDs.").optional()
    }).strict().describe("The event to dispatch to the agent.")
  }).strict().describe("Triggers an agent-side event."),
  external_exports.object({
    "functionCall": FunctionCallSchema
  }).strict().describe("Executes a renderer or agent-side function.")
]).describe("REF:common_types.json#/$defs/Action|Defines an interaction handler that can either trigger an agent-side event or execute a local renderer-side function.");
var CallIdSchema = external_exports.string().describe("REF:common_types.json#/$defs/CallId|The unique identifier for a function call.");
var ChildSchema = ComponentIdSchema;
var FunctionCommonSchema = external_exports.object({
  "call": external_exports.string().describe("The name of the function to call.").optional(),
  "@call": external_exports.string().describe("The name of the function to call.").optional(),
  "catalogId": external_exports.string().describe("The catalog ID for this function, overriding any surface-level default catalogId.").optional()
}).refine((data) => data["@call"] !== void 0 || data.call !== void 0, {
  message: "Either '@call' or 'call' must be provided."
}).describe("REF:common_types.json#/$defs/FunctionCommon|Baseline envelope properties common to all function calls. Function-specific argument schemas ('args') are defined individually by each function in the active catalog.");
var IndexSystemFunctionSchema = external_exports.object({
  "call": external_exports.literal("@index").optional(),
  "@call": external_exports.literal("@index").optional(),
  "args": external_exports.object({
    "offset": DynamicNumberSchema.optional()
  }).optional()
}).refine((data) => data["@call"] !== void 0 || data.call !== void 0, {
  message: "Either '@call' or 'call' must be '@index'."
}).describe("REF:common_types.json#/$defs/IndexSystemFunction|Returns the 0-based index of the current item when rendering a dynamic list from a template. This function MUST ONLY be available when evaluating template items within a list context.");
var SurfaceSchema = external_exports.object({
  "component": external_exports.literal("Surface").optional(),
  "child": external_exports.literal("root").optional()
}).strict().describe("REF:common_types.json#/$defs/Surface|The reserved canonical container component representing an A2UI surface. The Surface component is immutable and always has \\'child\\': \\'root\\'.");
var FunctionResponseSchema = external_exports.object({
  "functionCallId": CallIdSchema,
  "value": external_exports.unknown().describe("The return value of the function.").optional(),
  "error": external_exports.object({
    "code": external_exports.string(),
    "message": external_exports.string()
  }).strict().describe("An error object indicating failure of the function execution.").optional()
}).strict().describe("REF:common_types.json#/$defs/FunctionResponse|The return response matching a callAgentFunction or callRendererFunction invocation.");
var CommonSchemas = {
  ComponentId: ComponentIdSchema,
  DataBinding: DataBindingSchema,
  FunctionCall: FunctionCallSchema,
  DynamicString: DynamicStringSchema,
  DynamicBoolean: DynamicBooleanSchema,
  AccessibilityAttributes: AccessibilityAttributesSchema,
  Extensions: ExtensionsSchema,
  ComponentCommon: ComponentCommonSchema,
  ChildList: ChildListSchema,
  DynamicValue: DynamicValueSchema,
  DynamicNumber: DynamicNumberSchema,
  DynamicStringList: DynamicStringListSchema,
  CheckRule: CheckRuleSchema,
  Checkable: CheckableSchema,
  Action: ActionSchema,
  CallId: CallIdSchema,
  Child: ChildSchema,
  FunctionCommon: FunctionCommonSchema,
  IndexSystemFunction: IndexSystemFunctionSchema,
  Surface: SurfaceSchema,
  FunctionResponse: FunctionResponseSchema
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/catalog/json_entries.js
var definitions = /* @__PURE__ */ new WeakMap();
function loadedDefinition(entry) {
  return definitions.get(entry);
}
function defineViews(target, views) {
  for (const [key, compute] of Object.entries(views)) {
    let computed2 = false;
    let value;
    Object.defineProperty(target, key, {
      enumerable: true,
      get() {
        if (!computed2) {
          value = compute();
          computed2 = true;
        }
        return value;
      }
    });
  }
}
function isObject2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : void 0;
}
var JsonComponentApi = class {
  /**
   * @param name The component's name.
   * @param jsonSchema The component's definition, deeply frozen.
   * @param deriveSchema Derives the component's Zod schema from its definition.
   */
  constructor(name, jsonSchema, deriveSchema) {
    this.name = name;
    definitions.set(this, jsonSchema);
    defineViews(this, {
      schema: () => deriveSchema(jsonSchema),
      allowedParents: () => stringList(jsonSchema["allowedParents"]),
      allowedChildren: () => stringList(jsonSchema["allowedChildren"])
    });
    Object.freeze(this);
  }
  /** The component's JSON Schema definition, as its catalog document writes it. */
  get jsonSchema() {
    return definitions.get(this);
  }
};
var JsonFunctionApi = class {
  /**
   * @param name The function's name.
   * @param jsonSchema The function's definition, deeply frozen.
   * @param deriveSchema Derives the Zod schema of the function's arguments
   *     from its definition.
   */
  constructor(name, jsonSchema, deriveSchema) {
    this.name = name;
    definitions.set(this, jsonSchema);
    const props = isObject2(jsonSchema["properties"]) ? jsonSchema["properties"] : void 0;
    const constant = (key) => {
      const property = props?.[key];
      return isObject2(property) ? property["const"] : void 0;
    };
    defineViews(this, {
      schema: () => deriveSchema(jsonSchema),
      returnType: () => {
        const declared = jsonSchema["returnType"] ?? constant("returnType");
        return typeof declared === "string" ? declared : "any";
      },
      description: () => typeof jsonSchema["description"] === "string" ? jsonSchema["description"] : void 0,
      allowedCallers: () => jsonSchema["allowedCallers"] ?? constant("allowedCallers"),
      requiresUserActivation: () => jsonSchema["requiresUserActivation"] ?? constant("requiresUserActivation")
    });
    Object.freeze(this);
  }
  /** The function's JSON Schema definition, as its catalog document writes it. */
  get jsonSchema() {
    return definitions.get(this);
  }
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/Options.js
var ignoreOverride = /* @__PURE__ */ Symbol("Let zodToJsonSchema decide on which parser to use");
var defaultOptions = {
  name: void 0,
  $refStrategy: "root",
  basePath: ["#"],
  effectStrategy: "input",
  pipeStrategy: "all",
  dateStrategy: "format:date-time",
  mapStrategy: "entries",
  removeAdditionalStrategy: "passthrough",
  allowedAdditionalProperties: true,
  rejectedAdditionalProperties: false,
  definitionPath: "definitions",
  target: "jsonSchema7",
  strictUnions: false,
  definitions: {},
  errorMessages: false,
  markdownDescription: false,
  patternStrategy: "escape",
  applyRegexFlags: false,
  emailStrategy: "format:email",
  base64Strategy: "contentEncoding:base64",
  nameStrategy: "ref",
  openAiAnyTypeName: "OpenAiAnyType"
};
var getDefaultOptions = (options) => typeof options === "string" ? {
  ...defaultOptions,
  name: options
} : {
  ...defaultOptions,
  ...options
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/Refs.js
var getRefs = (options) => {
  const _options = getDefaultOptions(options);
  const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
  return {
    ..._options,
    flags: { hasReferencedOpenAiAnyType: false },
    currentPath,
    propertyPath: void 0,
    seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
      def._def,
      {
        def: def._def,
        path: [..._options.basePath, _options.definitionPath, name],
        // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
        jsonSchema: void 0
      }
    ]))
  };
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/errorMessages.js
function addErrorMessage(res, key, errorMessage, refs) {
  if (!refs?.errorMessages)
    return;
  if (errorMessage) {
    res.errorMessage = {
      ...res.errorMessage,
      [key]: errorMessage
    };
  }
}
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
  res[key] = value;
  addErrorMessage(res, key, errorMessage, refs);
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/getRelativePath.js
var getRelativePath = (pathA, pathB) => {
  let i2 = 0;
  for (; i2 < pathA.length && i2 < pathB.length; i2++) {
    if (pathA[i2] !== pathB[i2])
      break;
  }
  return [(pathA.length - i2).toString(), ...pathB.slice(i2)].join("/");
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/any.js
function parseAnyDef(refs) {
  if (refs.target !== "openAi") {
    return {};
  }
  const anyDefinitionPath = [
    ...refs.basePath,
    refs.definitionPath,
    refs.openAiAnyTypeName
  ];
  refs.flags.hasReferencedOpenAiAnyType = true;
  return {
    $ref: refs.$refStrategy === "relative" ? getRelativePath(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/")
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/array.js
function parseArrayDef(def, refs) {
  const res = {
    type: "array"
  };
  if (def.type?._def && def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny) {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
  }
  if (def.minLength) {
    setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
  }
  if (def.maxLength) {
    setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
  }
  if (def.exactLength) {
    setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
    setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
  }
  return res;
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js
function parseBigintDef(def, refs) {
  const res = {
    type: "integer",
    format: "int64"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js
function parseBooleanDef() {
  return {
    type: "boolean"
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/branded.js
function parseBrandedDef(_def, refs) {
  return parseDef(_def.type._def, refs);
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/catch.js
var parseCatchDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/date.js
function parseDateDef(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy ?? refs.dateStrategy;
  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item, i2) => parseDateDef(def, refs, item))
    };
  }
  switch (strategy) {
    case "string":
    case "format:date-time":
      return {
        type: "string",
        format: "date-time"
      };
    case "format:date":
      return {
        type: "string",
        format: "date"
      };
    case "integer":
      return integerDateParser(def, refs);
  }
}
var integerDateParser = (def, refs) => {
  const res = {
    type: "integer",
    format: "unix-time"
  };
  if (refs.target === "openApi3") {
    return res;
  }
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        setResponseValueAndErrors(
          res,
          "minimum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
      case "max":
        setResponseValueAndErrors(
          res,
          "maximum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
    }
  }
  return res;
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/default.js
function parseDefaultDef(_def, refs) {
  return {
    ...parseDef(_def.innerType._def, refs),
    default: _def.defaultValue()
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/effects.js
function parseEffectsDef(_def, refs) {
  return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef(refs);
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/enum.js
function parseEnumDef(def) {
  return {
    type: "string",
    enum: Array.from(def.values)
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js
var isJsonSchema7AllOfType = (type) => {
  if ("type" in type && type.type === "string")
    return false;
  return "allOf" in type;
};
function parseIntersectionDef(def, refs) {
  const allOf = [
    parseDef(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    }),
    parseDef(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "1"]
    })
  ].filter((x2) => !!x2);
  let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
      if (schema.unevaluatedProperties === void 0) {
        unevaluatedProperties = void 0;
      }
    } else {
      let nestedSchema = schema;
      if ("additionalProperties" in schema && schema.additionalProperties === false) {
        const { additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      } else {
        unevaluatedProperties = void 0;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? {
    allOf: mergedAllOf,
    ...unevaluatedProperties
  } : void 0;
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/literal.js
function parseLiteralDef(def, refs) {
  const parsedType = typeof def.value;
  if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
    return {
      type: Array.isArray(def.value) ? "array" : "object"
    };
  }
  if (refs.target === "openApi3") {
    return {
      type: parsedType === "bigint" ? "integer" : parsedType,
      enum: [def.value]
    };
  }
  return {
    type: parsedType === "bigint" ? "integer" : parsedType,
    const: def.value
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/string.js
var emojiRegex2 = void 0;
var zodPatterns = {
  /**
   * `c` was changed to `[cC]` to replicate /i flag
   */
  cuid: /^[cC][^\s-]{8,}$/,
  cuid2: /^[0-9a-z]+$/,
  ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
  /**
   * `a-z` was added to replicate /i flag
   */
  email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
  /**
   * Constructed a valid Unicode RegExp
   *
   * Lazily instantiate since this type of regex isn't supported
   * in all envs (e.g. React Native).
   *
   * See:
   * https://github.com/colinhacks/zod/issues/2433
   * Fix in Zod:
   * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
   */
  emoji: () => {
    if (emojiRegex2 === void 0) {
      emojiRegex2 = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
    }
    return emojiRegex2;
  },
  /**
   * Unused
   */
  uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
  /**
   * Unused
   */
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  /**
   * Unused
   */
  ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
  ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  nanoid: /^[a-zA-Z0-9_-]{21}$/,
  jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
};
function parseStringDef(def, refs) {
  const res = {
    type: "string"
  };
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          break;
        case "max":
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "email":
          switch (refs.emailStrategy) {
            case "format:email":
              addFormat(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern(res, zodPatterns.email, check.message, refs);
              break;
          }
          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern(res, check.regex, check.message, refs);
          break;
        case "cuid":
          addPattern(res, zodPatterns.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern(res, zodPatterns.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs);
          break;
        case "endsWith":
          addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs);
          break;
        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat(res, "date", check.message, refs);
          break;
        case "time":
          addFormat(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat(res, "duration", check.message, refs);
          break;
        case "length":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "includes": {
          addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs);
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "base64url":
          addPattern(res, zodPatterns.base64url, check.message, refs);
          break;
        case "jwt":
          addPattern(res, zodPatterns.jwt, check.message, refs);
          break;
        case "cidr": {
          if (check.version !== "v6") {
            addPattern(res, zodPatterns.ipv4Cidr, check.message, refs);
          }
          if (check.version !== "v4") {
            addPattern(res, zodPatterns.ipv6Cidr, check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern(res, zodPatterns.emoji(), check.message, refs);
          break;
        case "ulid": {
          addPattern(res, zodPatterns.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat(res, "binary", check.message, refs);
              break;
            }
            case "contentEncoding:base64": {
              setResponseValueAndErrors(res, "contentEncoding", "base64", check.message, refs);
              break;
            }
            case "pattern:zod": {
              addPattern(res, zodPatterns.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern(res, zodPatterns.nanoid, check.message, refs);
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          break;
        default:
          /* @__PURE__ */ ((_2) => {
          })(check);
      }
    }
  }
  return res;
}
function escapeLiteralCheckValue(literal, refs) {
  return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal) : literal;
}
var ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
function escapeNonAlphaNumeric(source) {
  let result = "";
  for (let i2 = 0; i2 < source.length; i2++) {
    if (!ALPHA_NUMERIC.has(source[i2])) {
      result += "\\";
    }
    result += source[i2];
  }
  return result;
}
function addFormat(schema, value, message, refs) {
  if (schema.format || schema.anyOf?.some((x2) => x2.format)) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }
    if (schema.format) {
      schema.anyOf.push({
        format: schema.format,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { format: schema.errorMessage.format }
        }
      });
      delete schema.format;
      if (schema.errorMessage) {
        delete schema.errorMessage.format;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.anyOf.push({
      format: value,
      ...message && refs.errorMessages && { errorMessage: { format: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "format", value, message, refs);
  }
}
function addPattern(schema, regex, message, refs) {
  if (schema.pattern || schema.allOf?.some((x2) => x2.pattern)) {
    if (!schema.allOf) {
      schema.allOf = [];
    }
    if (schema.pattern) {
      schema.allOf.push({
        pattern: schema.pattern,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { pattern: schema.errorMessage.pattern }
        }
      });
      delete schema.pattern;
      if (schema.errorMessage) {
        delete schema.errorMessage.pattern;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.allOf.push({
      pattern: stringifyRegExpWithFlags(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
  }
}
function stringifyRegExpWithFlags(regex, refs) {
  if (!refs.applyRegexFlags || !regex.flags) {
    return regex.source;
  }
  const flags = {
    i: regex.flags.includes("i"),
    m: regex.flags.includes("m"),
    s: regex.flags.includes("s")
    // `.` matches newlines
  };
  const source = flags.i ? regex.source.toLowerCase() : regex.source;
  let pattern = "";
  let isEscaped = false;
  let inCharGroup = false;
  let inCharRange = false;
  for (let i2 = 0; i2 < source.length; i2++) {
    if (isEscaped) {
      pattern += source[i2];
      isEscaped = false;
      continue;
    }
    if (flags.i) {
      if (inCharGroup) {
        if (source[i2].match(/[a-z]/)) {
          if (inCharRange) {
            pattern += source[i2];
            pattern += `${source[i2 - 2]}-${source[i2]}`.toUpperCase();
            inCharRange = false;
          } else if (source[i2 + 1] === "-" && source[i2 + 2]?.match(/[a-z]/)) {
            pattern += source[i2];
            inCharRange = true;
          } else {
            pattern += `${source[i2]}${source[i2].toUpperCase()}`;
          }
          continue;
        }
      } else if (source[i2].match(/[a-z]/)) {
        pattern += `[${source[i2]}${source[i2].toUpperCase()}]`;
        continue;
      }
    }
    if (flags.m) {
      if (source[i2] === "^") {
        pattern += `(^|(?<=[\r
]))`;
        continue;
      } else if (source[i2] === "$") {
        pattern += `($|(?=[\r
]))`;
        continue;
      }
    }
    if (flags.s && source[i2] === ".") {
      pattern += inCharGroup ? `${source[i2]}\r
` : `[${source[i2]}\r
]`;
      continue;
    }
    pattern += source[i2];
    if (source[i2] === "\\") {
      isEscaped = true;
    } else if (inCharGroup && source[i2] === "]") {
      inCharGroup = false;
    } else if (!inCharGroup && source[i2] === "[") {
      inCharGroup = true;
    }
  }
  try {
    new RegExp(pattern);
  } catch {
    console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
    return regex.source;
  }
  return pattern;
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/record.js
function parseRecordDef(def, refs) {
  if (refs.target === "openAi") {
    console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
  }
  if (refs.target === "openApi3" && def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      type: "object",
      required: def.keyType._def.values,
      properties: def.keyType._def.values.reduce((acc, key) => ({
        ...acc,
        [key]: parseDef(def.valueType._def, {
          ...refs,
          currentPath: [...refs.currentPath, "properties", key]
        }) ?? parseAnyDef(refs)
      }), {}),
      additionalProperties: refs.rejectedAdditionalProperties
    };
  }
  const schema = {
    type: "object",
    additionalProperties: parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? refs.allowedAdditionalProperties
  };
  if (refs.target === "openApi3") {
    return schema;
  }
  if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.checks?.length) {
    const { type, ...keyType } = parseStringDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values
      }
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.type._def.checks?.length) {
    const { type, ...keyType } = parseBrandedDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  }
  return schema;
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/map.js
function parseMapDef(def, refs) {
  if (refs.mapStrategy === "record") {
    return parseRecordDef(def, refs);
  }
  const keys = parseDef(def.keyType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "0"]
  }) || parseAnyDef(refs);
  const values = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || parseAnyDef(refs);
  return {
    type: "array",
    maxItems: 125,
    items: {
      type: "array",
      items: [keys, values],
      minItems: 2,
      maxItems: 2
    }
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js
function parseNativeEnumDef(def) {
  const object = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object[object[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object[key]);
  const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/never.js
function parseNeverDef(refs) {
  return refs.target === "openAi" ? void 0 : {
    not: parseAnyDef({
      ...refs,
      currentPath: [...refs.currentPath, "not"]
    })
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/null.js
function parseNullDef(refs) {
  return refs.target === "openApi3" ? {
    enum: ["null"],
    nullable: true
  } : {
    type: "null"
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/union.js
var primitiveMappings = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBigInt: "integer",
  ZodBoolean: "boolean",
  ZodNull: "null"
};
function parseUnionDef(def, refs) {
  if (refs.target === "openApi3")
    return asAnyOf(def, refs);
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every((x2) => x2._def.typeName in primitiveMappings && (!x2._def.checks || !x2._def.checks.length))) {
    const types = options.reduce((types2, x2) => {
      const type = primitiveMappings[x2._def.typeName];
      return type && !types2.includes(type) ? [...types2, type] : types2;
    }, []);
    return {
      type: types.length > 1 ? types : types[0]
    };
  } else if (options.every((x2) => x2._def.typeName === "ZodLiteral" && !x2.description)) {
    const types = options.reduce((acc, x2) => {
      const type = typeof x2._def.value;
      switch (type) {
        case "string":
        case "number":
        case "boolean":
          return [...acc, type];
        case "bigint":
          return [...acc, "integer"];
        case "object":
          if (x2._def.value === null)
            return [...acc, "null"];
        case "symbol":
        case "undefined":
        case "function":
        default:
          return acc;
      }
    }, []);
    if (types.length === options.length) {
      const uniqueTypes = types.filter((x2, i2, a2) => a2.indexOf(x2) === i2);
      return {
        type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
        enum: options.reduce((acc, x2) => {
          return acc.includes(x2._def.value) ? acc : [...acc, x2._def.value];
        }, [])
      };
    }
  } else if (options.every((x2) => x2._def.typeName === "ZodEnum")) {
    return {
      type: "string",
      enum: options.reduce((acc, x2) => [
        ...acc,
        ...x2._def.values.filter((x3) => !acc.includes(x3))
      ], [])
    };
  }
  return asAnyOf(def, refs);
}
var asAnyOf = (def, refs) => {
  const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x2, i2) => parseDef(x2._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", `${i2}`]
  })).filter((x2) => !!x2 && (!refs.strictUnions || typeof x2 === "object" && Object.keys(x2).length > 0));
  return anyOf.length ? { anyOf } : void 0;
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js
function parseNullableDef(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    if (refs.target === "openApi3") {
      return {
        type: primitiveMappings[def.innerType._def.typeName],
        nullable: true
      };
    }
    return {
      type: [
        primitiveMappings[def.innerType._def.typeName],
        "null"
      ]
    };
  }
  if (refs.target === "openApi3") {
    const base2 = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath]
    });
    if (base2 && "$ref" in base2)
      return { allOf: [base2], nullable: true };
    return base2 && { ...base2, nullable: true };
  }
  const base = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/number.js
function parseNumberDef(def, refs) {
  const res = {
    type: "number"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "int":
        res.type = "integer";
        addErrorMessage(res, "type", check.message, refs);
        break;
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/object.js
function parseObjectDef(def, refs) {
  const forceOptionalIntoNullable = refs.target === "openAi";
  const result = {
    type: "object",
    properties: {}
  };
  const required = [];
  const shape = def.shape();
  for (const propName in shape) {
    let propDef = shape[propName];
    if (propDef === void 0 || propDef._def === void 0) {
      continue;
    }
    let propOptional = safeIsOptional(propDef);
    if (propOptional && forceOptionalIntoNullable) {
      if (propDef._def.typeName === "ZodOptional") {
        propDef = propDef._def.innerType;
      }
      if (!propDef.isNullable()) {
        propDef = propDef.nullable();
      }
      propOptional = false;
    }
    const parsedDef = parseDef(propDef._def, {
      ...refs,
      currentPath: [...refs.currentPath, "properties", propName],
      propertyPath: [...refs.currentPath, "properties", propName]
    });
    if (parsedDef === void 0) {
      continue;
    }
    result.properties[propName] = parsedDef;
    if (!propOptional) {
      required.push(propName);
    }
  }
  if (required.length) {
    result.required = required;
  }
  const additionalProperties = decideAdditionalProperties(def, refs);
  if (additionalProperties !== void 0) {
    result.additionalProperties = additionalProperties;
  }
  return result;
}
function decideAdditionalProperties(def, refs) {
  if (def.catchall._def.typeName !== "ZodNever") {
    return parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    });
  }
  switch (def.unknownKeys) {
    case "passthrough":
      return refs.allowedAdditionalProperties;
    case "strict":
      return refs.rejectedAdditionalProperties;
    case "strip":
      return refs.removeAdditionalStrategy === "strict" ? refs.allowedAdditionalProperties : refs.rejectedAdditionalProperties;
  }
}
function safeIsOptional(schema) {
  try {
    return schema.isOptional();
  } catch {
    return true;
  }
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/optional.js
var parseOptionalDef = (def, refs) => {
  if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
    return parseDef(def.innerType._def, refs);
  }
  const innerSchema2 = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "1"]
  });
  return innerSchema2 ? {
    anyOf: [
      {
        not: parseAnyDef(refs)
      },
      innerSchema2
    ]
  } : parseAnyDef(refs);
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js
var parsePipelineDef = (def, refs) => {
  if (refs.pipeStrategy === "input") {
    return parseDef(def.in._def, refs);
  } else if (refs.pipeStrategy === "output") {
    return parseDef(def.out._def, refs);
  }
  const a2 = parseDef(def.in._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", "0"]
  });
  const b2 = parseDef(def.out._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", a2 ? "1" : "0"]
  });
  return {
    allOf: [a2, b2].filter((x2) => x2 !== void 0)
  };
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/promise.js
function parsePromiseDef(def, refs) {
  return parseDef(def.type._def, refs);
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/set.js
function parseSetDef(def, refs) {
  const items = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items"]
  });
  const schema = {
    type: "array",
    uniqueItems: true,
    items
  };
  if (def.minSize) {
    setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
  }
  if (def.maxSize) {
    setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
  }
  return schema;
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js
function parseTupleDef(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map((x2, i2) => parseDef(x2._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i2}`]
      })).reduce((acc, x2) => x2 === void 0 ? acc : [...acc, x2], []),
      additionalItems: parseDef(def.rest._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalItems"]
      })
    };
  } else {
    return {
      type: "array",
      minItems: def.items.length,
      maxItems: def.items.length,
      items: def.items.map((x2, i2) => parseDef(x2._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i2}`]
      })).reduce((acc, x2) => x2 === void 0 ? acc : [...acc, x2], [])
    };
  }
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js
function parseUndefinedDef(refs) {
  return {
    not: parseAnyDef(refs)
  };
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js
function parseUnknownDef(refs) {
  return parseAnyDef(refs);
}

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js
var parseReadonlyDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/selectParser.js
var selectParser = (def, typeName, refs) => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def, refs);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef(refs);
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef(refs);
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return parseUnionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef(def, refs);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseOptionalDef(def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return () => def.getter()._def;
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNaN:
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef(refs);
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef(refs);
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef(refs);
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBranded:
      return parseBrandedDef(def, refs);
    case ZodFirstPartyTypeKind.ZodReadonly:
      return parseReadonlyDef(def, refs);
    case ZodFirstPartyTypeKind.ZodCatch:
      return parseCatchDef(def, refs);
    case ZodFirstPartyTypeKind.ZodPipeline:
      return parsePipelineDef(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
    case ZodFirstPartyTypeKind.ZodSymbol:
      return void 0;
    default:
      return /* @__PURE__ */ ((_2) => void 0)(typeName);
  }
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/parseDef.js
function parseDef(def, refs, forceResolution = false) {
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
    if (overrideResult !== ignoreOverride) {
      return overrideResult;
    }
  }
  if (seenItem && !forceResolution) {
    const seenSchema = get$ref(seenItem, refs);
    if (seenSchema !== void 0) {
      return seenSchema;
    }
  }
  const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
  refs.seen.set(def, newItem);
  const jsonSchemaOrGetter = selectParser(def, def.typeName, refs);
  const jsonSchema = typeof jsonSchemaOrGetter === "function" ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
  if (jsonSchema) {
    addMeta(def, refs, jsonSchema);
  }
  if (refs.postProcess) {
    const postProcessResult = refs.postProcess(jsonSchema, def, refs);
    newItem.jsonSchema = jsonSchema;
    return postProcessResult;
  }
  newItem.jsonSchema = jsonSchema;
  return jsonSchema;
}
var get$ref = (item, refs) => {
  switch (refs.$refStrategy) {
    case "root":
      return { $ref: item.path.join("/") };
    case "relative":
      return { $ref: getRelativePath(refs.currentPath, item.path) };
    case "none":
    case "seen": {
      if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
        console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
        return parseAnyDef(refs);
      }
      return refs.$refStrategy === "seen" ? parseAnyDef(refs) : void 0;
    }
  }
};
var addMeta = (def, refs, jsonSchema) => {
  if (def.description) {
    jsonSchema.description = def.description;
    if (refs.markdownDescription) {
      jsonSchema.markdownDescription = def.description;
    }
  }
  return jsonSchema;
};

// ../../node_modules/.pnpm/zod-to-json-schema@3.25.2_zod@3.25.76/node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js
var zodToJsonSchema = (schema, options) => {
  const refs = getRefs(options);
  let definitions2 = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name2, schema2]) => ({
    ...acc,
    [name2]: parseDef(schema2._def, {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name2]
    }, true) ?? parseAnyDef(refs)
  }), {}) : void 0;
  const name = typeof options === "string" ? options : options?.nameStrategy === "title" ? void 0 : options?.name;
  const main = parseDef(schema._def, name === void 0 ? refs : {
    ...refs,
    currentPath: [...refs.basePath, refs.definitionPath, name]
  }, false) ?? parseAnyDef(refs);
  const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
  if (title !== void 0) {
    main.title = title;
  }
  if (refs.flags.hasReferencedOpenAiAnyType) {
    if (!definitions2) {
      definitions2 = {};
    }
    if (!definitions2[refs.openAiAnyTypeName]) {
      definitions2[refs.openAiAnyTypeName] = {
        // Skipping "object" as no properties can be defined and additionalProperties must be "false"
        type: ["string", "number", "integer", "boolean", "array", "null"],
        items: {
          $ref: refs.$refStrategy === "relative" ? "1" : [
            ...refs.basePath,
            refs.definitionPath,
            refs.openAiAnyTypeName
          ].join("/")
        }
      };
    }
  }
  const combined = name === void 0 ? definitions2 ? {
    ...main,
    [refs.definitionPath]: definitions2
  } : main : {
    $ref: [
      ...refs.$refStrategy === "relative" ? [] : refs.basePath,
      refs.definitionPath,
      name
    ].join("/"),
    [refs.definitionPath]: {
      ...definitions2,
      [name]: main
    }
  };
  if (refs.target === "jsonSchema7") {
    combined.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
    combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
  }
  if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) {
    console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
  }
  return combined;
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/catalog/spec_annotations.js
var annotations = /* @__PURE__ */ new WeakMap();
function getSpecAnnotation(schema) {
  return typeof schema === "object" && schema !== null ? annotations.get(schema) : void 0;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v0_8/standard_defs.js
var V08_STANDARD_DEFS = {
  "ComponentId": {
    "description": "The unique identifier for a component, used for both definitions and references within the same surface.",
    "type": "string"
  },
  "TextItem": {
    "additionalProperties": false,
    "description": "The value of the text field. This can be a literal string or a reference to a value in the data model ('path', e.g. '/user/name').",
    "properties": {
      "literalString": {
        "type": "string"
      },
      "path": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "UrlItem": {
    "additionalProperties": false,
    "description": "The URL of the audio to be played. This can be a literal string ('literal') or a reference to a value in the data model ('path', e.g. '/song/url').",
    "properties": {
      "literalString": {
        "type": "string"
      },
      "path": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "AltTextItem": {
    "additionalProperties": false,
    "description": "The alt text for the image. This can be a literal string ('literal') or a reference to a value in the data model ('path', e.g. '/thumbnail/altText').",
    "properties": {
      "literalString": {
        "type": "string"
      },
      "path": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "NameItem": {
    "additionalProperties": false,
    "description": "The name of the icon to display. This can be a literal string or a reference to a value in the data model ('path', e.g. '/form/submit').",
    "properties": {
      "literalString": {
        "enum": [
          "accountCircle",
          "add",
          "arrowBack",
          "arrowForward",
          "attachFile",
          "calendarToday",
          "call",
          "camera",
          "check",
          "close",
          "delete",
          "download",
          "edit",
          "event",
          "error",
          "favorite",
          "favoriteOff",
          "folder",
          "help",
          "home",
          "info",
          "locationOn",
          "lock",
          "lockOpen",
          "mail",
          "menu",
          "moreVert",
          "moreHoriz",
          "notificationsOff",
          "notifications",
          "payment",
          "person",
          "phone",
          "photo",
          "print",
          "refresh",
          "search",
          "send",
          "settings",
          "share",
          "shoppingCart",
          "star",
          "starHalf",
          "starOff",
          "upload",
          "visibility",
          "visibilityOff",
          "warning"
        ],
        "type": "string"
      },
      "path": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "DescriptionItem": {
    "additionalProperties": false,
    "description": "A description of the audio, such as a title or summary. This can be a literal string or a reference to a value in the data model ('path', e.g. '/song/title').",
    "properties": {
      "literalString": {
        "type": "string"
      },
      "path": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "ChildrenItem": {
    "additionalProperties": false,
    "description": "Defines the children. Use 'explicitList' for a fixed set of children, or 'template' to generate children from a data list.",
    "properties": {
      "explicitList": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "template": {
        "$ref": "#/$defs/TemplateItem",
        "description": "A template for generating a dynamic list of children from a data model list. `componentId` is the component to use as a template, and `dataBinding` is the path to the map of components in the data model. Values in the map will define the list of children."
      }
    },
    "type": "object"
  },
  "TemplateItem": {
    "additionalProperties": false,
    "description": "A template for generating a dynamic list of children from a data model list. `componentId` is the component to use as a template, and `dataBinding` is the path to the map of components in the data model. Values in the map will define the list of children.",
    "properties": {
      "componentId": {
        "type": "string"
      },
      "dataBinding": {
        "type": "string"
      }
    },
    "required": ["componentId", "dataBinding"],
    "type": "object"
  },
  "TabItemItem": {
    "additionalProperties": false,
    "properties": {
      "child": {
        "type": "string"
      },
      "title": {
        "$ref": "#/$defs/TitleItem"
      }
    },
    "required": ["title", "child"],
    "type": "object"
  },
  "TitleItem": {
    "additionalProperties": false,
    "description": "The tab title. Defines the value as either a literal value or a path to data model value (e.g. '/options/title').",
    "properties": {
      "literalString": {
        "type": "string"
      },
      "path": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "ActionItem": {
    "additionalProperties": false,
    "description": "The client-side action to be dispatched when the button is clicked. It includes the action's name and an optional context payload.",
    "properties": {
      "context": {
        "items": {
          "$ref": "#/$defs/ContextItem"
        },
        "type": "array"
      },
      "name": {
        "type": "string"
      }
    },
    "required": ["name"],
    "type": "object"
  },
  "ContextItem": {
    "additionalProperties": false,
    "properties": {
      "key": {
        "type": "string"
      },
      "value": {
        "$ref": "#/$defs/ValueItem",
        "description": "Defines the value to be included in the context as either a literal value or a path to a data model value (e.g. '/user/name')."
      }
    },
    "required": ["key", "value"],
    "type": "object"
  },
  "ValueItem": {
    "additionalProperties": false,
    "description": "The current value of the slider. This can be a literal number ('literalNumber') or a reference to a value in the data model ('path', e.g. '/restaurant/cost').",
    "properties": {
      "literalNumber": {
        "type": "number"
      },
      "path": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "LabelItem": {
    "additionalProperties": false,
    "description": "The label for the slider. This can be a literal string or a reference to a value in the data model ('path').",
    "properties": {
      "literalString": {
        "type": "string"
      },
      "path": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "OptionItem": {
    "additionalProperties": false,
    "properties": {
      "label": {
        "$ref": "#/$defs/LabelItem",
        "description": "The text to display for this option. This can be a literal string or a reference to a value in the data model (e.g. '/option/label')."
      },
      "value": {
        "description": "The value to be associated with this option when selected.",
        "type": "string"
      }
    },
    "required": ["label", "value"],
    "type": "object"
  },
  "SelectionItem": {
    "additionalProperties": false,
    "description": "The currently selected values for the component. This can be a literal array of strings or a path to an array in the data model('path', e.g. '/hotel/options').",
    "properties": {
      "literalArray": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "path": {
        "type": "string"
      }
    },
    "type": "object"
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v0_9/standard_defs.js
var V09_CHILD_REF_OPTIONS = {
  childRefNames: /* @__PURE__ */ new Set(["ComponentId", "Child", "ChildComponentId"]),
  childListRefNames: /* @__PURE__ */ new Set(["ChildList", "TemplateChildList", "ChildrenItem", "TemplateItem"])
};
var V09_STANDARD_DEFS = {
  "ComponentId": {
    "type": "string",
    "description": "The unique identifier for a component, used for both definitions and references within the same surface."
  },
  "AccessibilityAttributes": {
    "type": "object",
    "description": "Attributes to enhance accessibility when using assistive technologies like screen readers.",
    "properties": {
      "label": {
        "$ref": "#/$defs/DynamicString",
        "description": "A short string, typically 1 to 3 words, used by assistive technologies to convey the purpose or intent of an element. For example, an input field might have an accessible label of 'User ID' or a button might be labeled 'Submit'."
      },
      "description": {
        "$ref": "#/$defs/DynamicString",
        "description": "Additional information provided by assistive technologies about an element such as instructions, format requirements, or result of an action. For example, a mute button might have a label of 'Mute' and a description of 'Silences notifications about this conversation'."
      }
    }
  },
  "ComponentCommon": {
    "type": "object",
    "properties": {
      "id": {
        "$ref": "#/$defs/ComponentId"
      },
      "accessibility": {
        "$ref": "#/$defs/AccessibilityAttributes"
      }
    },
    "required": ["id"]
  },
  "ChildList": {
    "oneOf": [
      {
        "type": "array",
        "description": "A static list of child component IDs.",
        "items": {
          "$ref": "#/$defs/ComponentId"
        }
      },
      {
        "type": "object",
        "description": "A template for generating a dynamic list of children from a data model list. The `componentId` is the component to use as a template.",
        "properties": {
          "componentId": {
            "$ref": "#/$defs/ComponentId"
          },
          "path": {
            "type": "string",
            "description": "The path to the list of component property objects in the data model."
          }
        },
        "required": ["componentId", "path"],
        "additionalProperties": false
      }
    ]
  },
  "DataBinding": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "A JSON Pointer path to a value in the data model."
      }
    },
    "required": ["path"],
    "additionalProperties": false
  },
  "DynamicValue": {
    "description": "A value that can be a literal, a path, or a function call returning any type.",
    "oneOf": [
      {
        "type": "string"
      },
      {
        "type": "number"
      },
      {
        "type": "boolean"
      },
      {
        "type": "array"
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "$ref": "#/$defs/FunctionCall"
      }
    ]
  },
  "DynamicString": {
    "description": "Represents a string",
    "oneOf": [
      {
        "type": "string"
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "allOf": [
          {
            "$ref": "#/$defs/FunctionCall"
          },
          {
            "properties": {
              "returnType": {
                "const": "string"
              }
            }
          }
        ]
      }
    ]
  },
  "DynamicNumber": {
    "description": "Represents a value that can be either a literal number, a path to a number in the data model, or a function call returning a number.",
    "oneOf": [
      {
        "type": "number"
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "allOf": [
          {
            "$ref": "#/$defs/FunctionCall"
          },
          {
            "properties": {
              "returnType": {
                "const": "number"
              }
            }
          }
        ]
      }
    ]
  },
  "DynamicBoolean": {
    "description": "A boolean value that can be a literal, a path, or a function call returning a boolean.",
    "oneOf": [
      {
        "type": "boolean"
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "allOf": [
          {
            "$ref": "#/$defs/FunctionCall"
          },
          {
            "properties": {
              "returnType": {
                "const": "boolean"
              }
            }
          }
        ]
      }
    ]
  },
  "DynamicStringList": {
    "description": "Represents a value that can be either a literal array of strings, a path to a string array in the data model, or a function call returning a string array.",
    "oneOf": [
      {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "allOf": [
          {
            "$ref": "#/$defs/FunctionCall"
          },
          {
            "properties": {
              "returnType": {
                "const": "array"
              }
            }
          }
        ]
      }
    ]
  },
  "FunctionCall": {
    "type": "object",
    "description": "Invokes a named function on the client.",
    "properties": {
      "call": {
        "type": "string",
        "description": "The name of the function to call."
      },
      "args": {
        "type": "object",
        "description": "Arguments passed to the function.",
        "additionalProperties": {
          "anyOf": [
            {
              "$ref": "#/$defs/DynamicValue"
            },
            {
              "type": "object",
              "description": "A literal object argument (e.g. configuration)."
            }
          ]
        }
      },
      "returnType": {
        "type": "string",
        "description": "The expected return type of the function call.",
        "enum": ["string", "number", "boolean", "array", "object", "any", "void"],
        "default": "boolean"
      }
    },
    "required": ["call"],
    "oneOf": [
      {
        "$ref": "catalog.json#/$defs/anyFunction"
      }
    ]
  },
  "CheckRule": {
    "type": "object",
    "description": "A single validation rule applied to an input component.",
    "properties": {
      "condition": {
        "$ref": "#/$defs/DynamicBoolean"
      },
      "message": {
        "type": "string",
        "description": "The error message to display if the check fails."
      }
    },
    "required": ["condition", "message"],
    "additionalProperties": false
  },
  "Checkable": {
    "type": "object",
    "description": "Properties for components that support client-side checks.",
    "properties": {
      "checks": {
        "type": "array",
        "description": "A list of checks to perform. These are function calls that must return a boolean indicating validity.",
        "items": {
          "$ref": "#/$defs/CheckRule"
        }
      }
    }
  },
  "Action": {
    "description": "Defines an interaction handler that can either trigger a server-side event or execute a local client-side function.",
    "oneOf": [
      {
        "type": "object",
        "description": "Triggers a server-side event.",
        "properties": {
          "event": {
            "type": "object",
            "description": "The event to dispatch to the server.",
            "properties": {
              "name": {
                "type": "string",
                "description": "The name of the action to be dispatched to the server."
              },
              "context": {
                "type": "object",
                "description": "A JSON object containing the key-value pairs for the action context. Values can be literals or paths. Use literal values unless the value must be dynamically bound to the data model. Do NOT use paths for static IDs.",
                "additionalProperties": {
                  "$ref": "#/$defs/DynamicValue"
                }
              }
            },
            "required": ["name"],
            "additionalProperties": false
          }
        },
        "required": ["event"],
        "additionalProperties": false
      },
      {
        "type": "object",
        "description": "Executes a local client-side function.",
        "properties": {
          "functionCall": {
            "$ref": "#/$defs/FunctionCall"
          }
        },
        "required": ["functionCall"],
        "additionalProperties": false
      }
    ]
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v1_0/standard_defs.js
var V10_STANDARD_DEFS = {
  "ComponentId": {
    "type": "string",
    "description": "The unique identifier for a component, used for both definitions and references within the same surface."
  },
  "CallId": {
    "type": "string",
    "description": "The unique identifier for a function call."
  },
  "AccessibilityAttributes": {
    "type": "object",
    "description": "Attributes to enhance accessibility when using assistive technologies like screen readers or model understanding.",
    "properties": {
      "label": {
        "$ref": "#/$defs/DynamicString",
        "description": "A short string, typically 1 to 3 words, used by assistive technologies to convey the purpose or intent of an element. For example, an input field might have an accessible label of 'User ID' or a button might be labeled 'Submit'."
      },
      "description": {
        "$ref": "#/$defs/DynamicString",
        "description": "Additional information provided by assistive technologies about an element such as instructions, format requirements, or result of an action. For example, a mute button might have a label of 'Mute' and a description of 'Silences notifications about this conversation'."
      },
      "live": {
        "type": "string",
        "description": "Controls screen reader announcements for dynamic updates (WAI-ARIA aria-live). 'polite' waits for user pause; 'assertive' interrupts immediately for alerts.",
        "enum": ["off", "polite", "assertive"],
        "default": "off"
      },
      "hidden": {
        "$ref": "#/$defs/DynamicBoolean",
        "description": "Hides the element and its children from assistive technologies when true. Default is false."
      }
    },
    "additionalProperties": false
  },
  "Extensions": {
    "type": "object",
    "description": "Optional extension metadata. Keys MUST be Unicode identifiers (UAX #31). Keys starting with 'a2ui_' are reserved for official extensions.",
    "patternProperties": {
      "^[\\p{XID_Start}_][\\p{XID_Continue}]*$": {}
    },
    "additionalProperties": false
  },
  "ComponentCommon": {
    "type": "object",
    "properties": {
      "id": {
        "$ref": "#/$defs/ComponentId"
      },
      "catalogId": {
        "type": "string",
        "description": "The catalog ID for this component, overriding any surface-level default catalogId."
      },
      "accessibility": {
        "$ref": "#/$defs/AccessibilityAttributes"
      },
      "metadata": {
        "type": "object",
        "description": "Optional component-level metadata for vendor extensions.",
        "properties": {
          "extensions": {
            "$ref": "#/$defs/Extensions"
          }
        },
        "additionalProperties": false
      }
    },
    "required": ["id"]
  },
  "Child": {
    "$ref": "#/$defs/ComponentId",
    "description": "A reference to a single child component ID."
  },
  "ChildList": {
    "oneOf": [
      {
        "type": "array",
        "description": "A static list of child component IDs.",
        "items": {
          "$ref": "#/$defs/ComponentId"
        }
      },
      {
        "type": "object",
        "description": "A template for generating a dynamic list of children from a data model list. The `componentId` is the component to use as a template.",
        "properties": {
          "componentId": {
            "$ref": "#/$defs/ComponentId"
          },
          "path": {
            "type": "string",
            "description": "The path to the list of component property objects in the data model."
          }
        },
        "required": ["componentId", "path"],
        "additionalProperties": false
      }
    ]
  },
  "DataBinding": {
    "type": "object",
    "properties": {
      "@path": {
        "type": "string",
        "description": "A JSON Pointer path to a value in the data model."
      }
    },
    "required": ["@path"],
    "additionalProperties": false
  },
  "DynamicValue": {
    "description": "A value that can be a literal, a path, or a function call returning any type.",
    "oneOf": [
      {
        "type": "string"
      },
      {
        "type": "number"
      },
      {
        "type": "boolean"
      },
      {
        "type": "array"
      },
      {
        "type": "object",
        "propertyNames": {
          "not": {
            "pattern": "^@([^@]|$)"
          }
        },
        "not": {
          "anyOf": [
            {
              "required": ["@path"]
            },
            {
              "required": ["@call"]
            }
          ]
        }
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "$ref": "#/$defs/FunctionCall"
      }
    ]
  },
  "DynamicString": {
    "description": "Represents a string",
    "oneOf": [
      {
        "type": "string"
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "$ref": "#/$defs/FunctionCall"
      }
    ]
  },
  "DynamicNumber": {
    "description": "Represents a value that can be either a literal number, a path to a number in the data model, or a function call returning a number.",
    "oneOf": [
      {
        "type": "number"
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "$ref": "#/$defs/FunctionCall"
      }
    ]
  },
  "DynamicBoolean": {
    "description": "A boolean value that can be a literal, a path, or a function call returning a boolean or a validation result object (coerced to its 'valid' boolean).",
    "oneOf": [
      {
        "type": "boolean"
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "$ref": "#/$defs/FunctionCall"
      }
    ]
  },
  "DynamicStringList": {
    "description": "Represents a value that can be either a literal array of strings, a path to a string array in the data model, or a function call returning a string array.",
    "oneOf": [
      {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      {
        "$ref": "#/$defs/DataBinding"
      },
      {
        "$ref": "#/$defs/FunctionCall"
      }
    ]
  },
  "FunctionCommon": {
    "type": "object",
    "description": "Baseline envelope properties common to all function calls. Function-specific argument schemas ('args') are defined individually by each function in the active catalog.",
    "properties": {
      "@call": {
        "type": "string",
        "description": "The name of the function to call."
      },
      "catalogId": {
        "type": "string",
        "description": "The catalog ID for this function, overriding any surface-level default catalogId."
      }
    },
    "required": ["@call"]
  },
  "IndexSystemFunction": {
    "type": "object",
    "description": "Returns the 0-based index of the current item when rendering a dynamic list from a template. This function MUST ONLY be available when evaluating template items within a list context.",
    "properties": {
      "@call": {
        "const": "@index"
      },
      "args": {
        "type": "object",
        "properties": {
          "offset": {
            "$ref": "#/$defs/DynamicNumber",
            "description": "Optional. An offset to add to the 0-based index (e.g., 1 for 1-based indexing). Defaults to 0.",
            "default": 0
          }
        },
        "unevaluatedProperties": false
      }
    },
    "required": ["@call"],
    "unevaluatedProperties": false
  },
  "FunctionCall": {
    "type": "object",
    "description": "Invokes a named function, combining common function properties with the catalog function definition.",
    "allOf": [
      {
        "$ref": "#/$defs/FunctionCommon"
      },
      {
        "oneOf": [
          {
            "$ref": "catalog.json#/$defs/anyFunction"
          },
          {
            "$ref": "#/$defs/IndexSystemFunction"
          }
        ]
      }
    ],
    "unevaluatedProperties": false
  },
  "CheckRule": {
    "type": "object",
    "description": "A single validation check rule applied to an input component. The condition function or path evaluates to a structured validation result object or a boolean (which is coerced to a validation result object).",
    "properties": {
      "condition": {
        "description": "Path or function call evaluating to a structured validation result object or a boolean.",
        "oneOf": [
          {
            "$ref": "#/$defs/DataBinding"
          },
          {
            "$ref": "#/$defs/FunctionCall"
          }
        ]
      },
      "message": {
        "type": "string",
        "description": "Optional fallback error message."
      }
    },
    "required": ["condition"],
    "additionalProperties": false
  },
  "Checkable": {
    "type": "object",
    "description": "Properties for components that support renderer-side checks.",
    "properties": {
      "checks": {
        "type": "array",
        "description": "A list of validation check rules to perform on the component.",
        "items": {
          "$ref": "#/$defs/CheckRule"
        }
      }
    }
  },
  "Action": {
    "description": "Defines an interaction handler that can either trigger an agent-side event or execute a local renderer-side function.",
    "oneOf": [
      {
        "type": "object",
        "description": "Triggers an agent-side event.",
        "properties": {
          "event": {
            "type": "object",
            "description": "The event to dispatch to the agent.",
            "properties": {
              "name": {
                "type": "string",
                "description": "The name of the action to be dispatched to the agent."
              },
              "userMessage": {
                "$ref": "#/$defs/DynamicString",
                "description": "An optional human-readable message describing the action performed by the user, resolved by the renderer and included in the outbound action message."
              },
              "context": {
                "type": "object",
                "description": "A JSON object containing the key-value pairs for the action context. Values can be literals or paths. Use literal values unless the value must be dynamically bound to the data model. Do NOT use paths for static IDs.",
                "additionalProperties": {
                  "$ref": "#/$defs/DynamicValue"
                }
              }
            },
            "required": ["name"],
            "additionalProperties": false
          }
        },
        "required": ["event"],
        "additionalProperties": false
      },
      {
        "type": "object",
        "description": "Executes a renderer or agent-side function.",
        "properties": {
          "functionCall": {
            "$ref": "#/$defs/FunctionCall"
          }
        },
        "required": ["functionCall"],
        "additionalProperties": false
      }
    ]
  },
  "Surface": {
    "title": "Surface Container Component",
    "description": "The reserved canonical container component representing an A2UI surface. The Surface component is immutable and always has 'child': 'root'.",
    "type": "object",
    "allowedParents": [],
    "properties": {
      "component": {
        "const": "Surface"
      },
      "child": {
        "const": "root"
      }
    },
    "additionalProperties": false
  },
  "FunctionResponse": {
    "type": "object",
    "description": "The return response matching a callAgentFunction or callRendererFunction invocation.",
    "properties": {
      "functionCallId": {
        "$ref": "#/$defs/CallId",
        "description": "The unique ID matching the initiating function call."
      },
      "value": {
        "description": "The return value of the function."
      },
      "error": {
        "type": "object",
        "description": "An error object indicating failure of the function execution.",
        "properties": {
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        },
        "required": ["code", "message"],
        "additionalProperties": false
      }
    },
    "required": ["functionCallId"],
    "oneOf": [
      {
        "required": ["value"]
      },
      {
        "required": ["error"]
      }
    ],
    "additionalProperties": false
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/catalog/spec_shape.js
var DEFAULT_COMMON_TYPES_URI = "common_types.json";
var STANDARD_DEFS_BY_VERSION = {
  "0.8": V08_STANDARD_DEFS,
  "0.9": V09_STANDARD_DEFS,
  "0.9.1": V09_STANDARD_DEFS,
  "1.0": V10_STANDARD_DEFS
};
function standardDefsForVersion(version) {
  if (version) {
    const key = toCanonicalVersion(version) ?? normalizeVersionString(version);
    if (key in STANDARD_DEFS_BY_VERSION)
      return STANDARD_DEFS_BY_VERSION[key];
    if (isAtLeastVersion(version, "1.0"))
      return V10_STANDARD_DEFS;
  }
  return V09_STANDARD_DEFS;
}
function copyJson(value) {
  return JSON.parse(JSON.stringify(value));
}
function isObject3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function defOf(schema) {
  return schema._def;
}
var ENVELOPE_PROPERTIES = /* @__PURE__ */ new Set(["id", "component"]);
function isSpecComponentSchema(schema) {
  return collectAnnotation(schema).mixins !== void 0;
}
function isSpecFunctionSchema(schema) {
  return Object.keys(collectAnnotation(schema)).length > 0;
}
function collectAnnotation(schema) {
  const chain = [];
  let node = schema;
  while (node && typeof node === "object" && "_def" in node) {
    const annotation = getSpecAnnotation(node);
    if (annotation)
      chain.push(annotation);
    const next = innerSchema(node);
    if (!next)
      break;
    node = next;
  }
  return chain.reduceRight((merged, a2) => ({ ...merged, ...a2 }), {});
}
function innerSchema(schema) {
  const def = defOf(schema);
  switch (def.typeName) {
    case "ZodOptional":
    case "ZodDefault":
    case "ZodCatch":
    case "ZodReadonly":
      return def["innerType"];
    case "ZodEffects":
      return def["schema"];
    case "ZodBranded":
      return def["type"];
    default:
      return void 0;
  }
}
var SpecShaper = class {
  /**
   * @param protocolVersion The catalog's protocol version.
   * @param commonTypesUri How the catalog's document writes the common types
   *     document in references, such as `common_types.json`.
   */
  constructor(protocolVersion, commonTypesUri = DEFAULT_COMMON_TYPES_URI) {
    this.commonTypesUri = commonTypesUri;
    this.isV08 = !isAtLeastVersion(protocolVersion, "0.9");
    this.isV10 = isAtLeastVersion(protocolVersion, "1.0");
    this.standardDefs = standardDefsForVersion(protocolVersion);
  }
  /**
   * Returns the definition a catalog document writes for a component.
   *
   * @param name The component's name.
   * @param schema The component's schema, annotated with its mixins.
   * @param allowedParents The component's allowed parents, if restricted.
   * @param allowedChildren The component's allowed children, if restricted.
   */
  componentSchema(name, schema, allowedParents, allowedChildren) {
    const catalogDefs = /* @__PURE__ */ new Map();
    let result;
    if (this.isV08) {
      result = this.toJson(schema);
      const properties = result["properties"];
      if (isObject3(properties)) {
        for (const key of ENVELOPE_PROPERTIES)
          delete properties[key];
      }
      if (Array.isArray(result["required"])) {
        const required = result["required"].filter((r2) => !ENVELOPE_PROPERTIES.has(r2));
        if (required.length > 0)
          result["required"] = required;
        else
          delete result["required"];
      }
    } else {
      const annotation = collectAnnotation(schema);
      const mixins = annotation.mixins ?? [];
      const inherited = new Set(ENVELOPE_PROPERTIES);
      const refs = [];
      for (const mixin of mixins) {
        refs.push({ $ref: this.mixinRef(mixin, catalogDefs) });
        for (const key of this.mixinProperties(mixin))
          inherited.add(key);
      }
      const object = coreSchema(schema);
      const description = plainDescription(schema);
      const own = this.objectSchema(object, annotation, (key) => !inherited.has(key));
      const properties = { component: { const: name }, ...own["properties"] };
      const required = ["component", ...own["required"] ?? []];
      const inner = { type: "object" };
      if (description !== void 0 && !this.isV10)
        inner["description"] = description;
      inner["properties"] = properties;
      inner["required"] = required;
      result = { type: "object" };
      if (this.isV10) {
        if (description !== void 0)
          result["description"] = description;
        if (refs.length > 0) {
          result["allOf"] = [...refs, inner];
        } else {
          result["properties"] = properties;
          result["required"] = required;
        }
      } else {
        result["allOf"] = [...refs, inner];
        result["unevaluatedProperties"] = false;
      }
    }
    if (allowedParents && allowedParents.length > 0)
      result["allowedParents"] = [...allowedParents];
    if (allowedChildren && allowedChildren.length > 0) {
      result["allowedChildren"] = [...allowedChildren];
    }
    return { schema: result, catalogDefs };
  }
  /**
   * Returns the definition a catalog document writes for a function: the
   * schema of a call to it.
   *
   * @param name The function's name.
   * @param fn The function's API, whose `schema` is its argument model.
   */
  functionSchema(name, fn) {
    const args = this.toJson(fn.schema);
    const argsRequired = Array.isArray(args["required"]) && args["required"].length > 0;
    const result = { type: "object" };
    if (fn.description)
      result["description"] = fn.description;
    if (this.isV10) {
      result["returnType"] = fn.returnType;
      if (fn.allowedCallers)
        result["allowedCallers"] = fn.allowedCallers;
      if (fn.requiresUserActivation)
        result["requiresUserActivation"] = true;
      result["properties"] = { "@call": { const: name }, args };
      result["required"] = argsRequired ? ["@call", "args"] : ["@call"];
      return result;
    }
    if (fn.allowedCallers)
      result["allowedCallers"] = fn.allowedCallers;
    if (fn.requiresUserActivation)
      result["requiresUserActivation"] = true;
    result["properties"] = { call: { const: name }, args, returnType: { const: fn.returnType } };
    result["required"] = argsRequired ? ["call", "args"] : ["call"];
    result["unevaluatedProperties"] = false;
    return result;
  }
  /**
   * Returns the definition a catalog document writes for a model, such as a
   * mixin or a theme.
   *
   * @param schema The model.
   */
  defSchema(schema) {
    return this.toJson(schema);
  }
  /** Returns the reference a component's definition makes to a mixin. */
  mixinRef(mixin, catalogDefs) {
    if (typeof mixin === "string")
      return `${this.commonTypesUri}#/$defs/${mixin}`;
    const name = collectAnnotation(mixin).defName;
    if (name === void 0) {
      throw new Error("A component mixin model must be named with specDef().");
    }
    catalogDefs.set(name, mixin);
    return `#/$defs/${name}`;
  }
  /** Returns the names of the properties a mixin declares. */
  mixinProperties(mixin) {
    if (typeof mixin !== "string") {
      const core = coreSchema(mixin);
      return defOf(core).typeName === "ZodObject" ? Object.keys(core.shape) : [];
    }
    const names = [];
    const collect = (def, seen) => {
      if (!isObject3(def) || seen.has(def))
        return;
      seen.add(def);
      if (isObject3(def["properties"]))
        names.push(...Object.keys(def["properties"]));
      for (const sub of Array.isArray(def["allOf"]) ? def["allOf"] : []) {
        const ref = isObject3(sub) ? sub["$ref"] : void 0;
        const target = typeof ref === "string" && ref.startsWith("#/$defs/") ? this.standardDefs[ref.substring("#/$defs/".length)] : sub;
        collect(target, seen);
      }
    };
    collect(this.standardDefs[mixin], /* @__PURE__ */ new Set());
    return names;
  }
  /**
   * Returns the JSON Schema a catalog document writes for a Zod schema.
   *
   * @param schema The schema.
   */
  toJson(schema) {
    const annotation = collectAnnotation(schema);
    const description = schemaDescription(schema);
    const defaultValue = schemaDefault(schema);
    let core;
    let ownDescription = description;
    if (description !== void 0 && description.startsWith("REF:")) {
      const content = description.substring(4);
      const pipe = content.indexOf("|");
      const ref = pipe === -1 ? content : content.substring(0, pipe);
      ownDescription = pipe === -1 ? void 0 : content.substring(pipe + 1);
      core = { $ref: this.refTarget(ref) };
    } else {
      core = this.coreJson(coreSchema(schema), annotation);
    }
    if (annotation.keywords)
      Object.assign(core, copyJson(annotation.keywords));
    const result = annotation.allOf ? { allOf: [core, ...annotation.allOf.map((s2) => copyJson(s2))] } : core;
    if (ownDescription)
      result["description"] = ownDescription;
    if (defaultValue !== void 0)
      result["default"] = defaultValue;
    return result;
  }
  /** Writes a `REF:` marker's reference as the catalog document does. */
  refTarget(ref) {
    if (!ref.startsWith("#/$defs/"))
      return ref;
    return `${this.commonTypesUri}${ref}`;
  }
  /** Converts the core of a schema, below its wrappers. */
  coreJson(schema, annotation) {
    const def = defOf(schema);
    switch (def.typeName) {
      case "ZodObject":
        return this.objectSchema(schema, annotation, () => true);
      case "ZodString":
        return stringSchema(def);
      case "ZodNumber":
        return numberSchema(def);
      case "ZodBoolean":
        return { type: "boolean" };
      case "ZodNull":
        return { type: "null" };
      case "ZodEnum":
        return { type: "string", enum: [...def["values"]] };
      case "ZodLiteral":
        return { const: def["value"] };
      case "ZodAny":
      case "ZodUnknown":
        return {};
      case "ZodNever":
        return { not: {} };
      case "ZodArray": {
        const result = {
          type: "array",
          items: this.toJson(def["type"])
        };
        const min = def["minLength"];
        const max = def["maxLength"];
        if (min)
          result["minItems"] = min.value;
        if (max)
          result["maxItems"] = max.value;
        return result;
      }
      case "ZodUnion":
      case "ZodDiscriminatedUnion": {
        const options = def["options"];
        return { oneOf: [...options].map((option) => this.toJson(option)) };
      }
      case "ZodRecord":
        return {
          type: "object",
          additionalProperties: this.toJson(def["valueType"])
        };
      case "ZodLazy":
        return this.toJson(def["getter"]());
      default:
        return fallbackJson(schema);
    }
  }
  /**
   * Converts an object schema, keeping the properties `keep` accepts. Its
   * `required` list follows the annotation, or else the property order.
   */
  objectSchema(schema, annotation, keep) {
    const def = defOf(schema);
    if (def.typeName !== "ZodObject")
      return this.toJson(schema);
    const shape = schema.shape;
    const properties = {};
    const required = [];
    for (const [key, value] of Object.entries(shape)) {
      if (!keep(key))
        continue;
      properties[key] = this.toJson(value);
      if (!value.isOptional())
        required.push(key);
    }
    const result = { type: "object", properties };
    const order = annotation.required?.filter((key) => required.includes(key));
    const unordered = required.filter((key) => !order?.includes(key));
    if (required.length > 0)
      result["required"] = order ? [...order, ...unordered] : required;
    const unknownKeys = def["unknownKeys"];
    const catchall = def["catchall"];
    const keyword = annotation.closure ?? (unknownKeys === "strict" ? "additionalProperties" : "none");
    if (catchall && defOf(catchall).typeName !== "ZodNever") {
      result[keyword === "none" ? "additionalProperties" : keyword] = this.toJson(catchall);
    } else if (keyword !== "none") {
      result[keyword] = unknownKeys === "passthrough";
    }
    return result;
  }
};
function coreSchema(schema) {
  let node = schema;
  for (let next = innerSchema(node); next; next = innerSchema(node))
    node = next;
  return node;
}
function schemaDescription(schema) {
  for (let node = schema; node; node = innerSchema(node)) {
    const description = defOf(node).description;
    if (typeof description === "string")
      return description;
  }
  return void 0;
}
function plainDescription(schema) {
  const description = schemaDescription(schema);
  return description !== void 0 && !description.startsWith("REF:") ? description : void 0;
}
function schemaDefault(schema) {
  for (let node = schema; node; node = innerSchema(node)) {
    const def = defOf(node);
    if (def.typeName === "ZodDefault")
      return def["defaultValue"]();
  }
  return void 0;
}
var STRING_FORMATS = {
  email: "email",
  url: "uri",
  uuid: "uuid",
  datetime: "date-time",
  date: "date",
  time: "time"
};
function stringSchema(def) {
  const result = { type: "string" };
  for (const check of def["checks"] ?? []) {
    if (check.kind === "regex")
      result["pattern"] = check["regex"].source;
    else if (check.kind === "min")
      result["minLength"] = check["value"];
    else if (check.kind === "max")
      result["maxLength"] = check["value"];
    else if (check.kind in STRING_FORMATS)
      result["format"] = STRING_FORMATS[check.kind];
  }
  return result;
}
function numberSchema(def) {
  const checks = def["checks"] ?? [];
  const result = {
    type: checks.some((check) => check.kind === "int") ? "integer" : "number"
  };
  for (const check of checks) {
    if (check.kind === "min") {
      result[check["inclusive"] ? "minimum" : "exclusiveMinimum"] = check["value"];
    } else if (check.kind === "max") {
      result[check["inclusive"] ? "maximum" : "exclusiveMaximum"] = check["value"];
    }
  }
  return result;
}
function fallbackJson(schema) {
  const json = zodToJsonSchema(schema, {
    target: "jsonSchema2019-09",
    $refStrategy: "none"
  });
  delete json["$schema"];
  delete json["definitions"];
  delete json["$defs"];
  return json;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/catalog/schema_serializer.js
var UNION_DEF_NAMES = /* @__PURE__ */ new Set(["anyComponent", "anyFunction"]);
var THEME_DOCUMENT_KEYS = ["theme", "themeSchema", "styles"];
function deepCopyJson(value) {
  if (value === void 0)
    return value;
  return JSON.parse(JSON.stringify(value));
}
function deepFreeze(value) {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value))
      deepFreeze(child);
  }
  return value;
}
function frozenJson(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  return deepFreeze(deepCopyJson(value));
}
function isObject4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function collectLocalDefNames(node, found) {
  if (Array.isArray(node)) {
    for (const item of node)
      collectLocalDefNames(item, found);
    return;
  }
  if (!isObject4(node))
    return;
  const ref = node.$ref;
  if (typeof ref === "string" && ref.startsWith("#/$defs/")) {
    found.add(ref.slice("#/$defs/".length).split("/")[0].replace(/~1/g, "/").replace(/~0/g, "~"));
  }
  for (const value of Object.values(node))
    collectLocalDefNames(value, found);
}
function reachableDefs(roots, defs) {
  const reached = /* @__PURE__ */ new Set();
  const pending = /* @__PURE__ */ new Set();
  for (const root of roots)
    collectLocalDefNames(root, pending);
  while (pending.size > 0) {
    const [name] = pending;
    pending.delete(name);
    if (reached.has(name))
      continue;
    reached.add(name);
    if (name in defs)
      collectLocalDefNames(defs[name], pending);
  }
  return reached;
}
function entryDefinition(entry, defs) {
  const definition = loadedDefinition(entry);
  if (!isObject4(definition))
    return void 0;
  const available = defs ?? {};
  for (const name of reachableDefs([definition], available)) {
    if (!(name in available) && !UNION_DEF_NAMES.has(name))
      return void 0;
  }
  return definition;
}
function isFunctionListItem(definition) {
  return typeof definition["name"] === "string" && !("properties" in definition);
}
function retainedDefs(defs, before, after, extensionFields) {
  if (!defs)
    return defs;
  const definitions2 = (entries) => entries.map((entry) => entryDefinition(entry, defs)).filter((d2) => d2 !== void 0);
  const reachedBefore = reachableDefs(definitions2(before), defs);
  const unconditional = Object.keys(defs).filter((name) => !reachedBefore.has(name));
  const reachedAfter = reachableDefs([...definitions2(after), extensionFields, ...unconditional.map((name) => defs[name])], defs);
  const kept = {};
  let dropped = false;
  for (const [name, def] of Object.entries(defs)) {
    if (!reachedBefore.has(name) || reachedAfter.has(name)) {
      kept[name] = def;
    } else {
      dropped = true;
    }
  }
  return dropped ? kept : defs;
}
function rewriteRefMarkers(node, localDefs, commonTypesUri = DEFAULT_COMMON_TYPES_URI) {
  if (Array.isArray(node)) {
    for (const item of node)
      rewriteRefMarkers(item, localDefs, commonTypesUri);
    return;
  }
  if (!isObject4(node))
    return;
  if (typeof node.description === "string" && node.description.startsWith("REF:")) {
    const content = node.description.substring(4);
    const pipeIndex = content.indexOf("|");
    const ref = pipeIndex === -1 ? content : content.substring(0, pipeIndex);
    const desc = pipeIndex === -1 ? "" : content.substring(pipeIndex + 1);
    const savedDefault = node.default;
    for (const key of Object.keys(node))
      delete node[key];
    const pointer = ref.split(/#\/(?:\$defs|definitions)\//)[1];
    const defName = pointer?.split("/")[0];
    node.$ref = defName === void 0 ? ref : ref.startsWith("#") && localDefs.has(defName) ? ref : `${commonTypesUri}#/$defs/${pointer}`;
    if (savedDefault !== void 0)
      node.default = savedDefault;
    if (desc)
      node.description = desc;
    return;
  }
  if (Array.isArray(node.anyOf)) {
    node.oneOf = node.anyOf;
    delete node.anyOf;
  }
  for (const key of ["additionalProperties", "unevaluatedProperties"]) {
    const value = node[key];
    if (isObject4(value) && Object.keys(value).length === 0)
      node[key] = true;
  }
  delete node.$schema;
  for (const value of Object.values(node))
    rewriteRefMarkers(value, localDefs, commonTypesUri);
}
function zodToUnbundledJson(schema, localDefs, commonTypesUri = DEFAULT_COMMON_TYPES_URI) {
  if (!schema || typeof schema !== "object" || !("safeParse" in schema)) {
    return { type: "object", properties: {} };
  }
  const json = zodToJsonSchema(schema, {
    target: "jsonSchema2019-09",
    $refStrategy: "none"
  });
  delete json.definitions;
  delete json.$defs;
  rewriteRefMarkers(json, localDefs, commonTypesUri);
  return json;
}
function closeObjectSchema(json) {
  if (json.type !== "object")
    return;
  const extra = json.unevaluatedProperties ?? json.additionalProperties;
  delete json.additionalProperties;
  json.unevaluatedProperties = typeof extra === "boolean" || isObject4(extra) ? extra : false;
}
function serializeComponentModel(name, comp, localDefs, commonTypesUri = DEFAULT_COMMON_TYPES_URI) {
  const json = zodToUnbundledJson(comp.schema, localDefs, commonTypesUri);
  const { component: _component, id: _id, ...props } = isObject4(json.properties) ? json.properties : {};
  const required = Array.isArray(json.required) ? json.required.filter((r2) => r2 !== "component" && r2 !== "id") : [];
  const extra = json.unevaluatedProperties ?? json.additionalProperties;
  const result = {
    type: "object",
    properties: { component: { const: name }, ...props },
    required: ["component", ...required],
    unevaluatedProperties: typeof extra === "boolean" || isObject4(extra) ? extra : false
  };
  if (comp.allowedParents && comp.allowedParents.length > 0) {
    result.allowedParents = [...comp.allowedParents];
  }
  if (comp.allowedChildren && comp.allowedChildren.length > 0) {
    result.allowedChildren = [...comp.allowedChildren];
  }
  return result;
}
function serializeFunctionModel(name, fn, localDefs, isAtLeastV10, asListItem, commonTypesUri = DEFAULT_COMMON_TYPES_URI) {
  const args = zodToUnbundledJson(fn.schema, localDefs, commonTypesUri);
  if (asListItem) {
    return {
      name,
      ...fn.description ? { description: fn.description } : {},
      returnType: fn.returnType,
      parameters: args,
      ...fn.allowedCallers ? { allowedCallers: fn.allowedCallers } : {},
      ...fn.requiresUserActivation !== void 0 ? { requiresUserActivation: fn.requiresUserActivation } : {}
    };
  }
  closeObjectSchema(args);
  const argsRequired = Array.isArray(args.required) && args.required.length > 0;
  const result = { type: "object" };
  if (fn.description)
    result.description = fn.description;
  if (isAtLeastV10) {
    result.returnType = fn.returnType;
    if (fn.allowedCallers)
      result.allowedCallers = fn.allowedCallers;
    if (fn.requiresUserActivation !== void 0) {
      result.requiresUserActivation = fn.requiresUserActivation;
    }
    result.properties = { "@call": { const: name }, args };
    result.required = argsRequired ? ["@call", "args"] : ["@call"];
    return result;
  }
  if (fn.allowedCallers)
    result.allowedCallers = fn.allowedCallers;
  if (fn.requiresUserActivation !== void 0) {
    result.requiresUserActivation = fn.requiresUserActivation;
  }
  result.properties = { call: { const: name }, args, returnType: { const: fn.returnType } };
  result.required = argsRequired ? ["call", "args"] : ["call"];
  result.unevaluatedProperties = false;
  return result;
}
function serializeThemeModel(theme, localDefs, commonTypesUri = DEFAULT_COMMON_TYPES_URI) {
  const json = zodToUnbundledJson(theme, localDefs, commonTypesUri);
  return {
    type: "object",
    properties: isObject4(json.properties) ? json.properties : {},
    ...Array.isArray(json.required) && json.required.length > 0 ? { required: json.required } : {},
    additionalProperties: json.additionalProperties !== void 0 ? json.additionalProperties : true
  };
}
var EMPTY_UNION = { not: {} };
function buildComponentUnion(names) {
  const oneOf = [...names].map((name) => ({ $ref: `#/components/${escapePointer(name)}` }));
  if (oneOf.length === 0)
    return { ...EMPTY_UNION };
  return { oneOf, discriminator: { propertyName: "component" } };
}
function buildFunctionUnion(names) {
  const oneOf = [...names].map((name) => ({ $ref: `#/functions/${escapePointer(name)}` }));
  return oneOf.length === 0 ? { ...EMPTY_UNION } : { oneOf };
}
function escapePointer(token) {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
var documentModels = /* @__PURE__ */ new WeakMap();
function catalogDocumentModel(catalog) {
  let model = documentModels.get(catalog);
  if (!model) {
    model = buildDocumentModel(catalog);
    documentModels.set(catalog, model);
  }
  return model;
}
function buildDocumentModel(catalog) {
  const shaper = new SpecShaper(catalog.protocolVersion, catalog.commonTypesUri);
  const computedDefs = /* @__PURE__ */ new Map();
  const shapedComponents = /* @__PURE__ */ new Map();
  for (const [name, comp] of catalog.components) {
    if (loadedDefinition(comp) || !isSpecComponentSchema(comp.schema))
      continue;
    const { schema, catalogDefs } = shaper.componentSchema(name, comp.schema, comp.allowedParents, comp.allowedChildren);
    shapedComponents.set(name, deepFreeze(schema));
    for (const [defName, defModel] of catalogDefs)
      computedDefs.set(defName, defModel);
  }
  for (const defModel of catalog.defModels ?? []) {
    const defName = getSpecAnnotation(defModel)?.defName;
    if (defName === void 0) {
      throw new Error("A catalog definition model must be named with specDef().");
    }
    computedDefs.set(defName, defModel);
  }
  const defs = { ...catalog.defs };
  for (const [defName, defModel] of computedDefs) {
    if (!(defName in defs))
      defs[defName] = shaper.defSchema(defModel);
  }
  const extensionFields = { ...catalog.extensionFields };
  if (catalog.themeLocation === "styles" && catalog.themeSchema && !hasAuthoredTheme(catalog)) {
    const theme = shaper.defSchema(catalog.themeSchema);
    extensionFields["styles"] = isObject4(theme["properties"]) ? theme["properties"] : {};
  }
  const components = /* @__PURE__ */ new Map();
  for (const [name, comp] of catalog.components) {
    components.set(name, shapedComponents.get(name) ?? entryDefinition(comp, defs));
  }
  const functions = /* @__PURE__ */ new Map();
  for (const [name, fn] of catalog.functions) {
    const loaded = entryDefinition(fn, defs);
    functions.set(name, loaded ?? (!loadedDefinition(fn) && isSpecFunctionSchema(fn.schema) ? deepFreeze(shaper.functionSchema(name, fn)) : void 0));
  }
  return {
    components,
    functions,
    defs: deepFreeze(defs),
    extensionFields: deepFreeze(extensionFields)
  };
}
function hasAuthoredTheme(catalog) {
  return isObject4(catalog.defs?.["theme"]) || THEME_DOCUMENT_KEYS.some((key) => catalog.extensionFields?.[key] !== void 0);
}
function serializeCatalogDocument(catalog) {
  const isAtLeastV10 = isAtLeastVersion(catalog.protocolVersion, "1.0");
  const model = catalogDocumentModel(catalog);
  const localDefs = new Set(Object.keys(model.defs));
  const doc = {};
  if (catalog.schemaUri !== void 0)
    doc.$schema = catalog.schemaUri;
  if (catalog.schemaId !== void 0)
    doc.$id = catalog.schemaId;
  if (typeof catalog.declaredProtocolVersion === "string") {
    doc.protocolVersion = catalog.declaredProtocolVersion;
  } else if (catalog.declaredProtocolVersion === void 0) {
    doc.protocolVersion = toCanonicalVersion(catalog.protocolVersion) ?? catalog.protocolVersion;
  }
  if (catalog.title !== void 0)
    doc.title = catalog.title;
  if (catalog.description !== void 0)
    doc.description = catalog.description;
  if (catalog.declaresCatalogId !== false)
    doc.catalogId = catalog.id;
  if (catalog.instructions !== void 0)
    doc.instructions = catalog.instructions;
  const commonTypesUri = catalog.commonTypesUri ?? DEFAULT_COMMON_TYPES_URI;
  if (catalog.declaresComponents !== false || catalog.components.size > 0) {
    const components = {};
    for (const [name, comp] of catalog.components) {
      const definition = model.components.get(name);
      components[name] = definition ? deepCopyJson(definition) : serializeComponentModel(name, comp, localDefs, commonTypesUri);
    }
    doc.components = components;
  }
  const functionEntries = [...catalog.functions].filter(([name, fn]) => loadedDefinition(fn) !== void 0 || !name.startsWith("@"));
  const functionNames = functionEntries.map(([name]) => name);
  if (catalog.functionsLayout === "list") {
    doc.functions = functionEntries.map(([name, fn]) => {
      const definition = model.functions.get(name);
      return definition && isFunctionListItem(definition) ? deepCopyJson(definition) : serializeFunctionModel(name, fn, localDefs, isAtLeastV10, true, commonTypesUri);
    });
  } else if (catalog.functionsLayout === "map" || functionEntries.length > 0) {
    const functions = {};
    for (const [name, fn] of functionEntries) {
      const definition = model.functions.get(name);
      functions[name] = definition && !isFunctionListItem(definition) ? deepCopyJson(definition) : serializeFunctionModel(name, fn, localDefs, isAtLeastV10, false, commonTypesUri);
    }
    doc.functions = functions;
  }
  for (const [key, value] of Object.entries(model.extensionFields)) {
    if (!(key in doc))
      doc[key] = deepCopyJson(value);
  }
  const defs = deepCopyJson({ ...model.defs });
  const themeLocation = catalog.themeLocation ?? (isAtLeastV10 ? void 0 : "defs");
  if (themeLocation === "defs" && catalog.themeSchema && !hasAuthoredTheme(model)) {
    defs.theme = getSpecAnnotation(catalog.themeSchema) ? new SpecShaper(catalog.protocolVersion, catalog.commonTypesUri).defSchema(catalog.themeSchema) : serializeThemeModel(catalog.themeSchema, localDefs, commonTypesUri);
  }
  const unions = catalog.unions ?? {
    anyComponent: isAtLeastV10 || catalog.components.size > 0,
    anyFunction: isAtLeastV10 || functionNames.length > 0
  };
  if (unions.anyComponent && !("anyComponent" in defs)) {
    const savedAnyFunction = defs.anyFunction;
    if (savedAnyFunction !== void 0)
      delete defs.anyFunction;
    defs.anyComponent = buildComponentUnion(catalog.components.keys());
    if (savedAnyFunction !== void 0)
      defs.anyFunction = savedAnyFunction;
  }
  if (unions.anyFunction && !("anyFunction" in defs)) {
    defs.anyFunction = buildFunctionUnion(functionNames);
  }
  if (catalog.defs !== void 0 || Object.keys(defs).length > 0) {
    doc.$defs = defs;
  }
  return doc;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/common/uax31.js
var UAX31_IDENTIFIER = /^[\p{XID_Start}_][\p{XID_Continue}]*$/u;
function isValidUax31Identifier(name, allowLeadingAt = false) {
  if (!name)
    return false;
  const testName = allowLeadingAt && name.startsWith("@") ? name.slice(1) : name;
  return UAX31_IDENTIFIER.test(testName);
}
function assertUax31Identifier(name, context, allowLeadingAt = false) {
  if (!isValidUax31Identifier(name, allowLeadingAt)) {
    throw new A2uiCatalogError(`Invalid UAX #31 ${context}`);
  }
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/catalog/schema_loader.js
var DEFAULT_PROTOCOL_VERSION = "0.9";
var COMMON_TYPE_SCHEMAS = {
  DynamicString: DynamicStringSchema,
  DynamicNumber: DynamicNumberSchema,
  DynamicBoolean: DynamicBooleanSchema,
  DynamicStringList: DynamicStringListSchema,
  DynamicValue: DynamicValueSchema,
  ComponentId: ComponentIdSchema,
  Child: ChildSchema,
  ChildList: ChildListSchema,
  Action: ActionSchema,
  CheckRule: CheckRuleSchema,
  Checkable: CheckableSchema,
  AccessibilityAttributes: AccessibilityAttributesSchema,
  DataBinding: DataBindingSchema,
  FunctionCall: FunctionCallSchema
};
var COMMON_TYPES_DOCUMENT = "common_types.json";
var CATALOG_DOCUMENT = "catalog.json";
function isDocumentNamed(doc, name) {
  return doc === name || doc.endsWith(`/${name}`);
}
function lastPathSegment(path) {
  return path.slice(path.lastIndexOf("/") + 1);
}
function splitRef(ref) {
  const hashIdx = ref.indexOf("#");
  return hashIdx < 0 ? { doc: ref, fragment: "" } : { doc: ref.slice(0, hashIdx), fragment: ref.slice(hashIdx) };
}
function isCatalogInstance(peer) {
  return typeof peer.toJson === "function";
}
function peerIds(peer) {
  if (isCatalogInstance(peer)) {
    return { id: peer.id, schemaId: peer.schemaId };
  }
  const cid = peer["catalogId"];
  const sid = peer["$id"];
  return {
    id: typeof cid === "string" ? cid : void 0,
    schemaId: typeof sid === "string" ? sid : void 0
  };
}
function resolveRefDocument(doc, peers) {
  if (!doc)
    return { kind: "self" };
  if (isDocumentNamed(doc, COMMON_TYPES_DOCUMENT))
    return { kind: "commonTypes" };
  if (doc === CATALOG_DOCUMENT)
    return { kind: "self" };
  for (const peer of peers) {
    const { id, schemaId } = peerIds(peer);
    for (const candidate of [id, schemaId]) {
      if (candidate && (doc === candidate || candidate.endsWith(`/${doc}`) || doc.endsWith(`/${candidate}`))) {
        return { kind: "peer", peer };
      }
    }
  }
  if (doc.endsWith(`/${CATALOG_DOCUMENT}`))
    return { kind: "self" };
  const base = lastPathSegment(doc);
  for (const peer of peers) {
    const { id, schemaId } = peerIds(peer);
    for (const candidate of [schemaId, id]) {
      if (candidate && lastPathSegment(candidate) === base) {
        return { kind: "peer", peer };
      }
    }
  }
  return { kind: "unresolved" };
}
function hasCrossDocumentRefs(node) {
  if (Array.isArray(node))
    return node.some(hasCrossDocumentRefs);
  if (!node || typeof node !== "object")
    return false;
  for (const [key, value] of Object.entries(node)) {
    if (key === "$ref" && typeof value === "string") {
      const { doc } = splitRef(value);
      if (doc && doc !== CATALOG_DOCUMENT && !isDocumentNamed(doc, COMMON_TYPES_DOCUMENT)) {
        return true;
      }
    } else if (hasCrossDocumentRefs(value)) {
      return true;
    }
  }
  return false;
}
var documentIds = /* @__PURE__ */ new WeakMap();
var nextDocumentId = 0;
function documentKey(doc) {
  let id = documentIds.get(doc);
  if (id === void 0) {
    id = nextDocumentId++;
    documentIds.set(doc, id);
  }
  return id;
}
var PeerScope = class {
  constructor(peers = []) {
    this.peers = peers;
    this.documents = /* @__PURE__ */ new Map();
  }
  /** Returns the catalog document of a peer. */
  documentOf(peer) {
    if (!isCatalogInstance(peer))
      return peer;
    let doc = this.documents.get(peer);
    if (!doc) {
      doc = peer.toJson();
      this.documents.set(peer, doc);
    }
    return doc;
  }
  /**
   * Resolves `ref`, written in `currentDoc`, to the document and pointer it
   * targets, or returns `undefined` for a reference to the common types, to
   * an unknown document, or without a JSON pointer fragment.
   */
  resolve(ref, currentDoc) {
    const { doc, fragment } = splitRef(ref);
    if (!fragment.startsWith("#/"))
      return void 0;
    const target = resolveRefDocument(doc, this.peers);
    if (target.kind === "self") {
      return {
        doc: currentDoc,
        pointer: fragment,
        key: `${documentKey(currentDoc)}:${fragment}`,
        isPeer: false
      };
    }
    if (target.kind === "peer") {
      return { doc: this.documentOf(target.peer), pointer: fragment, key: ref, isPeer: true };
    }
    return void 0;
  }
  /**
   * Throws if `ref` points into another catalog document that no peer
   * matches: such a reference is a catalog error, never a schema that accepts
   * any value.
   *
   * @throws {A2uiCatalogError} If `ref` is an unresolvable cross-catalog reference.
   */
  assertResolvable(ref) {
    if (resolveRefDocument(splitRef(ref).doc, this.peers).kind === "unresolved") {
      throwUnresolvableRef(ref);
    }
  }
};
function throwUnresolvableRef(ref) {
  throw new A2uiCatalogError(`Unresolvable schema reference: '${ref}'`);
}
var ConversionCache = class extends Map {
  constructor(peers = []) {
    super();
    this.scope = new PeerScope(peers);
  }
};
var entryBuilders = /* @__PURE__ */ new WeakMap();
function linkEntry(entry, peers) {
  const build3 = entryBuilders.get(entry);
  return build3 ? build3(peers) : entry;
}
function stripEnvelopeFromSubschema(node) {
  const cleaned = {};
  for (const [k, v2] of Object.entries(node)) {
    if (k === "unevaluatedProperties" || k === "additionalProperties" || k === "title") {
      continue;
    }
    cleaned[k] = v2;
  }
  if (cleaned.properties && typeof cleaned.properties === "object" && !Array.isArray(cleaned.properties)) {
    const nextProps = {};
    for (const [pk, pv] of Object.entries(cleaned.properties)) {
      if (!isEnvelopeField(pk)) {
        nextProps[pk] = pv;
      }
    }
    cleaned.properties = nextProps;
  }
  if (Array.isArray(cleaned.required)) {
    cleaned.required = cleaned.required.filter((r2) => typeof r2 === "string" && !isEnvelopeField(r2));
  }
  if (Array.isArray(cleaned.allOf)) {
    const specific = [];
    const inherited = [];
    for (const item of cleaned.allOf) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const itemObj = item;
        const itemProps = itemObj.properties;
        const hasComp = Boolean(itemProps) && typeof itemProps === "object" && !Array.isArray(itemProps) && "component" in itemProps;
        const strippedItem = stripEnvelopeFromSubschema(itemObj);
        if (hasComp) {
          specific.push(strippedItem);
        } else {
          inherited.push(strippedItem);
        }
      } else {
        inherited.push(item);
      }
    }
    cleaned.allOf = [...specific, ...inherited];
  }
  return cleaned;
}
function stripReferencedComponentEnvelope(node, pointer) {
  if (!pointer.startsWith("#/components/"))
    return node;
  const parts = pointer.slice(2).split("/");
  if (parts.length !== 2)
    return node;
  return stripEnvelopeFromSubschema(node);
}
function resolvePeerTarget(target) {
  const doc = target.doc;
  const raw = resolveJsonPointer(doc, target.pointer);
  return raw ? { doc, target: stripReferencedComponentEnvelope(raw, target.pointer) } : void 0;
}
function inlinePeerAndLocalRefs(node, rootDoc, peers = [], options = {}) {
  return inlineRefs(node, rootDoc, new PeerScope(peers), options.inlineLocalDefs ?? true, options.visited ?? /* @__PURE__ */ new Set());
}
function inlineRefs(node, rootDoc, scope, inlineLocalDefs, visited) {
  if (Array.isArray(node)) {
    return node.map((item) => inlineRefs(item, rootDoc, scope, inlineLocalDefs, visited));
  }
  if (!node || typeof node !== "object") {
    return node;
  }
  const obj = node;
  if (typeof obj.$ref === "string") {
    let target = scope.resolve(obj.$ref, rootDoc);
    if (target && !target.isPeer) {
      const defName = target.pointer.split("/").pop() ?? "";
      const isPreservedCommonType = target.pointer.startsWith("#/$defs/") && (defName in COMMON_TYPE_SCHEMAS || defName === "ComponentCommon");
      if (isPreservedCommonType || !inlineLocalDefs && target.pointer.startsWith("#/$defs/")) {
        target = void 0;
      }
    }
    if (target && !visited.has(target.key)) {
      const resolvedTarget = resolveJsonPointer(target.doc, target.pointer);
      if (resolvedTarget) {
        const nextVisited = new Set(visited);
        nextVisited.add(target.key);
        const inlinedTarget = inlineRefs(resolvedTarget, target.doc, scope, target.isPeer ? true : inlineLocalDefs, nextVisited);
        if (inlinedTarget && typeof inlinedTarget === "object" && !Array.isArray(inlinedTarget)) {
          const stripped = stripReferencedComponentEnvelope(inlinedTarget, target.pointer);
          const res = { ...stripped };
          for (const [k, v2] of Object.entries(obj)) {
            if (k === "$ref")
              continue;
            const inlinedVal = inlineRefs(v2, rootDoc, scope, inlineLocalDefs, visited);
            if (k in res && res[k] && typeof res[k] === "object" && !Array.isArray(res[k]) && inlinedVal && typeof inlinedVal === "object" && !Array.isArray(inlinedVal)) {
              res[k] = {
                ...res[k],
                ...inlinedVal
              };
            } else if (Array.isArray(res[k]) && Array.isArray(inlinedVal)) {
              const existing = res[k];
              res[k] = [...existing, ...inlinedVal.filter((item) => !existing.includes(item))];
            } else {
              res[k] = inlinedVal;
            }
          }
          return res;
        }
        return inlinedTarget;
      }
    }
  }
  const out = {};
  for (const [k, v2] of Object.entries(obj)) {
    out[k] = inlineRefs(v2, rootDoc, scope, inlineLocalDefs, visited);
  }
  return out;
}
function resolveJsonPointer(rootDoc, pointer) {
  if (!pointer.startsWith("#/"))
    return void 0;
  const segments = pointer.slice(2).split("/").map((s2) => s2.replace(/~1/g, "/").replace(/~0/g, "~"));
  let curr = rootDoc;
  for (const seg of segments) {
    if (curr && typeof curr === "object" && seg in curr) {
      curr = curr[seg];
    } else {
      return void 0;
    }
  }
  return typeof curr === "object" && curr !== null ? curr : void 0;
}
function resolveProtocolRef(ref) {
  const defName = ref.split(/#\/(?:\$defs|definitions)\//)[1];
  return defName ? COMMON_TYPE_SCHEMAS[defName] : void 0;
}
function convertEnumToZod(values) {
  if (values.length === 0) {
    return external_exports.unknown();
  }
  if (values.every((v2) => typeof v2 === "string")) {
    return external_exports.enum(values);
  }
  if (values.length === 1) {
    return external_exports.literal(values[0]);
  }
  return external_exports.union(values.map((v2) => external_exports.literal(v2)));
}
function canonicalJsonStringify(val) {
  if (val === null || typeof val !== "object") {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val.map(canonicalJsonStringify).join(",")}]`;
  }
  const keys = Object.keys(val).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(val[k])}`);
  return `{${entries.join(",")}}`;
}
function finalizePropertyZod(baseZod, propSchema, rootDoc, visitedPointers, defCache) {
  let result = baseZod;
  if (propSchema.not && typeof propSchema.not === "object") {
    const notSchema = convertPropertyToZod(propSchema.not, rootDoc, new Set(visitedPointers), defCache);
    result = result.refine((val) => !notSchema.safeParse(val).success, {
      message: 'Value matched prohibited "not" schema'
    });
  }
  if (propSchema.default !== void 0) {
    result = result.default(propSchema.default);
  }
  if (typeof propSchema.description === "string") {
    result = result.describe(propSchema.description);
  }
  return result;
}
function convertRefToZod(ref, propSchema, rootDoc, visitedPointers, defCache) {
  const resolvedProtocol = resolveProtocolRef(ref);
  if (resolvedProtocol) {
    const defName = ref.split(/#\/(?:\$defs|definitions)\//)[1];
    const desc = typeof propSchema.description === "string" ? `REF:common_types.json#/$defs/${defName}|${propSchema.description}` : resolvedProtocol.description;
    return desc ? resolvedProtocol.describe(desc) : resolvedProtocol;
  }
  if (!rootDoc)
    return void 0;
  const target = defCache.scope.resolve(ref, rootDoc);
  if (!target) {
    defCache.scope.assertResolvable(ref);
    return void 0;
  }
  let doc;
  let schema;
  if (target.isPeer) {
    const peerResolved = resolvePeerTarget(target);
    if (!peerResolved)
      throwUnresolvableRef(ref);
    ({ doc, target: schema } = peerResolved);
  } else {
    doc = rootDoc;
    schema = resolveJsonPointer(rootDoc, target.pointer);
    if (!schema) {
      if (!ref.startsWith("#"))
        return void 0;
      return external_exports.unknown().superRefine((_val, ctx) => {
        ctx.addIssue({
          code: external_exports.ZodIssueCode.custom,
          message: `Unresolvable schema reference: '${ref}'`
        });
      });
    }
  }
  const key = target.key;
  const resolved = schema;
  if (visitedPointers.has(key)) {
    let cached = defCache.get(key);
    return external_exports.lazy(() => {
      if (!cached) {
        cached = defCache.get(key) ?? convertPropertyToZod(resolved, doc, /* @__PURE__ */ new Set([key]), defCache);
        defCache.set(key, cached);
      }
      return cached;
    });
  }
  let zodType = defCache.get(key);
  if (!zodType) {
    const nextVisited = new Set(visitedPointers);
    nextVisited.add(key);
    zodType = convertPropertyToZod(resolved, doc, nextVisited, defCache);
    defCache.set(key, zodType);
  }
  if (typeof propSchema.description === "string") {
    zodType = zodType.describe(propSchema.description);
  }
  return zodType;
}
function convertUnionToZod(propSchema, rootDoc, visitedPointers, defCache) {
  const isOneOf = Array.isArray(propSchema.oneOf);
  const rawBranches = propSchema.oneOf || propSchema.anyOf;
  const branches = rawBranches.filter((b2) => typeof b2 === "object" && b2 !== null);
  if (branches.length === 0)
    return void 0;
  const enumBranch = branches.find((b2) => Array.isArray(b2.enum));
  const hasBinding = branches.some((b2) => typeof b2.$ref === "string" && b2.$ref.includes("DataBinding"));
  const zodBranches = branches.map((b2) => convertPropertyToZod(b2, rootDoc, new Set(visitedPointers), defCache));
  let unionZod;
  if (zodBranches.length === 1) {
    unionZod = zodBranches[0];
  } else {
    const baseUnion = external_exports.union([zodBranches[0], zodBranches[1], ...zodBranches.slice(2)]);
    unionZod = isOneOf ? external_exports.any().superRefine((val, ctx) => {
      let matches = 0;
      for (const b2 of zodBranches) {
        if (b2.safeParse(val).success && ++matches > 1) {
          ctx.addIssue({
            code: external_exports.ZodIssueCode.custom,
            message: "Value matched more than one schema in oneOf"
          });
          return;
        }
      }
    }).pipe(baseUnion) : baseUnion;
  }
  if (propSchema.default !== void 0) {
    unionZod = unionZod.default(propSchema.default);
  }
  const desc = (typeof propSchema.description === "string" ? propSchema.description : void 0) || (enumBranch && hasBinding ? "REF:common_types.json#/$defs/DynamicString" : void 0);
  return desc ? unionZod.describe(desc) : unionZod;
}
function convertPropertyToZod(propSchema, rootDoc, visitedPointers = /* @__PURE__ */ new Set(), defCache = new ConversionCache()) {
  if (!propSchema || typeof propSchema !== "object") {
    return external_exports.unknown();
  }
  if (propSchema instanceof external_exports.ZodType) {
    return propSchema;
  }
  if (propSchema.$ref && typeof propSchema.$ref === "string") {
    const resolvedRef = convertRefToZod(propSchema.$ref, propSchema, rootDoc, visitedPointers, defCache);
    if (resolvedRef)
      return resolvedRef;
  }
  if (Array.isArray(propSchema.oneOf) || Array.isArray(propSchema.anyOf)) {
    const resolvedUnion = convertUnionToZod(propSchema, rootDoc, visitedPointers, defCache);
    if (resolvedUnion)
      return resolvedUnion;
  }
  if (propSchema.const !== void 0) {
    const constZod = external_exports.literal(propSchema.const);
    return finalizePropertyZod(constZod, propSchema, rootDoc, visitedPointers, defCache);
  }
  if (Array.isArray(propSchema.enum) && propSchema.enum.length > 0) {
    const enumZod = convertEnumToZod(propSchema.enum);
    return finalizePropertyZod(enumZod, propSchema, rootDoc, visitedPointers, defCache);
  }
  if (propSchema.type === "array") {
    const itemSchema = propSchema.items && typeof propSchema.items === "object" ? convertPropertyToZod(propSchema.items, rootDoc, new Set(visitedPointers), defCache) : external_exports.unknown();
    let arr = external_exports.array(itemSchema);
    if (typeof propSchema.minItems === "number") {
      arr = arr.min(propSchema.minItems);
    }
    if (typeof propSchema.maxItems === "number") {
      arr = arr.max(propSchema.maxItems);
    }
    if (propSchema.uniqueItems === true) {
      arr = arr.refine((items) => new Set(items.map(canonicalJsonStringify)).size === items.length, { message: "Array items must be unique" });
    }
    return finalizePropertyZod(arr, propSchema, rootDoc, visitedPointers, defCache);
  }
  switch (propSchema.type) {
    case "string": {
      let s2 = external_exports.string();
      if (typeof propSchema.minLength === "number") {
        s2 = s2.min(propSchema.minLength);
      }
      if (typeof propSchema.maxLength === "number") {
        s2 = s2.max(propSchema.maxLength);
      }
      if (typeof propSchema.pattern === "string") {
        try {
          s2 = s2.regex(new RegExp(propSchema.pattern, "u"));
        } catch {
        }
      }
      return finalizePropertyZod(s2, propSchema, rootDoc, visitedPointers, defCache);
    }
    case "integer":
    case "number": {
      let n2 = propSchema.type === "integer" ? external_exports.number().int() : external_exports.number();
      if (typeof propSchema.minimum === "number") {
        n2 = n2.min(propSchema.minimum);
      }
      if (typeof propSchema.maximum === "number") {
        n2 = n2.max(propSchema.maximum);
      }
      if (typeof propSchema.exclusiveMinimum === "number") {
        n2 = n2.gt(propSchema.exclusiveMinimum);
      }
      if (typeof propSchema.exclusiveMaximum === "number") {
        n2 = n2.lt(propSchema.exclusiveMaximum);
      }
      if (typeof propSchema.multipleOf === "number") {
        n2 = n2.multipleOf(propSchema.multipleOf);
      }
      return finalizePropertyZod(n2, propSchema, rootDoc, visitedPointers, defCache);
    }
    case "boolean": {
      return finalizePropertyZod(external_exports.boolean(), propSchema, rootDoc, visitedPointers, defCache);
    }
    case "object": {
      const props = propSchema.properties;
      let obj;
      if (typeof props === "object" && props !== null) {
        const required = Array.isArray(propSchema.required) ? new Set(propSchema.required.filter((r2) => typeof r2 === "string")) : /* @__PURE__ */ new Set();
        const baseObj = external_exports.object(convertPropertiesToShape(props, required, false, rootDoc, visitedPointers, defCache));
        const forbidExtra = propSchema.additionalProperties === false || propSchema.unevaluatedProperties === false;
        obj = forbidExtra ? baseObj.strict() : baseObj.passthrough();
      } else {
        obj = external_exports.record(external_exports.unknown());
      }
      return finalizePropertyZod(obj, propSchema, rootDoc, visitedPointers, defCache);
    }
    default: {
      return finalizePropertyZod(external_exports.unknown(), propSchema, rootDoc, visitedPointers, defCache);
    }
  }
}
function isEnvelopeField(propName) {
  return propName === "id" || propName === "component" || propName === "catalogId";
}
function convertPropertiesToShape(properties, requiredSet, omitEnvelopeFields = false, rootDoc, visitedPointers, defCache = new ConversionCache()) {
  const shape = {};
  for (const [propName, propSchema] of Object.entries(properties)) {
    if (omitEnvelopeFields && isEnvelopeField(propName)) {
      continue;
    }
    const zodField = convertPropertyToZod(typeof propSchema === "object" && propSchema !== null ? propSchema : {}, rootDoc, visitedPointers ? new Set(visitedPointers) : /* @__PURE__ */ new Set(), defCache);
    if (!requiredSet.has(propName)) {
      shape[propName] = zodField.optional();
    } else if (zodField.safeParse(void 0).success) {
      shape[propName] = zodField.refine((value) => value !== void 0, { message: "Required" });
    } else {
      shape[propName] = zodField;
    }
  }
  return shape;
}
function collectComponentSubSchemas(schema, rootDoc, scope, visitedPointers = /* @__PURE__ */ new Set(), isAtLeastV10 = false) {
  if (!schema || typeof schema !== "object")
    return [];
  const mixins = [];
  const local = [];
  const inline = [];
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      if (!sub || typeof sub !== "object")
        continue;
      if (typeof sub.$ref === "string") {
        const ref = sub.$ref;
        if (ref.includes("common_types.json") && ref.includes("ComponentCommon")) {
          const { accessibility, metadata } = ComponentCommonSchema.shape;
          mixins.push({
            kind: "zod",
            properties: isAtLeastV10 ? { accessibility, metadata } : { accessibility }
          });
        } else {
          const mirror = ref.startsWith("#/") ? void 0 : resolveProtocolRef(ref);
          const target = mirror instanceof external_exports.ZodObject ? void 0 : scope.resolve(ref, rootDoc);
          if (mirror instanceof external_exports.ZodObject) {
            mixins.push({ kind: "zod", properties: { ...mirror.shape } });
          } else if (!target) {
            scope.assertResolvable(ref);
          } else if (!target.isPeer) {
            if (!visitedPointers.has(target.key)) {
              visitedPointers.add(target.key);
              const resolved = resolveJsonPointer(rootDoc, target.pointer);
              if (resolved) {
                local.push(...collectComponentSubSchemas(resolved, rootDoc, scope, visitedPointers, isAtLeastV10));
              }
            }
          } else if (!visitedPointers.has(target.key)) {
            const peerResolved = resolvePeerTarget(target);
            if (!peerResolved)
              throwUnresolvableRef(ref);
            const nextVisited = new Set(visitedPointers).add(target.key);
            local.push(...collectComponentSubSchemas(peerResolved.target, peerResolved.doc, scope, nextVisited, isAtLeastV10));
          }
        }
      } else {
        inline.push(...collectComponentSubSchemas(sub, rootDoc, scope, visitedPointers, isAtLeastV10));
      }
    }
  }
  const result = [...mixins, ...local, ...inline];
  if (schema.properties) {
    result.push({ kind: "json", schema, rootDoc });
  }
  return result;
}
function convertComponentJsonSchemaToZod(rawSchema, rootDoc, omitEnvelopeFields = true, defCache = new ConversionCache(), isAtLeastV10 = false) {
  const shape = {};
  const schemasToMerge = collectComponentSubSchemas(rawSchema, rootDoc, defCache.scope, void 0, isAtLeastV10);
  const requiredSet = /* @__PURE__ */ new Set();
  for (const s2 of schemasToMerge) {
    if (s2.kind === "json" && Array.isArray(s2.schema.required)) {
      s2.schema.required.forEach((r2) => {
        if (typeof r2 === "string")
          requiredSet.add(r2);
      });
    }
  }
  for (const s2 of schemasToMerge) {
    if (s2.kind === "zod") {
      for (const [propName, propSchema] of Object.entries(s2.properties)) {
        if (omitEnvelopeFields && isEnvelopeField(propName)) {
          continue;
        }
        shape[propName] = propSchema;
      }
      continue;
    }
    const propShape = convertPropertiesToShape(s2.schema.properties || {}, requiredSet, omitEnvelopeFields, s2.rootDoc, void 0, defCache);
    Object.assign(shape, propShape);
  }
  const obj = external_exports.object(shape);
  const allowExtra = rawSchema.unevaluatedProperties === true || typeof rawSchema.unevaluatedProperties === "object" && rawSchema.unevaluatedProperties !== null || rawSchema.additionalProperties === true || typeof rawSchema.additionalProperties === "object" && rawSchema.additionalProperties !== null;
  return allowExtra ? obj.passthrough() : obj.strict();
}
function isShorthandParameterMap(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return false;
  }
  const s2 = schema;
  return Object.keys(s2).length > 0 && s2.properties === void 0 && typeof s2.type !== "string" && !("$ref" in s2) && !("allOf" in s2) && !("oneOf" in s2) && !("anyOf" in s2) && !("not" in s2) && Object.values(s2).every((v2) => v2 !== null && (typeof v2 === "object" || typeof v2 === "boolean"));
}
function isExplicitlyOpen(schema) {
  return schema.unevaluatedProperties === true || typeof schema.unevaluatedProperties === "object" && schema.unevaluatedProperties !== null || schema.additionalProperties === true || typeof schema.additionalProperties === "object" && schema.additionalProperties !== null;
}
function collectArgSubSchemas(schema, rootDoc, scope, visited = /* @__PURE__ */ new Set()) {
  const result = {
    schemas: [],
    hasUnresolvable: false
  };
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return result;
  }
  if (isShorthandParameterMap(schema)) {
    result.schemas.push({
      schema: {
        type: "object",
        properties: schema
      },
      doc: rootDoc
    });
    return result;
  }
  const addSub = (sub) => {
    result.schemas.push(...sub.schemas);
    if (sub.hasUnresolvable) {
      result.hasUnresolvable = true;
    }
  };
  if (typeof schema.$ref === "string") {
    const ref = schema.$ref;
    const target = rootDoc ? scope.resolve(ref, rootDoc) : void 0;
    if (!target || !rootDoc) {
      if (rootDoc)
        scope.assertResolvable(ref);
      result.hasUnresolvable = true;
    } else if (!target.isPeer) {
      if (!visited.has(target.key)) {
        visited.add(target.key);
        const resolved = resolveJsonPointer(rootDoc, target.pointer);
        if (resolved) {
          addSub(collectArgSubSchemas(resolved, rootDoc, scope, visited));
        } else {
          result.hasUnresolvable = true;
        }
      }
    } else if (!visited.has(target.key)) {
      const peerResolved = resolvePeerTarget(target);
      if (!peerResolved)
        throwUnresolvableRef(ref);
      const nextVisited = new Set(visited).add(target.key);
      addSub(collectArgSubSchemas(peerResolved.target, peerResolved.doc, scope, nextVisited));
    }
  }
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      if (sub && typeof sub === "object" && !Array.isArray(sub)) {
        addSub(collectArgSubSchemas(sub, rootDoc, scope, visited));
      }
    }
  }
  if (Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) {
    result.hasUnresolvable = true;
  }
  if (schema.properties || schema.required || schema.additionalProperties !== void 0 || schema.unevaluatedProperties !== void 0) {
    result.schemas.push({ schema, doc: rootDoc });
  }
  return result;
}
function convertFunctionArgsJsonSchemaToZod(rawSchema, rootDoc, defCache = new ConversionCache()) {
  const collected = collectArgSubSchemas(rawSchema, rootDoc, defCache.scope);
  const requiredSet = /* @__PURE__ */ new Set();
  for (const { schema: s2 } of collected.schemas) {
    if (Array.isArray(s2.required)) {
      for (const r2 of s2.required) {
        if (typeof r2 === "string") {
          requiredSet.add(r2);
        }
      }
    }
  }
  const shape = {};
  for (const { schema: s2, doc } of collected.schemas) {
    if (s2.properties && typeof s2.properties === "object" && !Array.isArray(s2.properties)) {
      const propShape = convertPropertiesToShape(s2.properties, requiredSet, false, doc, void 0, defCache);
      Object.assign(shape, propShape);
    }
  }
  const obj = external_exports.object(shape);
  const allowExtra = collected.hasUnresolvable || collected.schemas.some(({ schema: s2 }) => isExplicitlyOpen(s2)) || isExplicitlyOpen(rawSchema);
  return allowExtra ? obj.passthrough() : obj.strict();
}
function functionParameterNames(schema, rootDoc) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return [];
  }
  const s2 = schema;
  const names = [];
  const visited = /* @__PURE__ */ new Set();
  const extractProperties = (node) => {
    if (!node || typeof node !== "object" || Array.isArray(node))
      return;
    const n2 = node;
    if (typeof n2.$ref === "string" && rootDoc && n2.$ref.startsWith("#/")) {
      if (!visited.has(n2.$ref)) {
        visited.add(n2.$ref);
        const target = resolveJsonPointer(rootDoc, n2.$ref);
        if (target) {
          extractProperties(target);
        }
      }
    }
    if (n2.properties && typeof n2.properties === "object" && n2.properties !== null && !Array.isArray(n2.properties)) {
      names.push(...Object.keys(n2.properties));
    }
    if (Array.isArray(n2.allOf)) {
      for (const member of n2.allOf) {
        extractProperties(member);
      }
    }
  };
  if (s2.properties && typeof s2.properties === "object" && s2.properties !== null && !Array.isArray(s2.properties) || Array.isArray(s2.allOf) || typeof s2.$ref === "string") {
    extractProperties(s2);
    return names;
  }
  if (isShorthandParameterMap(s2)) {
    return Object.keys(s2);
  }
  return [];
}
function parseFunctionDefinitions(rawFunctions, rootDoc, permittedNames, atLeastV10 = false) {
  const result = [];
  if (!rawFunctions)
    return result;
  const assertFunctionIdentifiers = (name, paramNames) => {
    if (!atLeastV10)
      return;
    assertUax31Identifier(name, `function identifier: '${name}'`);
    for (const argName of paramNames) {
      assertUax31Identifier(argName, `argument identifier: '${argName}' in function '${name}'`);
    }
  };
  if (Array.isArray(rawFunctions)) {
    for (const fn of rawFunctions) {
      if (fn && typeof fn === "object" && typeof fn.name === "string") {
        const paramNames = functionParameterNames(fn.parameters, rootDoc);
        assertFunctionIdentifiers(fn.name, paramNames);
        if (permittedNames && !permittedNames.has(fn.name)) {
          continue;
        }
        const build3 = (peers) => {
          const entry = new JsonFunctionApi(fn.name, fn, (definition) => definition["parameters"] && typeof definition["parameters"] === "object" ? convertFunctionArgsJsonSchemaToZod(definition["parameters"], rootDoc, new ConversionCache(peers)) : external_exports.record(external_exports.unknown()));
          entryBuilders.set(entry, build3);
          return entry;
        };
        result.push(build3([]));
      }
    }
    return result;
  }
  if (typeof rawFunctions === "object" && rawFunctions !== null) {
    for (const [name, defn] of Object.entries(rawFunctions)) {
      const rawDefn = defn && typeof defn === "object" ? defn : {};
      const argsSchema = functionArgsSchema(rawDefn);
      const paramNames = functionParameterNames(argsSchema, rootDoc);
      assertFunctionIdentifiers(name, paramNames);
      if (permittedNames && !permittedNames.has(name)) {
        continue;
      }
      if (!defn || typeof defn !== "object")
        continue;
      const build3 = (peers) => {
        const entry = new JsonFunctionApi(name, defn, (definition) => {
          const argsSchema2 = functionArgsSchema(definition);
          return argsSchema2 ? convertFunctionArgsJsonSchemaToZod(argsSchema2, rootDoc, new ConversionCache(peers)) : external_exports.record(external_exports.unknown());
        });
        entryBuilders.set(entry, build3);
        return entry;
      };
      result.push(build3([]));
    }
  }
  return result;
}
function functionArgsSchema(d2) {
  const props = d2.properties && typeof d2.properties === "object" && d2.properties !== null && !Array.isArray(d2.properties) ? d2.properties : void 0;
  let argsSchema = props?.args ?? d2.args ?? d2.parameters;
  if (!argsSchema && props && !("call" in props) && !("@call" in props) && !("function" in props)) {
    argsSchema = d2;
  } else if (isShorthandParameterMap(argsSchema)) {
    argsSchema = {
      type: "object",
      properties: argsSchema,
      required: d2.required,
      additionalProperties: d2.additionalProperties
    };
  }
  return argsSchema && typeof argsSchema === "object" && !Array.isArray(argsSchema) ? argsSchema : void 0;
}
function extractPermittedNames(oneOf, prefix) {
  if (!Array.isArray(oneOf))
    return void 0;
  const permitted = /* @__PURE__ */ new Set();
  for (const item of oneOf) {
    if (typeof item?.$ref === "string" && item.$ref.startsWith(prefix)) {
      const rawName = item.$ref.slice(prefix.length);
      const unescapedName = rawName.replace(/~([01])/g, (_2, p1) => p1 === "1" ? "/" : "~");
      permitted.add(unescapedName);
    }
  }
  return permitted;
}
function parseCatalogComponents(componentsMap, catalogSchema, atLeastV10, permittedNames) {
  const components = [];
  for (const [name, rawCompSchema] of Object.entries(componentsMap)) {
    const rawComp = rawCompSchema || {};
    if (atLeastV10) {
      assertUax31Identifier(name, `component identifier: '${name}'`);
      const props = rawComp.properties;
      if (props && typeof props === "object") {
        for (const propName of Object.keys(props)) {
          assertUax31Identifier(propName, `property identifier: '${propName}' in component '${name}'`);
        }
      }
    }
    if (permittedNames && !permittedNames.has(name)) {
      continue;
    }
    const build3 = (peers) => {
      const entry = new JsonComponentApi(name, rawComp, (definition) => convertComponentJsonSchemaToZod(definition, catalogSchema, true, new ConversionCache(peers), atLeastV10));
      entryBuilders.set(entry, build3);
      return entry;
    };
    components.push(build3([]));
  }
  return components;
}
function parseThemeSchema(catalogSchema, defs) {
  const rawTheme = catalogSchema.theme ?? catalogSchema.themeSchema ?? catalogSchema.styles ?? defs?.theme;
  if (rawTheme && typeof rawTheme === "object") {
    const rawThemeObj = rawTheme;
    const normalizedThemeSchema = "properties" in rawThemeObj || "allOf" in rawThemeObj || rawThemeObj.type === "object" ? rawThemeObj : { type: "object", properties: rawThemeObj };
    const themeZod = convertComponentJsonSchemaToZod(normalizedThemeSchema, catalogSchema, false);
    const closed = normalizedThemeSchema.additionalProperties === false || normalizedThemeSchema.unevaluatedProperties === false;
    return closed ? themeZod : themeZod.passthrough();
  }
  return void 0;
}
function parseCatalogSchema(inputSchema, protocolVersion, catalogIdOverride) {
  const catalogSchema = deepCopyJson(inputSchema);
  const catalogId = catalogIdOverride ?? catalogSchema.catalogId ?? catalogSchema.$id ?? catalogSchema.id;
  if (!catalogId || typeof catalogId !== "string") {
    throw new Error("Catalog ID must be specified via catalog metadata ('catalogId' or '$id').");
  }
  const defs = catalogSchema.$defs;
  const anyComp = defs?.anyComponent;
  const permittedNames = extractPermittedNames(anyComp?.oneOf, "#/components/");
  const resolvedVersion = protocolVersion ?? catalogSchema.protocolVersion ?? DEFAULT_PROTOCOL_VERSION;
  const atLeastV10 = isAtLeastVersion(resolvedVersion, "1.0");
  const componentsMap = catalogSchema.components ?? {};
  const components = parseCatalogComponents(componentsMap, catalogSchema, atLeastV10, permittedNames);
  const anyFunc = defs?.anyFunction;
  const permittedFunctionNames = extractPermittedNames(anyFunc?.oneOf, "#/functions/");
  const functions = parseFunctionDefinitions(catalogSchema.functions, catalogSchema, permittedFunctionNames, atLeastV10);
  const themeSchema = parseThemeSchema(catalogSchema, defs);
  deepFreeze(catalogSchema);
  return {
    id: catalogId,
    protocolVersion: resolvedVersion,
    components,
    functions,
    themeSchema,
    ...readDocumentFields(catalogSchema, components, functions)
  };
}
var DOCUMENT_STRING_FIELDS = {
  "$schema": "schemaUri",
  "$id": "schemaId",
  "title": "title",
  "description": "description",
  "instructions": "instructions"
};
var DOCUMENT_STRUCTURE_FIELDS = /* @__PURE__ */ new Set(["protocolVersion", "catalogId", "components"]);
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isComputedUnion(actual, computed2) {
  return canonicalJsonStringify(actual) === canonicalJsonStringify(computed2);
}
function readDocumentFields(document, components, functions) {
  const fields = {};
  const extensionFields = {};
  for (const [key, value] of Object.entries(document)) {
    if (key in DOCUMENT_STRING_FIELDS && typeof value === "string") {
      fields[DOCUMENT_STRING_FIELDS[key]] = value;
    } else if (key === "protocolVersion" && typeof value === "string") {
      fields.declaredProtocolVersion = value;
    } else if (key === "functions" && (Array.isArray(value) || isPlainObject(value))) {
      fields.functionsLayout = Array.isArray(value) ? "list" : "map";
    } else if (key === "$defs" && isPlainObject(value)) {
      const anyComponent = isComputedUnion(value["anyComponent"], buildComponentUnion(components.map((c2) => c2.name)));
      const anyFunction = isComputedUnion(value["anyFunction"], buildFunctionUnion(functions.map((f2) => f2.name)));
      fields.unions = { anyComponent, anyFunction };
      const defs = {};
      for (const [name, def] of Object.entries(value)) {
        if (name === "anyComponent" && anyComponent || name === "anyFunction" && anyFunction) {
          continue;
        }
        defs[name] = def;
      }
      fields.defs = Object.freeze(defs);
    } else if (!DOCUMENT_STRUCTURE_FIELDS.has(key) || key === "components" && !isPlainObject(value)) {
      extensionFields[key] = value;
    }
  }
  fields.declaredProtocolVersion ??= null;
  fields.declaresCatalogId = typeof document["catalogId"] === "string";
  fields.declaresComponents = isPlainObject(document["components"]);
  fields.unions ??= { anyComponent: false, anyFunction: false };
  if (Object.keys(extensionFields).length > 0) {
    fields.extensionFields = Object.freeze(extensionFields);
  }
  return fields;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/catalog/schema_generator.js
function getStandardDefsForCatalog(catalog, options) {
  if (options?.standardDefs) {
    return options.standardDefs;
  }
  return standardDefsForVersion(options?.protocolVersion ?? catalog.protocolVersion);
}
var EXTERNAL_DEF_REF = /^[^#]+#\/(?:\$defs|definitions)\/([^/]+)(\/.*)?$/;
function localizeExternalDefRef(ref) {
  const match = EXTERNAL_DEF_REF.exec(ref);
  if (match)
    return `#/$defs/${match[1]}${match[2] ?? ""}`;
  return `#/$defs/${ref.split("/").pop()}`;
}
function localDefName(ref) {
  if (!ref.startsWith("#/$defs/"))
    return void 0;
  return ref.substring("#/$defs/".length).split("/")[0].replace(/~1/g, "/").replace(/~0/g, "~");
}
function transformRefDescriptionNode(obj) {
  if (typeof obj.description !== "string" || !obj.description.startsWith("REF:")) {
    return false;
  }
  const content = obj.description.substring(4);
  const pipeIndex = content.indexOf("|");
  const ref = pipeIndex === -1 ? content : content.substring(0, pipeIndex);
  const desc = pipeIndex === -1 ? "" : content.substring(pipeIndex + 1);
  const savedDefault = obj.default;
  for (const key of Object.keys(obj)) {
    delete obj[key];
  }
  obj["$ref"] = ref.startsWith("#") ? ref : localizeExternalDefRef(ref);
  if (savedDefault !== void 0) {
    obj["default"] = savedDefault;
  }
  if (desc) {
    obj["description"] = desc;
  }
  return true;
}
function cleanSchemaProperties(obj, options = {}) {
  if (Array.isArray(obj.allOf)) {
    const members = obj.allOf.filter((m2) => !(typeof m2 === "object" && m2 !== null && Object.keys(m2).length === 0));
    const only = members.length === 1 ? members[0] : void 0;
    if (typeof only === "object" && only !== null && !Array.isArray(only) && Object.keys(only).every((key) => !(key in obj) || key === "allOf")) {
      delete obj.allOf;
      Object.assign(obj, only);
    } else if (members.length === 0) {
      delete obj.allOf;
    } else {
      obj.allOf = members;
    }
  }
  if (Array.isArray(obj.anyOf)) {
    obj.oneOf = obj.anyOf;
    delete obj.anyOf;
  }
  if (options.stripAdditionalProperties) {
    delete obj["additionalProperties"];
    delete obj["unevaluatedProperties"];
  } else {
    if (obj.additionalProperties && typeof obj.additionalProperties === "object" && Object.keys(obj.additionalProperties).length === 0) {
      obj.additionalProperties = true;
    }
    if (obj.unevaluatedProperties && typeof obj.unevaluatedProperties === "object" && Object.keys(obj.unevaluatedProperties).length === 0) {
      obj.unevaluatedProperties = true;
    }
  }
  if ("$schema" in obj) {
    delete obj["$schema"];
  }
}
function cleanSchemaNode(node, visited = /* @__PURE__ */ new Set(), options = {}) {
  if (typeof node !== "object" || node === null)
    return;
  if (visited.has(node))
    return;
  visited.add(node);
  if (Array.isArray(node)) {
    for (const item of node) {
      cleanSchemaNode(item, visited, options);
    }
    return;
  }
  const obj = node;
  if (transformRefDescriptionNode(obj)) {
    return;
  }
  cleanSchemaProperties(obj, options);
  for (const key of Object.keys(obj)) {
    cleanSchemaNode(obj[key], visited, options);
  }
}
function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var REF_ANNOTATION_KEYWORDS = /* @__PURE__ */ new Set([
  "description",
  "title",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
]);
var COMPONENT_ENVELOPE_KEYS = /* @__PURE__ */ new Set(["id", "component", "catalogId"]);
var GENERATED_DEF_NAMES = /* @__PURE__ */ new Set(["anyComponent", "anyFunction", "theme"]);
var COMMON_TYPE_REF = /^(?:([^#]*common_types\.json))?#\/\$defs\/([^/]+)(\/.*)?$/;
var STANDARD_MIXIN_REF = /\/(ComponentCommon|Checkable)$/;
function localizeStandardRef(node, name, standardDefs, pointer = "") {
  node["$ref"] = `#/$defs/${name}${pointer}`;
  if (pointer || node["description"] !== void 0)
    return;
  const definition = standardDefs[name];
  if (isJsonObject(definition) && typeof definition["description"] === "string") {
    node["description"] = definition["description"];
  }
}
function restoreSourceRefs(node, standardDefs, annotationsOnly) {
  if (Array.isArray(node)) {
    for (const item of node)
      restoreSourceRefs(item, standardDefs, annotationsOnly);
    return;
  }
  if (!isJsonObject(node))
    return;
  const ref = node["$ref"];
  const match = typeof ref === "string" ? COMMON_TYPE_REF.exec(ref) : null;
  if (match) {
    const [, document, name, pointer] = match;
    if (document !== void 0 || name in standardDefs) {
      if (annotationsOnly) {
        for (const key of Object.keys(node)) {
          if (key !== "$ref" && !REF_ANNOTATION_KEYWORDS.has(key))
            delete node[key];
        }
        localizeStandardRef(node, name, standardDefs, pointer);
        return;
      }
      localizeStandardRef(node, name, standardDefs, pointer);
    }
  }
  for (const value of Object.values(node)) {
    restoreSourceRefs(value, standardDefs, annotationsOnly);
  }
}
function resolveLocalPointer(rootDoc, pointer) {
  if (!pointer.startsWith("#/"))
    return void 0;
  let current = rootDoc;
  for (const raw of pointer.substring(2).split("/")) {
    const segment = raw.replace(/~([01])/g, (_2, p1) => p1 === "1" ? "/" : "~");
    if (!isJsonObject(current) || !(segment in current))
      return void 0;
    current = current[segment];
  }
  return current;
}
function collectSourceSubSchemas(schema, context, visited) {
  const inline = [];
  const local = [];
  const mixins = [];
  for (const sub of Array.isArray(schema["allOf"]) ? schema["allOf"] : []) {
    if (!isJsonObject(sub))
      continue;
    const ref = sub["$ref"];
    if (typeof ref !== "string") {
      inline.push(...collectSourceSubSchemas(sub, context, visited));
      continue;
    }
    const mixinName = STANDARD_MIXIN_REF.exec(ref)?.[1];
    const target = ref.startsWith("#/") ? resolveLocalPointer(context.rootDoc, ref) : void 0;
    if (mixinName === void 0 && isJsonObject(target)) {
      if (!visited.has(ref)) {
        visited.add(ref);
        local.push(...collectSourceSubSchemas(target, context, visited));
      }
      continue;
    }
    if (mixinName === void 0 && !ref.startsWith("#/") && context.peers.length > 0) {
      if (!visited.has(ref)) {
        const resolvedPeer = inlinePeerAndLocalRefs(sub, context.rootDoc, context.peers, {
          inlineLocalDefs: false,
          visited
        });
        if (isJsonObject(resolvedPeer) && resolvedPeer["$ref"] !== ref) {
          const nextVisited = new Set(visited);
          nextVisited.add(ref);
          local.push(...collectSourceSubSchemas(resolvedPeer, context, nextVisited));
          continue;
        }
      }
    }
    const external = EXTERNAL_DEF_REF.exec(ref);
    const name = mixinName ?? (external && !external[2] ? external[1] : void 0);
    const mixin = name !== void 0 ? context.standardDefs[name] : void 0;
    if (isJsonObject(mixin) && isJsonObject(mixin["properties"])) {
      mixins.push({
        properties: deepCopyJson(mixin["properties"]),
        ...Array.isArray(mixin["required"]) ? { required: mixin["required"] } : {}
      });
    }
  }
  const pieces = [...mixins, ...local, ...inline];
  if ("properties" in schema || "description" in schema)
    pieces.push(schema);
  return pieces;
}
function sourceComponentSchema(source, context) {
  const pieces = collectSourceSubSchemas(source, context, /* @__PURE__ */ new Set());
  let description;
  const props = {};
  const required = /* @__PURE__ */ new Set();
  for (const piece of pieces) {
    if (typeof piece["description"] === "string")
      description = piece["description"];
    if (isJsonObject(piece["properties"]))
      Object.assign(props, piece["properties"]);
    if (Array.isArray(piece["required"])) {
      for (const name of piece["required"]) {
        if (typeof name === "string")
          required.add(name);
      }
    }
  }
  const copied = {};
  for (const [name, schema] of Object.entries(props)) {
    if (COMPONENT_ENVELOPE_KEYS.has(name))
      continue;
    const copy = inlinePeerAndLocalRefs(deepCopyJson(schema), context.rootDoc, context.peers, {
      inlineLocalDefs: false
    });
    restoreSourceRefs(copy, context.standardDefs, true);
    copied[name] = copy;
  }
  return {
    props: copied,
    required: [...required].filter((name) => !COMPONENT_ENVELOPE_KEYS.has(name)).sort(),
    ...description !== void 0 ? { description } : {}
  };
}
function authoredFunctionArgs(name, context) {
  const source = context.model.functions.get(name);
  if (!source)
    return void 0;
  const props = isJsonObject(source.properties) ? source.properties : void 0;
  const explicit = props?.args ?? source.args ?? source.parameters;
  if (explicit !== void 0) {
    if (!isJsonObject(explicit))
      return {};
    if (Object.keys(explicit).length > 0 && !("properties" in explicit) && !("type" in explicit)) {
      return {
        type: "object",
        properties: explicit,
        ...source.required !== void 0 ? { required: source.required } : {},
        ...source.additionalProperties !== void 0 ? { additionalProperties: source.additionalProperties } : {}
      };
    }
    return explicit;
  }
  const isCallSchema = props && ("call" in props || "@call" in props || "function" in props);
  if (!props || isCallSchema)
    return {};
  const { description: _description, title: _title, name: _name, returnType: _returnType, allowedCallers: _allowedCallers, requiresUserActivation: _requiresUserActivation, ...args } = source;
  return args;
}
function authoredTheme(model) {
  const theme = THEME_DOCUMENT_KEYS.map((key) => model.extensionFields[key]).find((value) => value !== void 0) ?? model.defs["theme"];
  if (!isJsonObject(theme))
    return void 0;
  return "properties" in theme || "allOf" in theme || theme.type === "object" ? theme : { type: "object", properties: theme };
}
function isV08Catalog(catalog) {
  const version = toCanonicalVersion(catalog.protocolVersion) ?? catalog.protocolVersion;
  return version === "0.8" || catalog.id.includes("v0_8") || catalog.id.includes("v0.8");
}
function processTheme(catalog, defs, generated, context) {
  if (!catalog.themeSchema)
    return;
  const isV08 = isV08Catalog(catalog);
  const authored = authoredTheme(context.model);
  if (authored) {
    const theme = deepCopyJson({ ...authored });
    if (!isV08 && theme["additionalProperties"] === void 0 && theme["unevaluatedProperties"] === void 0) {
      theme["additionalProperties"] = true;
    }
    defs["theme"] = theme;
    return;
  }
  const themeRaw = zodToJsonSchema(catalog.themeSchema, {
    target: "jsonSchema2019-09",
    $refStrategy: "none"
  });
  cleanSchemaNode(themeRaw);
  mergeGeneratedDefs(themeRaw, defs, generated);
  const closed = themeRaw.additionalProperties === false;
  const themeObj = {
    type: "object",
    ...typeof themeRaw.description === "string" && !themeRaw.description.startsWith("REF:") ? { description: themeRaw.description } : {},
    properties: themeRaw.properties || {},
    ...Array.isArray(themeRaw.required) && themeRaw.required.length > 0 ? { required: themeRaw.required } : {},
    ...closed ? { additionalProperties: false } : isV08 ? {} : {
      additionalProperties: themeRaw.additionalProperties !== void 0 ? themeRaw.additionalProperties : true
    }
  };
  generated.push(themeObj);
  defs["theme"] = themeObj;
}
function mergeGeneratedDefs(raw, defs, generated) {
  const nested = isJsonObject(raw.definitions) ? raw.definitions : isJsonObject(raw.$defs) ? raw.$defs : void 0;
  delete raw.definitions;
  delete raw.$defs;
  if (!nested)
    return;
  Object.assign(defs, nested);
  generated.push(nested);
}
function extractZodComponentSchema(comp, defs, generated) {
  if (!comp.schema || typeof comp.schema !== "object" || !("safeParse" in comp.schema)) {
    return { props: {}, reqList: [], additionalProps: void 0 };
  }
  const rawZod = zodToJsonSchema(comp.schema, {
    target: "jsonSchema2019-09",
    $refStrategy: "none"
  });
  cleanSchemaNode(rawZod);
  mergeGeneratedDefs(rawZod, defs, generated);
  const props = rawZod.properties || {};
  const reqList = Array.isArray(rawZod.required) ? rawZod.required.filter((r2) => r2 !== "component" && r2 !== "id") : [];
  const rawExtra = rawZod.unevaluatedProperties ?? rawZod.additionalProperties;
  const additionalProps = typeof rawExtra === "boolean" || isJsonObject(rawExtra) ? rawExtra : void 0;
  return { props, reqList, additionalProps };
}
function zodComponentDescription(comp) {
  const zodDescription = comp.schema?.description;
  return typeof zodDescription === "string" && !zodDescription.startsWith("REF:") ? zodDescription : void 0;
}
function authoredClosure(source) {
  return source["unevaluatedProperties"] ?? source["additionalProperties"];
}
function processSingleComponent(name, comp, defs, generated, context, options) {
  let props;
  let reqList;
  let description;
  let closure;
  const source = context.model.components.get(name);
  if (source) {
    ({ props, required: reqList, description } = sourceComponentSchema(source, context));
    closure = authoredClosure(source) ?? (context.isV10 ? void 0 : false);
  } else {
    const extracted = extractZodComponentSchema(comp, defs, generated);
    const { component: _ignoredComp, id: _ignoredId, ...sanitized } = extracted.props;
    generated.push(sanitized);
    props = sanitized;
    reqList = extracted.reqList;
    description = zodComponentDescription(comp);
    closure = context.isV10 ? void 0 : extracted.additionalProps ?? false;
  }
  const id = {};
  localizeStandardRef(id, "ComponentId", context.standardDefs);
  const innerProperties = { id, ...props, component: { const: name } };
  const innerRequired = ["id", ...reqList, "component"];
  const closureEntry = closure !== void 0 ? { unevaluatedProperties: closure } : {};
  let compSchemaObj;
  if (options?.componentEnvelopeRef) {
    compSchemaObj = {
      ...description !== void 0 ? { description } : {},
      allOf: [
        { $ref: options.componentEnvelopeRef },
        {
          type: "object",
          properties: innerProperties,
          required: innerRequired
        }
      ],
      ...closureEntry
    };
  } else {
    compSchemaObj = {
      type: "object",
      ...description !== void 0 ? { description } : {},
      properties: innerProperties,
      required: innerRequired,
      ...closureEntry
    };
  }
  if (comp.allowedParents && comp.allowedParents.length > 0) {
    compSchemaObj["allowedParents"] = comp.allowedParents;
  }
  if (comp.allowedChildren && comp.allowedChildren.length > 0) {
    compSchemaObj["allowedChildren"] = comp.allowedChildren;
  }
  return compSchemaObj;
}
function processComponents(catalog, schema, defs, generated, context, options) {
  if (catalog.components.size === 0) {
    schema["components"] = {};
    return;
  }
  const componentsMap = {};
  for (const [name, comp] of catalog.components.entries()) {
    componentsMap[name] = processSingleComponent(name, comp, defs, generated, context, options);
  }
  schema["components"] = componentsMap;
  defs["anyComponent"] = {
    oneOf: Array.from(catalog.components.keys()).map((name) => ({
      $ref: `#/components/${name}`
    })),
    discriminator: {
      propertyName: "component"
    }
  };
}
function buildFunctionArgsSchema(name, fn, defs, generated, context) {
  let paramSchemaObj;
  const authored = authoredFunctionArgs(name, context);
  if (authored) {
    paramSchemaObj = inlinePeerAndLocalRefs(deepCopyJson(authored), context.rootDoc, context.peers, { inlineLocalDefs: false });
    restoreSourceRefs(paramSchemaObj, context.standardDefs, false);
  } else if (fn.schema && typeof fn.schema === "object" && "safeParse" in fn.schema) {
    const rawZod = zodToJsonSchema(fn.schema, {
      target: "jsonSchema2019-09",
      $refStrategy: "none"
    });
    cleanSchemaNode(rawZod);
    mergeGeneratedDefs(rawZod, defs, generated);
    generated.push(rawZod);
    paramSchemaObj = rawZod;
  } else {
    paramSchemaObj = { type: "object", properties: {} };
  }
  if (paramSchemaObj.type === "object") {
    const additional = paramSchemaObj.additionalProperties;
    delete paramSchemaObj.additionalProperties;
    paramSchemaObj.unevaluatedProperties = paramSchemaObj.unevaluatedProperties ?? additional ?? false;
  }
  return paramSchemaObj;
}
function processSingleFunction(name, fn, defs, generated, context) {
  const argsSchema = buildFunctionArgsSchema(name, fn, defs, generated, context);
  const hasRequiredArgs = Array.isArray(argsSchema.required) && argsSchema.required.length > 0;
  const callKey = context.isV10 ? "@call" : "call";
  const required = hasRequiredArgs ? [callKey, "args"] : [callKey];
  if (context.isV10) {
    return {
      type: "object",
      ...fn.description ? { description: fn.description } : {},
      returnType: fn.returnType,
      ...fn.allowedCallers !== void 0 ? { allowedCallers: fn.allowedCallers } : {},
      ...fn.requiresUserActivation !== void 0 ? { requiresUserActivation: fn.requiresUserActivation } : {},
      properties: {
        "@call": { const: name },
        args: argsSchema
      },
      required
    };
  }
  return {
    type: "object",
    ...fn.description ? { description: fn.description } : {},
    properties: {
      call: { const: name },
      args: argsSchema,
      returnType: { const: fn.returnType }
    },
    required,
    unevaluatedProperties: false
  };
}
function processFunctions(catalog, schema, defs, generated, context) {
  const names = Array.from(catalog.functions.keys()).filter((name) => !name.startsWith("@"));
  if (names.length === 0)
    return;
  const functionsMap = {};
  for (const name of names) {
    functionsMap[name] = processSingleFunction(name, catalog.functions.get(name), defs, generated, context);
  }
  schema["functions"] = functionsMap;
  defs["anyFunction"] = {
    oneOf: names.map((name) => ({
      $ref: `#/functions/${name}`
    }))
  };
}
var MIRROR_REF_DESCRIPTIONS = new Map(Object.values(CommonSchemas).flatMap((mirror) => {
  const description = mirror.description;
  if (typeof description !== "string" || !description.startsWith("REF:"))
    return [];
  const content = description.substring(4);
  const pipeIndex = content.indexOf("|");
  if (pipeIndex === -1)
    return [];
  const name = content.substring(0, pipeIndex).split("/").pop();
  return [[name, content.substring(pipeIndex + 1)]];
}));
function localizeRefs(node, keep, visited = /* @__PURE__ */ new Set()) {
  if (typeof node !== "object" || node === null || visited.has(node))
    return;
  visited.add(node);
  if (Array.isArray(node)) {
    for (const item of node)
      localizeRefs(item, keep, visited);
    return;
  }
  const obj = node;
  const ref = obj["$ref"];
  if (typeof ref === "string" && !ref.startsWith("#") && ref !== keep) {
    if (!EXTERNAL_DEF_REF.test(ref)) {
      throw new Error(`Cannot bundle the external schema reference '${ref}'.`);
    }
    obj["$ref"] = localizeExternalDefRef(ref);
  }
  for (const value of Object.values(obj))
    localizeRefs(value, keep, visited);
}
function describeStandardRefs(node, standardDefs, visited = /* @__PURE__ */ new Set()) {
  if (typeof node !== "object" || node === null || visited.has(node))
    return;
  visited.add(node);
  if (Array.isArray(node)) {
    for (const item of node)
      describeStandardRefs(item, standardDefs, visited);
    return;
  }
  const obj = node;
  const ref = obj["$ref"];
  if (typeof ref === "string" && ref.startsWith("#/$defs/")) {
    const name = ref.substring("#/$defs/".length);
    const definition = name.includes("/") ? void 0 : standardDefs[name];
    const inherited = obj["description"] === void 0 || obj["description"] === MIRROR_REF_DESCRIPTIONS.get(name);
    if (definition && inherited) {
      if (typeof definition["description"] === "string") {
        obj["description"] = definition["description"];
      } else {
        delete obj["description"];
      }
    }
  }
  for (const value of Object.values(obj))
    describeStandardRefs(value, standardDefs, visited);
}
function collectReferencedDefs(node, referenced, visited = /* @__PURE__ */ new Set()) {
  if (typeof node !== "object" || node === null)
    return;
  if (visited.has(node))
    return;
  visited.add(node);
  if (typeof node["$ref"] === "string") {
    const name = localDefName(node["$ref"]);
    if (name !== void 0)
      referenced.add(name);
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collectReferencedDefs(item, referenced, visited);
    }
  } else {
    for (const val of Object.values(node)) {
      collectReferencedDefs(val, referenced, visited);
    }
  }
}
function generateValidationSchema(catalog, options) {
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    // The declared version, in the bare semantic version form
    // catalog_definition.json requires: `v0.9.1` becomes `0.9.1`.
    ...typeof catalog.declaredProtocolVersion === "string" ? { protocolVersion: catalog.declaredProtocolVersion.trim().replace(/^[vV](?=\d)/, "") } : {},
    catalogId: catalog.id
  };
  if (catalog.instructions) {
    schema["instructions"] = catalog.instructions;
  }
  const standardDefs = getStandardDefsForCatalog(catalog, options);
  const version = options?.protocolVersion ?? catalog.protocolVersion;
  const model = catalogDocumentModel(catalog);
  const authoredDefs = model.defs;
  const context = {
    standardDefs,
    model,
    defs: authoredDefs,
    rootDoc: {
      $defs: authoredDefs,
      components: Object.fromEntries(model.components),
      functions: Object.fromEntries(model.functions)
    },
    peers: catalog.peerCatalogs ?? [],
    isV10: Boolean(version) && isAtLeastVersion(version, "1.0")
  };
  const defs = {};
  const generated = [];
  processTheme(catalog, defs, generated, context);
  processComponents(catalog, schema, defs, generated, context, options);
  processFunctions(catalog, schema, defs, generated, context);
  localizeRefs(schema, options?.componentEnvelopeRef);
  localizeRefs(defs);
  for (const node of generated)
    describeStandardRefs(node, standardDefs);
  let defsCountBefore;
  do {
    defsCountBefore = Object.keys(defs).length;
    const referenced = /* @__PURE__ */ new Set();
    collectReferencedDefs(schema, referenced);
    collectReferencedDefs(defs, referenced);
    if (referenced.has("DynamicString") || referenced.has("DynamicNumber") || referenced.has("DynamicBoolean") || referenced.has("DynamicValue")) {
      referenced.add("DataBinding");
      referenced.add("FunctionCall");
    }
    for (const refName of referenced) {
      if (refName in defs)
        continue;
      if (refName in standardDefs) {
        const copied = deepCopyJson(standardDefs[refName]);
        localizeRefs(copied);
        defs[refName] = copied;
      } else if (!GENERATED_DEF_NAMES.has(refName) && refName in authoredDefs) {
        const copied = deepCopyJson(authoredDefs[refName]);
        restoreSourceRefs(copied, standardDefs, false);
        localizeRefs(copied);
        defs[refName] = copied;
      }
    }
    if (referenced.has("anyFunction") && !("anyFunction" in defs)) {
      defs["anyFunction"] = { not: {} };
    }
  } while (Object.keys(defs).length > defsCountBefore);
  if (Object.keys(defs).length > 0) {
    schema["$defs"] = defs;
  }
  return schema;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/catalog/reference-map.js
function extractRefDefName(ref) {
  if (!ref)
    return "";
  const hashIdx = ref.lastIndexOf("#");
  const target = hashIdx !== -1 ? ref.slice(hashIdx + 1) : ref;
  const segments = target.split("/").filter(Boolean);
  return segments.pop() ?? "";
}
function unwrapNextZodLayer(current, visited) {
  if (!current?._def)
    return null;
  if (visited) {
    if (visited.has(current))
      return null;
    visited.add(current);
  }
  const typeName = current._def.typeName;
  switch (typeName) {
    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
    case "ZodReadonly":
      return current._def.innerType;
    case "ZodBranded":
      return current._def.type;
    case "ZodEffects":
      return current._def.schema;
    case "ZodLazy":
      return current._def.getter();
    default:
      return null;
  }
}
function getDescriptions(type) {
  const descriptions = [];
  const visited = /* @__PURE__ */ new Set();
  let current = type;
  while (current) {
    if (current.description)
      descriptions.push(current.description);
    if (current._def?.description)
      descriptions.push(current._def.description);
    const next = unwrapNextZodLayer(current, visited);
    if (!next)
      break;
    current = next;
  }
  return descriptions;
}
function unwrapZodType(type) {
  const visited = /* @__PURE__ */ new Set();
  let current = type;
  while (current) {
    const next = unwrapNextZodLayer(current, visited);
    if (!next)
      break;
    current = next;
  }
  return current;
}
function checkDirectJsonRef(ref, options) {
  if (!ref)
    return null;
  const defName = extractRefDefName(ref);
  const childListNames = options.childListRefNames;
  const childNames = options.childRefNames;
  if (childListNames.has(defName)) {
    return { isChild: false, isChildList: true };
  }
  if (childNames.has(defName)) {
    return { isChild: true, isChildList: false };
  }
  return null;
}
function checkCombinerList(list, options) {
  let hasChild = false;
  for (const sub of list) {
    if (typeof sub !== "object" || sub === null)
      continue;
    const subRes = checkJsonSchemaRef(sub, options);
    if (subRes.isChildList)
      return { isChild: false, isChildList: true };
    if (subRes.isChild)
      hasChild = true;
  }
  return hasChild ? { isChild: true, isChildList: false } : null;
}
function checkCombinerRefs(schema, options) {
  let hasChild = false;
  for (const combiner of ["oneOf", "anyOf", "allOf"]) {
    const list = schema[combiner];
    if (!Array.isArray(list))
      continue;
    const res = checkCombinerList(list, options);
    if (res?.isChildList)
      return res;
    if (res?.isChild)
      hasChild = true;
  }
  return hasChild ? { isChild: true, isChildList: false } : null;
}
function checkJsonSchemaRef(schema, options) {
  const ref = typeof schema.$ref === "string" ? schema.$ref : "";
  const directMatch = checkDirectJsonRef(ref, options);
  if (directMatch)
    return directMatch;
  if (schema.type === "array" && schema.items) {
    const itemsRes = checkJsonSchemaRef(schema.items, options);
    if (itemsRes.isChild || itemsRes.isChildList) {
      return { isChild: false, isChildList: true };
    }
  }
  const combinerMatch = checkCombinerRefs(schema, options);
  if (combinerMatch)
    return combinerMatch;
  if (schema.type === "object" && schema.properties && ("componentId" in schema.properties && ("path" in schema.properties || "dataBinding" in schema.properties) || "explicitList" in schema.properties || "template" in schema.properties)) {
    return { isChild: false, isChildList: true };
  }
  return { isChild: false, isChildList: false };
}
function isTemplateShape(unwrappedOpt) {
  if (unwrappedOpt?._def?.typeName === "ZodObject" && typeof unwrappedOpt._def.shape === "function") {
    const shape = unwrappedOpt._def.shape();
    return Boolean(shape.componentId && (shape.path || shape.dataBinding) || shape.explicitList || shape.template);
  }
  return false;
}
function isArrayOfChild(unwrappedOpt, options) {
  if (unwrappedOpt?._def?.typeName === "ZodArray") {
    const elem = unwrapZodType(unwrappedOpt._def.type);
    return analyzeChildRefSchema(elem, options).isChild;
  }
  return false;
}
function analyzeUnionOptions(options, analysisOptions) {
  let hasTemplate = false;
  let hasArrayOfChild = false;
  let hasChildRef = false;
  for (const opt of options) {
    const unwrappedOpt = unwrapZodType(opt);
    if (isTemplateShape(unwrappedOpt)) {
      hasTemplate = true;
    }
    if (isArrayOfChild(unwrappedOpt, analysisOptions)) {
      hasArrayOfChild = true;
    }
    const optRes = analyzeChildRefSchema(unwrappedOpt, analysisOptions);
    if (optRes.isChildList) {
      return { isChild: false, isChildList: true };
    }
    if (optRes.isChild) {
      hasChildRef = true;
    }
  }
  if (hasTemplate || hasArrayOfChild) {
    return { isChild: false, isChildList: true };
  }
  if (hasChildRef) {
    return { isChild: true, isChildList: false };
  }
  return { isChild: false, isChildList: false };
}
function isChildListDescription(desc, childListNames) {
  if (!desc)
    return false;
  if (desc.startsWith("REF:")) {
    const refTarget2 = extractRefDefName(desc.substring(4).split("|")[0]);
    if (childListNames.has(refTarget2))
      return true;
  }
  const refTarget = extractRefDefName(desc.split("|")[0]);
  if (refTarget && childListNames.has(refTarget)) {
    return true;
  }
  const trimmed = desc.trim();
  if (childListNames.has(trimmed)) {
    return true;
  }
  return false;
}
function isChildDescription(desc, childNames) {
  if (!desc)
    return false;
  if (desc.startsWith("REF:")) {
    const refTarget2 = extractRefDefName(desc.substring(4).split("|")[0]);
    if (childNames.has(refTarget2))
      return true;
  }
  const refTarget = extractRefDefName(desc.split("|")[0]);
  if (refTarget && childNames.has(refTarget)) {
    return true;
  }
  const trimmed = desc.trim();
  if (childNames.has(trimmed)) {
    return true;
  }
  return false;
}
function checkDescriptionChildRef(descriptions, options) {
  const childListNames = options.childListRefNames;
  const childNames = options.childRefNames;
  for (const desc of descriptions) {
    if (isChildListDescription(desc, childListNames)) {
      return { isChild: false, isChildList: true };
    }
    if (isChildDescription(desc, childNames)) {
      return { isChild: true, isChildList: false };
    }
  }
  return null;
}
function analyzeZodArray(elem, options) {
  const elemRes = analyzeChildRefSchema(elem, options);
  if (elemRes.isChild || elemRes.isChildList) {
    return { isChild: false, isChildList: true };
  }
  return { isChild: false, isChildList: false };
}
function analyzeChildRefSchema(schema, options) {
  if (!schema || typeof schema !== "object") {
    return { isChild: false, isChildList: false };
  }
  const directKind = childRefKindOf(schema);
  if (directKind === "component-id") {
    return { isChild: true, isChildList: false };
  }
  if (directKind === "child-list") {
    return { isChild: false, isChildList: true };
  }
  const descMatch = checkDescriptionChildRef(getDescriptions(schema), options);
  if (descMatch)
    return descMatch;
  const current = unwrapZodType(schema);
  if (!current?._def) {
    return checkJsonSchemaRef(schema, options);
  }
  const unwrappedKind = childRefKindOf(current);
  if (unwrappedKind === "component-id") {
    return { isChild: true, isChildList: false };
  }
  if (unwrappedKind === "child-list") {
    return { isChild: false, isChildList: true };
  }
  const typeName = current._def.typeName;
  if (typeName === "ZodArray") {
    const elem = unwrapZodType(current._def.type);
    return analyzeZodArray(elem, options);
  }
  if (typeName === "ZodUnion") {
    const unionOptions = current._def.options ?? [];
    return analyzeUnionOptions(unionOptions, options);
  }
  if (typeName === "ZodObject" && typeof current._def.shape === "function") {
    const shape = current._def.shape();
    if (shape.componentId && (shape.path || shape.dataBinding) || shape.explicitList || shape.template) {
      return { isChild: false, isChildList: true };
    }
  }
  return { isChild: false, isChildList: false };
}
function addNestedRef(acc, key, subKey) {
  const existing = acc.nestedRefs[key];
  if (existing) {
    existing.add(subKey);
    return;
  }
  acc.nestedRefs[key] = /* @__PURE__ */ new Set([subKey]);
}
function inspectShapeField(key, fieldSchema, acc, options) {
  const res = analyzeChildRefSchema(fieldSchema, options);
  if (res.isChildList) {
    acc.listRefs.add(key);
    return;
  }
  if (res.isChild) {
    acc.singleRefs.add(key);
    return;
  }
  const inner = unwrapZodType(fieldSchema);
  if (inner?._def?.typeName !== "ZodArray")
    return;
  const elem = unwrapZodType(inner._def.type);
  if (elem?._def?.typeName !== "ZodObject" || typeof elem._def.shape !== "function")
    return;
  const elemShape = elem._def.shape();
  for (const [subKey, subSchema] of Object.entries(elemShape)) {
    const subRes = analyzeChildRefSchema(subSchema, options);
    if (subRes.isChild || subRes.isChildList) {
      acc.listRefs.add(key);
      addNestedRef(acc, key, subKey);
    }
  }
}
function rawArrayItemProperties(propSchema) {
  if (typeof propSchema !== "object" || propSchema === null)
    return null;
  const schema = propSchema;
  if (schema["type"] !== "array" && !("items" in schema))
    return null;
  const items = schema["items"];
  if (typeof items !== "object" || items === null)
    return null;
  const itemProps = items["properties"];
  if (typeof itemProps !== "object" || itemProps === null)
    return null;
  return itemProps;
}
function inspectRawProperties(properties, acc, options) {
  for (const [key, propSchema] of Object.entries(properties)) {
    const res = analyzeChildRefSchema(propSchema, options);
    if (res.isChildList) {
      acc.listRefs.add(key);
      continue;
    }
    if (res.isChild) {
      acc.singleRefs.add(key);
      continue;
    }
    const itemProps = rawArrayItemProperties(propSchema);
    if (!itemProps)
      continue;
    for (const [subKey, subSchema] of Object.entries(itemProps)) {
      const subRes = analyzeChildRefSchema(subSchema, options);
      if (subRes.isChild || subRes.isChildList) {
        acc.listRefs.add(key);
        addNestedRef(acc, key, subKey);
      }
    }
  }
}
function inspectComponentSchema(schema, acc, options) {
  if (!schema)
    return;
  const current = unwrapZodType(schema);
  if (current?._def?.typeName === "ZodObject" && typeof current._def.shape === "function") {
    const shape = current._def.shape();
    for (const [key, fieldSchema] of Object.entries(shape)) {
      inspectShapeField(key, fieldSchema, acc, options);
    }
    return;
  }
  if (typeof schema === "object" && schema !== null && "properties" in schema) {
    const rawProps = schema.properties;
    if (typeof rawProps === "object" && rawProps !== null) {
      inspectRawProperties(rawProps, acc, options);
    }
  }
}
function buildComponentRefMap(catalogOrComponents, options) {
  const refMap = {};
  const componentApis = typeof catalogOrComponents?.components?.values === "function" ? Array.from(catalogOrComponents.components.values()) : Array.isArray(catalogOrComponents) ? catalogOrComponents : Array.from(catalogOrComponents.values());
  for (const compApi of componentApis) {
    const acc = {
      singleRefs: /* @__PURE__ */ new Set(),
      listRefs: /* @__PURE__ */ new Set(),
      nestedRefs: {}
    };
    inspectComponentSchema(compApi.schema, acc, options);
    refMap[compApi.name] = {
      singleRefs: acc.singleRefs,
      listRefs: acc.listRefs,
      nestedRefs: acc.nestedRefs
    };
  }
  return refMap;
}

// ../../node_modules/.pnpm/@preact+signals-core@1.14.4/node_modules/@preact/signals-core/dist/signals-core.mjs
var i = /* @__PURE__ */ Symbol.for("preact-signals");
function t() {
  if (e > 1) {
    e--;
    return;
  }
  let i2, t2 = false;
  !(function() {
    let i3 = f;
    f = void 0;
    while (void 0 !== i3) {
      const t3 = i3.S;
      if (t3.v === i3.v) {
        for (let n2 = t3.t; void 0 !== n2; n2 = n2.x) if (n2.i === i3.i) n2.i = t3.i;
      }
      i3 = i3.o;
    }
  })();
  while (void 0 !== h) {
    let n2 = h;
    h = void 0;
    c++;
    while (void 0 !== n2) {
      const o2 = n2.u;
      n2.u = void 0;
      n2.f &= -3;
      if (!(8 & n2.f) && w(n2)) try {
        n2.c();
      } catch (n3) {
        if (!t2) {
          i2 = n3;
          t2 = true;
        }
      }
      n2 = o2;
    }
  }
  c = 0;
  e--;
  if (t2) throw i2;
}
function n(i2) {
  if (e > 0) return i2();
  d = ++u;
  e++;
  try {
    return i2();
  } finally {
    t();
  }
}
var o;
var s;
var h;
function r(i2) {
  const t2 = o, n2 = s;
  o = void 0;
  s = void 0;
  try {
    return i2();
  } finally {
    o = t2;
    s = n2;
  }
}
var f;
var e = 0;
var c = 0;
var u = 0;
var d = 0;
var v = 0;
function l(i2) {
  if (void 0 === o) return;
  let t2 = i2.n;
  if (void 0 === t2 || t2.t !== o) {
    t2 = { i: 0, S: i2, p: o.s, n: void 0, t: o, e: void 0, x: void 0, r: t2 };
    if (void 0 !== o.s) o.s.n = t2;
    o.s = t2;
    i2.n = t2;
    if (32 & o.f) i2.S(t2);
    return t2;
  } else if (-1 === t2.i) {
    t2.i = 0;
    if (void 0 !== t2.n) {
      t2.n.p = t2.p;
      if (void 0 !== t2.p) t2.p.n = t2.n;
      t2.p = o.s;
      t2.n = void 0;
      o.s.n = t2;
      o.s = t2;
    }
    return t2;
  }
}
function a(i2, t2) {
  this.v = i2;
  this.i = 0;
  this.n = void 0;
  this.t = void 0;
  this.l = 0;
  this.W = null == t2 ? void 0 : t2.watched;
  this.Z = null == t2 ? void 0 : t2.unwatched;
  this.name = null == t2 ? void 0 : t2.name;
}
a.prototype.brand = i;
a.prototype.h = function() {
  return true;
};
a.prototype.S = function(i2) {
  const t2 = this.t;
  if (t2 !== i2 && void 0 === i2.e) {
    i2.x = t2;
    this.t = i2;
    if (void 0 !== t2) t2.e = i2;
    else r(() => {
      var i3;
      null == (i3 = this.W) || i3.call(this);
    });
  }
};
a.prototype.U = function(i2) {
  if (void 0 !== this.t) {
    const t2 = i2.e, n2 = i2.x;
    if (void 0 !== t2) {
      t2.x = n2;
      i2.e = void 0;
    }
    if (void 0 !== n2) {
      n2.e = t2;
      i2.x = void 0;
    }
    if (i2 === this.t) {
      this.t = n2;
      if (void 0 === n2) r(() => {
        var i3;
        null == (i3 = this.Z) || i3.call(this);
      });
    }
  }
};
a.prototype.subscribe = function(i2) {
  return j(() => {
    const t2 = this.value;
    r(() => i2(t2));
  }, { name: "sub" });
};
a.prototype.valueOf = function() {
  return this.value;
};
a.prototype.toString = function() {
  return this.value + "";
};
a.prototype.toJSON = function() {
  return this.value;
};
a.prototype.peek = function() {
  return r(() => this.value);
};
Object.defineProperty(a.prototype, "value", { get() {
  const i2 = l(this);
  if (void 0 !== i2) i2.i = this.i;
  return this.v;
}, set(i2) {
  if (i2 !== this.v) {
    if (c > 100) throw new Error("Cycle detected");
    !(function(i3) {
      if (0 !== e && 0 === c) {
        if (i3.l !== d) {
          i3.l = d;
          f = { S: i3, v: i3.v, i: i3.i, o: f };
        }
      }
    })(this);
    this.v = i2;
    this.i++;
    v++;
    e++;
    try {
      for (let i3 = this.t; void 0 !== i3; i3 = i3.x) i3.t.N();
    } finally {
      t();
    }
  }
} });
function y(i2, t2) {
  return new a(i2, t2);
}
function w(i2) {
  for (let t2 = i2.s; void 0 !== t2; t2 = t2.n) if (t2.S.i !== t2.i || !t2.S.h() || t2.S.i !== t2.i) return true;
  return false;
}
function _(i2) {
  for (let t2 = i2.s; void 0 !== t2; t2 = t2.n) {
    const n2 = t2.S.n;
    if (void 0 !== n2) t2.r = n2;
    t2.S.n = t2;
    t2.i = -1;
    if (void 0 === t2.n) {
      i2.s = t2;
      break;
    }
  }
}
function b(i2) {
  let t2, n2 = i2.s;
  while (void 0 !== n2) {
    const i3 = n2.p;
    if (-1 === n2.i) {
      n2.S.U(n2);
      if (void 0 !== i3) i3.n = n2.n;
      if (void 0 !== n2.n) n2.n.p = i3;
    } else t2 = n2;
    n2.S.n = n2.r;
    if (void 0 !== n2.r) n2.r = void 0;
    n2 = i3;
  }
  i2.s = t2;
}
function p(i2, t2) {
  a.call(this, void 0, t2);
  this.x = i2;
  this.s = void 0;
  this.g = v - 1;
  this.f = 4;
}
p.prototype = new a();
p.prototype.h = function() {
  this.f &= -3;
  if (1 & this.f) return false;
  if (32 == (36 & this.f)) return true;
  this.f &= -5;
  if (this.g === v) return true;
  this.g = v;
  this.f |= 1;
  if (this.i > 0 && !w(this)) {
    this.f &= -2;
    return true;
  }
  const i2 = o;
  try {
    _(this);
    o = this;
    const i3 = this.x();
    if (16 & this.f || this.v !== i3 || 0 === this.i) {
      this.v = i3;
      this.f &= -17;
      this.i++;
    }
  } catch (i3) {
    this.v = i3;
    this.f |= 16;
    this.i++;
  }
  o = i2;
  b(this);
  this.f &= -2;
  return true;
};
p.prototype.S = function(i2) {
  if (void 0 === this.t) {
    this.f |= 36;
    for (let i3 = this.s; void 0 !== i3; i3 = i3.n) i3.S.S(i3);
  }
  a.prototype.S.call(this, i2);
};
p.prototype.U = function(i2) {
  if (void 0 !== this.t) {
    a.prototype.U.call(this, i2);
    if (void 0 === this.t) {
      this.f &= -33;
      for (let i3 = this.s; void 0 !== i3; i3 = i3.n) i3.S.U(i3);
    }
  }
};
p.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 6;
    for (let i2 = this.t; void 0 !== i2; i2 = i2.x) i2.t.N();
  }
};
Object.defineProperty(p.prototype, "value", { get() {
  if (1 & this.f) throw new Error("Cycle detected");
  const i2 = l(this);
  this.h();
  if (void 0 !== i2) i2.i = this.i;
  if (16 & this.f) throw this.v;
  return this.v;
} });
function g(i2, t2) {
  return new p(i2, t2);
}
function S(i2) {
  const n2 = i2.m;
  i2.m = void 0;
  if ("function" == typeof n2) {
    e++;
    const s2 = o;
    o = void 0;
    try {
      n2();
    } catch (t2) {
      i2.f &= -2;
      i2.f |= 8;
      m(i2);
      throw t2;
    } finally {
      o = s2;
      t();
    }
  }
}
function m(i2) {
  for (let t2 = i2.s; void 0 !== t2; t2 = t2.n) t2.S.U(t2);
  i2.x = void 0;
  i2.s = void 0;
  S(i2);
}
function x(i2) {
  if (o !== this) throw new Error("Out-of-order effect");
  b(this);
  o = i2;
  this.f &= -2;
  if (8 & this.f) m(this);
  t();
}
function E(i2, t2) {
  this.x = i2;
  this.m = void 0;
  this.s = void 0;
  this.u = void 0;
  this.f = 32;
  this.name = null == t2 ? void 0 : t2.name;
  if (s) s.push(this);
}
E.prototype.c = function() {
  const i2 = this.S();
  try {
    if (8 & this.f) return;
    if (void 0 === this.x) return;
    const t2 = this.x();
    if ("function" == typeof t2) this.m = t2;
  } finally {
    i2();
  }
};
E.prototype.S = function() {
  if (1 & this.f) throw new Error("Cycle detected");
  this.f |= 1;
  this.f &= -9;
  S(this);
  _(this);
  e++;
  const i2 = o;
  o = this;
  return x.bind(this, i2);
};
E.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 2;
    this.u = h;
    h = this;
  }
};
E.prototype.d = function() {
  this.f |= 8;
  if (!(1 & this.f)) m(this);
};
E.prototype.dispose = function() {
  this.d();
};
function j(i2, t2) {
  const n2 = new E(i2, t2);
  try {
    n2.c();
  } catch (i3) {
    n2.d();
    throw i3;
  }
  const o2 = n2.d.bind(n2);
  o2[Symbol.dispose] = o2;
  return o2;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/reactivity/signals.js
var signalImpl;
var computedImpl;
var effectImpl;
var batchWriteImpl;
var isSignalImpl;
var getValueImpl;
var setValueImpl;
var peekValueImpl;
var _PRIVATE_DEFAULT_SIGNAL_IMPLEMENTATION = {
  signal: y,
  computed: g,
  effect: j,
  batchWrite: n,
  isSignal: (val) => !!val && typeof val === "object" && "value" in val && "peek" in val,
  getValue: (signal2) => signal2.value,
  setValue: (signal2, value) => {
    if (!(signal2 instanceof p)) {
      signal2.value = value;
    }
  },
  peekValue: (signal2) => signal2.peek()
};
setSignalImplementation(_PRIVATE_DEFAULT_SIGNAL_IMPLEMENTATION);
function setSignalImplementation(impl) {
  signalImpl = impl.signal;
  computedImpl = impl.computed;
  effectImpl = impl.effect;
  batchWriteImpl = impl.batchWrite;
  isSignalImpl = impl.isSignal;
  getValueImpl = impl.getValue;
  setValueImpl = impl.setValue;
  peekValueImpl = impl.peekValue;
}
function signal(initialValue) {
  return signalImpl(initialValue);
}
function computed(computeFn) {
  return computedImpl(computeFn);
}
function effect(effectFn) {
  return effectImpl(effectFn);
}
function batchWrite(batchFn) {
  return batchWriteImpl(batchFn);
}
function isSignal(val) {
  return isSignalImpl(val);
}
function getValue(signal2) {
  return getValueImpl(signal2);
}
function setValue(signal2, value) {
  setValueImpl(signal2, value);
}
function peekValue(signal2) {
  return peekValueImpl(signal2);
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/state/data-model.js
function isNumeric(value) {
  return /^(0|[1-9]\d*)$/.test(value);
}
var MAX_ARRAY_INDEX = 1e4;
var FORBIDDEN_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var DataModel = class {
  /**
   * Initializes a new `DataModel` instance.
   *
   * @param initialData Initial data for the model. Defaults to an empty object.
   */
  constructor(initialData = {}) {
    this.data = {};
    this.signals = /* @__PURE__ */ new Map();
    this.subscriptions = /* @__PURE__ */ new Set();
    this.data = initialData;
  }
  /**
   * Retrieves a Preact Signal for a specific data path.
   *
   * This provides a reactive way to access a value. If the value at the path
   * changes via `set()`, the signal will automatically be updated.
   *
   * @param path The JSON pointer path to create or retrieve a signal for.
   * @returns A Preact Signal representing the value at the specified path.
   * @throws {A2uiDataError} If path is null, undefined, or contains forbidden
   *     segments (`__proto__`, `constructor`, `prototype`).
   */
  getSignal(path) {
    const normalizedPath = this.normalizePath(path);
    if (!this.signals.has(normalizedPath)) {
      this.signals.set(normalizedPath, signal(this.get(normalizedPath)));
    }
    return this.signals.get(normalizedPath);
  }
  /**
   * Updates the model at the specific path and notifies all relevant signals.
   * If path is '/' or empty, replaces the entire root.
   *
   * Note on `undefined` values:
   * - For objects: Setting a property to `undefined` removes the key from the
   * object.
   * - For arrays: Setting an index to `undefined` sets that index to
   * `undefined` but preserves the array length (sparse array).
   *
   * @param path The JSON pointer path to set value for.
   * @param value The value to set at the specified path.
   * @returns This `DataModel` instance for chaining.
   * @throws {A2uiDataError} If path is null, undefined, invalid for
   *     arrays/primitives, exceeds max array bounds, or contains forbidden
   *     segments (`__proto__`, `constructor`, `prototype`).
   */
  set(path, value) {
    if (path === null || path === void 0) {
      throw new A2uiDataError("Path cannot be null or undefined.");
    }
    const segments = this.parsePath(path);
    if (segments.length === 0) {
      this.data = value === null || value === void 0 ? {} : value;
      this.notifyAllSignals();
      return this;
    }
    const lastSegment = segments.pop();
    if ((value === void 0 || value === null) && this.get(path) === void 0) {
      return this;
    }
    if (this.data === void 0 || this.data === null) {
      this.data = {};
    } else if (typeof this.data !== "object") {
      throw new A2uiDataError(`Cannot set path '${path}': the data model root is a primitive value.`, path);
    }
    let current = this.data;
    for (let i2 = 0; i2 < segments.length; i2++) {
      const segment = segments[i2];
      if (Array.isArray(current)) {
        if (!isNumeric(segment)) {
          throw new A2uiDataError(`Cannot use non-numeric segment '${segment}' on an array in path '${path}'.`, path);
        }
        const index = parseInt(segment, 10);
        if (index > MAX_ARRAY_INDEX) {
          throw new A2uiDataError(`Cannot set path '${path}': array index '${segment}' exceeds maximum supported index (${MAX_ARRAY_INDEX}).`, path);
        }
        const val = current[index];
        if (val !== void 0 && val !== null && typeof val !== "object") {
          throw new A2uiDataError(`Cannot set path '${path}': segment '${segment}' is a primitive value.`, path);
        }
        if (val === void 0 || val === null) {
          const nextSegment = i2 < segments.length - 1 ? segments[i2 + 1] : lastSegment;
          if (isNumeric(nextSegment)) {
            const nextIdx = parseInt(nextSegment, 10);
            if (nextIdx > MAX_ARRAY_INDEX) {
              throw new A2uiDataError(`Cannot set path '${path}': array index '${nextSegment}' exceeds maximum supported index (${MAX_ARRAY_INDEX}).`, path);
            }
            current[index] = [];
          } else {
            current[index] = {};
          }
        }
      } else {
        const hasOwnProp = Object.prototype.hasOwnProperty.call(current, segment);
        if (hasOwnProp) {
          const propVal = current[segment];
          if (propVal !== void 0 && propVal !== null && typeof propVal !== "object") {
            throw new A2uiDataError(`Cannot set path '${path}': segment '${segment}' is a primitive value.`, path);
          }
        }
        if (!hasOwnProp || current[segment] === void 0 || current[segment] === null) {
          const nextSegment = i2 < segments.length - 1 ? segments[i2 + 1] : lastSegment;
          if (isNumeric(nextSegment)) {
            const nextIdx = parseInt(nextSegment, 10);
            if (nextIdx > MAX_ARRAY_INDEX) {
              throw new A2uiDataError(`Cannot set path '${path}': array index '${nextSegment}' exceeds maximum supported index (${MAX_ARRAY_INDEX}).`, path);
            }
            current[segment] = [];
          } else {
            current[segment] = {};
          }
        }
      }
      current = current[segment];
    }
    if (Array.isArray(current)) {
      if (!isNumeric(lastSegment)) {
        throw new A2uiDataError(`Cannot use non-numeric segment '${lastSegment}' on an array in path '${path}'.`, path);
      }
      const lastIndex = parseInt(lastSegment, 10);
      if (lastIndex > MAX_ARRAY_INDEX) {
        throw new A2uiDataError(`Cannot set path '${path}': array index '${lastSegment}' exceeds maximum supported index (${MAX_ARRAY_INDEX}).`, path);
      }
    }
    if (value === void 0 || value === null) {
      if (Array.isArray(current)) {
        const idx = parseInt(lastSegment, 10);
        if (idx < current.length) {
          current[idx] = void 0;
        }
      } else {
        delete current[lastSegment];
      }
    } else {
      current[lastSegment] = value;
    }
    this.notifySignals(path);
    return this;
  }
  /**
   * Deletes the value at the specified JSON pointer path.
   *
   * If `path` is `'/'` or empty, resets the root data model to an empty object.
   *
   * @param path The JSON pointer path to remove.
   * @returns This `DataModel` instance for chaining.
   */
  delete(path) {
    return this.set(path, void 0);
  }
  /**
   * Resolves a relative path against a base context path.
   *
   * @param path The path to resolve.
   * @param contextPath The base path (optional).
   * @returns The resolved absolute path.
   */
  static resolvePath(path, contextPath) {
    if (path.startsWith("/")) {
      return path;
    }
    if (contextPath) {
      const base = contextPath.endsWith("/") ? contextPath : `${contextPath}/`;
      return `${base}${path}`;
    }
    return `/${path}`;
  }
  /**
   * Retrieves data at a specific JSON pointer path.
   *
   * @template T The expected type of the returned value. Defaults to `any`.
   * @param path The JSON pointer path to read from.
   * @returns The value at the specified path, or undefined if not found.
   * @throws {A2uiDataError} If path is null, undefined, or contains forbidden
   *     segments (`__proto__`, `constructor`, `prototype`).
   */
  get(path) {
    if (path === null || path === void 0) {
      throw new A2uiDataError("Path cannot be null or undefined.");
    }
    if (path === "/" || path === "") {
      return this.data;
    }
    const segments = this.parsePath(path);
    let current = this.data;
    for (const segment of segments) {
      if (current === void 0 || current === null || typeof current !== "object") {
        return void 0;
      }
      if (Array.isArray(current)) {
        if (!isNumeric(segment)) {
          return void 0;
        }
        const index = parseInt(segment, 10);
        if (index < 0 || index >= current.length) {
          return void 0;
        }
        current = current[index];
      } else {
        if (!Object.prototype.hasOwnProperty.call(current, segment)) {
          return void 0;
        }
        current = current[segment];
      }
    }
    return current;
  }
  /**
   * Checks whether a JSON pointer path physically exists in the data model.
   *
   * Differentiates between a path holding an explicit `null` value (`true`) and
   * a path that is absent from the object or array hierarchy (`false`).
   *
   * @param path Absolute JSON pointer path to check.
   * @returns Whether every segment along `path` exists in the hierarchy.
   */
  hasPath(path) {
    if (path === null || path === void 0) {
      return false;
    }
    return this.get(path) !== void 0;
  }
  /**
   * Subscribes to changes at the specified data path.
   *
   * This is a backwards-compatible layer using Preact Signals internally. It
   * allows listeners to be notified whenever the value at the specified path
   * (or any of its ancestors/descendants) changes.
   *
   * @param path The JSON pointer path to observe.
   * @param onChange A callback fired whenever the value changes.
   * @returns A `DataSubscription` containing the initial value and an
   *     `unsubscribe` method.
   * @throws {A2uiDataError} If path is null, undefined, or contains forbidden
   *     segments (`__proto__`, `constructor`, `prototype`).
   */
  subscribe(path, onChange) {
    const sig = this.getSignal(path);
    let isSync = true;
    let currentValue = peekValue(sig);
    const dispose = effect(() => {
      const val = getValue(sig);
      currentValue = val;
      if (!isSync) {
        onChange(val);
      }
    });
    isSync = false;
    this.subscriptions.add(dispose);
    return {
      get value() {
        return currentValue;
      },
      unsubscribe: () => {
        dispose();
        this.subscriptions.delete(dispose);
      }
    };
  }
  /**
   * Clears all internal subscriptions and active signals.
   */
  dispose() {
    for (const dispose of this.subscriptions) {
      dispose();
    }
    this.subscriptions.clear();
    this.signals.clear();
  }
  normalizePath(path) {
    const segments = path.split("/").filter((p2) => p2.length > 0);
    return segments.length === 0 ? "/" : `/${segments.join("/")}`;
  }
  parsePath(path) {
    return path.split("/").filter((p2) => p2.length > 0).map((rawSegment) => {
      const segment = rawSegment.replace(/~([01])/g, (_2, g2) => g2 === "1" ? "/" : "~");
      if (FORBIDDEN_KEYS.has(segment)) {
        throw new A2uiDataError(`Forbidden path segment '${segment}' in path '${path}'.`, path);
      }
      return segment;
    });
  }
  notifySignals(path) {
    const normalizedPath = this.normalizePath(path);
    batchWrite(() => {
      this.updateSignal(normalizedPath);
      let parentPath = normalizedPath;
      while (parentPath !== "/" && parentPath !== "") {
        parentPath = parentPath.substring(0, parentPath.lastIndexOf("/")) || "/";
        this.updateSignal(parentPath);
      }
      for (const subPath of this.signals.keys()) {
        if (this.isDescendant(subPath, normalizedPath)) {
          this.updateSignal(subPath);
        }
      }
    });
  }
  updateSignal(path) {
    const sig = this.signals.get(path);
    if (sig) {
      const val = this.get(path);
      if (Array.isArray(val)) {
        setValue(sig, val.slice());
      } else if (typeof val === "object" && val !== null) {
        setValue(sig, { ...val });
      } else {
        setValue(sig, val);
      }
    }
  }
  notifyAllSignals() {
    batchWrite(() => {
      for (const path of this.signals.keys()) {
        this.updateSignal(path);
      }
    });
  }
  isDescendant(childPath, parentPath) {
    if (parentPath === "/" || parentPath === "") {
      return childPath !== "/";
    }
    return childPath.startsWith(parentPath + "/");
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/types/helpers.js
var MAX_FUNCTION_CALL_ARGS = 1e3;
var AnyComponentSchema = external_exports.object({
  "component": external_exports.string().describe("The type name of the component."),
  "id": external_exports.lazy(() => ComponentIdSchema).optional(),
  "weight": external_exports.number().optional()
}).passthrough().describe("A generic A2UI component definition.");

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/state/resolve-surface-catalog.js
function resolveSurfaceCatalog(surface, catalogId, subject) {
  if (catalogId !== void 0) {
    const found = surface.availableCatalogs?.get(catalogId);
    if (!found) {
      throw new A2uiCatalogError(`Catalog not found: ${catalogId}`);
    }
    return found;
  }
  if (!surface.defaultCatalog) {
    throw new A2uiCatalogError(`${subject} names no catalogId and surface '${surface.id}' has no default catalogId.`);
  }
  return surface.defaultCatalog;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/resolution/data-context.js
var schemaKeysCache = /* @__PURE__ */ new WeakMap();
var SYSTEM_FUNCTION_CATALOG_ID = "a2ui:system-functions";
var systemFunctionCatalog;
function getSystemFunctionCatalog() {
  systemFunctionCatalog ??= new Catalog(SYSTEM_FUNCTION_CATALOG_ID, SpecVersion.V1_0, [], SYSTEM_FUNCTIONS);
  return systemFunctionCatalog;
}
function getKnownSchemaKeys(schema) {
  if (schemaKeysCache.has(schema)) {
    return schemaKeysCache.get(schema);
  }
  const result = (() => {
    let current = schema;
    while (current) {
      if (current instanceof external_exports.ZodObject || current._def?.typeName === "ZodObject") {
        if (current._def?.unknownKeys === "passthrough") {
          return null;
        }
        const shape = typeof current.shape === "function" ? current.shape() : current.shape;
        if (shape && typeof shape === "object") {
          return new Set(Object.keys(shape));
        }
        return null;
      }
      if (current instanceof external_exports.ZodEffects || current._def?.typeName === "ZodEffects") {
        current = current._def.schema;
        continue;
      }
      if (current instanceof external_exports.ZodOptional || current instanceof external_exports.ZodNullable || current._def?.typeName === "ZodOptional" || current._def?.typeName === "ZodNullable") {
        current = current._def.innerType;
        continue;
      }
      if (current instanceof external_exports.ZodDefault || current._def?.typeName === "ZodDefault") {
        current = current._def.innerType;
        continue;
      }
      if (current instanceof external_exports.ZodCatch || current._def?.typeName === "ZodCatch") {
        current = current._def.innerType;
        continue;
      }
      if (current instanceof external_exports.ZodIntersection || current._def?.typeName === "ZodIntersection") {
        const leftKeys = getKnownSchemaKeys(current._def.left);
        const rightKeys = getKnownSchemaKeys(current._def.right);
        if (!leftKeys || !rightKeys) {
          return null;
        }
        return /* @__PURE__ */ new Set([...leftKeys, ...rightKeys]);
      }
      if (current instanceof external_exports.ZodUnion || current._def?.typeName === "ZodUnion") {
        const options = current._def.options;
        const allKeys = /* @__PURE__ */ new Set();
        for (const opt of options) {
          const k = getKnownSchemaKeys(opt);
          if (!k)
            return null;
          for (const key of k) {
            allKeys.add(key);
          }
        }
        return allKeys;
      }
      return null;
    }
    return null;
  })();
  schemaKeysCache.set(schema, result);
  return result;
}
function validateFunctionArgs(functionName, rawArgs, catalog) {
  if (!rawArgs || typeof rawArgs !== "object" || Array.isArray(rawArgs)) {
    return;
  }
  const suppliedKeys = Object.keys(rawArgs);
  if (suppliedKeys.length > MAX_FUNCTION_CALL_ARGS) {
    throw new A2uiExpressionError(`Function call '${functionName}' exceeds maximum allowed arguments count (${MAX_FUNCTION_CALL_ARGS})`, functionName);
  }
  const fn = catalog?.functions?.get?.(functionName) ?? (functionName === "@index" && catalog?.protocolVersion && isAtLeastVersion(catalog.protocolVersion, SpecVersion.V1_0) ? IndexApi : void 0);
  if (!fn?.schema) {
    return;
  }
  const knownKeys = getKnownSchemaKeys(fn.schema);
  if (!knownKeys) {
    return;
  }
  for (const key of suppliedKeys) {
    if (!knownKeys.has(key)) {
      throw new A2uiExpressionError(`Unknown argument '${key}' passed to function '${functionName}'`, functionName);
    }
  }
  if (suppliedKeys.length > knownKeys.size) {
    throw new A2uiExpressionError(`Too many arguments for function '${functionName}': expected at most ${knownKeys.size}, received ${suppliedKeys.length}`, functionName);
  }
}
function isSingleAtKey(key) {
  return key.startsWith("@") && !key.startsWith("@@");
}
function unescapeObjectKey(key) {
  return key.startsWith("@@") ? key.slice(1) : key;
}
var RESERVED_DIRECTIVES = /* @__PURE__ */ new Set(["@path", "@call"]);
function validateReservedDirectives(keys, protocolVersion) {
  if (!isAtLeastVersion(protocolVersion, "1.0")) {
    return;
  }
  for (const key of keys) {
    if (isSingleAtKey(key) && !RESERVED_DIRECTIVES.has(key)) {
      throw new A2uiValidationError(`Unrecognized reserved protocol directive '${key}' in v1.0 dynamic object. Reserved keys must be in ${Array.from(RESERVED_DIRECTIVES).join(", ")}, or escaped with prefix doubling (e.g. '@${key}').`, void 0, "INVALID_RESERVED_KEY");
    }
  }
}
function resolveContextIndex(startCtx) {
  let ctx = startCtx;
  while (ctx) {
    if (ctx.explicitIndex !== void 0 && Number.isFinite(ctx.explicitIndex)) {
      return ctx.explicitIndex;
    }
    if (!(ctx instanceof DataContext) && typeof ctx.getIndex === "function") {
      const idx = ctx.getIndex();
      if (idx !== void 0 && Number.isFinite(idx)) {
        return idx;
      }
    }
    if (!(ctx instanceof DataContext) && typeof ctx.index === "number" && Number.isFinite(ctx.index)) {
      return ctx.index;
    }
    if (typeof ctx.path === "string") {
      const parts = ctx.path.split("/").filter(Boolean);
      if (parts.length > 0 && /^\d+$/.test(parts[parts.length - 1])) {
        return parseInt(parts[parts.length - 1], 10);
      }
    }
    ctx = ctx.parent;
  }
  return void 0;
}
var MAX_DYNAMIC_VALUE_DEPTH = 1e3;
var DataContext = class _DataContext {
  /**
   * Initializes a new DataContext instance.
   *
   * @param surface The surface model or data model this context belongs to.
   * @param path The absolute path in the DataModel that this context is scoped to.
   * @param index Optional explicit collection iteration index.
   * @param parent Optional parent DataContext in the scope chain.
   */
  constructor(surface, path, index, parent) {
    this.path = path;
    this._isUserActivated = false;
    this._isPassiveEvaluation = false;
    if (surface instanceof DataModel) {
      this.surface = void 0;
      this.dataModel = surface;
      this.functionInvoker = () => void 0;
    } else {
      this.surface = surface;
      this.dataModel = surface.dataModel;
      this.functionInvoker = surface.defaultCatalog?.invoker ?? ((name, ...rest) => resolveSurfaceCatalog(surface, void 0, `Function call '${name}'`).invoker(name, ...rest));
    }
    this.explicitIndex = index;
    this.parent = parent;
    this.warnedPaths = parent ? parent.warnedPaths : /* @__PURE__ */ new Set();
  }
  /** Whether the current function evaluation was initiated by an active user action. */
  get isUserActivated() {
    return this._isUserActivated || Boolean(this.parent?.isUserActivated);
  }
  /** Whether the current function evaluation is running inside a passive reactive binding. */
  get isPassiveEvaluation() {
    return this._isPassiveEvaluation || Boolean(this.parent?.isPassiveEvaluation);
  }
  /**
   * Returns the 0-based iteration index if this context (or an ancestor context)
   * is scoped to a collection template item, or `undefined` when outside any
   * collection template scope.
   *
   * Mirrors `DataContext.index` in Python: checks an explicit `explicitIndex` first,
   * then checks strictly the trailing segment of `ctx.path`, walking `ctx.parent`.
   *
   * @returns The 0-based iteration index, or `undefined` if outside an iteration scope.
   */
  getIndex() {
    return resolveContextIndex(this);
  }
  /** Active iteration index if inside a collection template scope, or `undefined`. */
  get index() {
    return this.getIndex();
  }
  /**
   * Mutates the underlying DataModel at the specified path.
   *
   * @param path JSON pointer path, resolved relative to this context's `path` if not absolute.
   * @param value New value to store in the DataModel.
   */
  set(path, value) {
    const absolutePath = this.resolvePath(path);
    this.dataModel.set(absolutePath, value);
  }
  /**
   * Protocol version of the bound surface.
   *
   * Reads the surface's own version, which is set even when the surface has
   * no default catalog, and falls back to the default catalog's version for
   * surface-like objects that do not carry one.
   */
  get surfaceProtocolVersion() {
    return this.surface?.protocolVersion ?? this.surface?.defaultCatalog?.protocolVersion;
  }
  /** Whether this context targets A2UI protocol v1.0 or newer. */
  get atLeastV10() {
    if (this._cachedAtLeastV10 === void 0) {
      this._cachedAtLeastV10 = isAtLeastVersion(this.surfaceProtocolVersion, "1.0");
    }
    return this._cachedAtLeastV10;
  }
  /**
   * Checks whether an object represents a data binding.
   *
   * In v1.0, data bindings must use `@path`. In v0.9, data bindings use `path`.
   *
   * @param val Candidate object to inspect.
   * @returns Whether the object represents a valid data binding for this context's protocol version.
   */
  isDataBindingObject(val) {
    const hasPath = this.atLeastV10 ? "@path" in val && typeof val["@path"] === "string" : "path" in val && typeof val.path === "string";
    return hasPath && !("componentId" in val);
  }
  /**
   * Checks whether an object represents a function call.
   *
   * In v1.0, function calls must use `@call`. In v0.9, function calls use `call`.
   *
   * @param val Candidate object to inspect.
   * @returns Whether the object represents a valid function call for this context's protocol version.
   */
  isFunctionCallObject(val) {
    return this.atLeastV10 ? "@call" in val && typeof val["@call"] === "string" : "call" in val && typeof val.call === "string";
  }
  /**
   * Checks whether a value contains any dynamic parts (path bindings,
   * function calls, or escaped/reserved directive keys) at any nesting depth.
   *
   * @param value The value or data structure to inspect.
   * @returns Whether the value contains dynamic elements requiring resolution.
   */
  containsDynamicValue(value) {
    if (value === null || typeof value !== "object") {
      return false;
    }
    if (Array.isArray(value)) {
      return value.some((item) => this.containsDynamicValue(item));
    }
    const rec = value;
    if (this.isDataBindingObject(rec) || this.isFunctionCallObject(rec)) {
      return true;
    }
    if (this.atLeastV10) {
      for (const k of Object.keys(rec)) {
        if (k.startsWith("@")) {
          return true;
        }
      }
    }
    return Object.values(rec).some((v2) => this.containsDynamicValue(v2));
  }
  /**
   * Emits a warning if a data binding path does not exist in the data model.
   *
   * @param absolutePath Absolute JSON pointer path to check.
   */
  emitMissingDataBindingWarning(absolutePath) {
    if (typeof this.dataModel?.hasPath === "function" && !this.dataModel.hasPath(absolutePath) && !this.warnedPaths.has(absolutePath)) {
      this.warnedPaths.add(absolutePath);
      void this.surface?.dispatchWarning?.({
        code: "MISSING_DATA_BINDING",
        path: absolutePath,
        message: `Preflight DataBinding Warning: The bound JSON Pointer '${absolutePath}' does not physically exist in the active DataModel. Evaluating to None.`
      });
    }
  }
  /**
   * Synchronously evaluates a DynamicValue into its concrete runtime value.
   *
   * Evaluates the value once at the current moment without creating reactive subscriptions.
   * Use `subscribeDynamicValue` for reactive updates.
   * @param value The DynamicValue object or raw value from the A2UI JSON payload.
   * @param depth The current recursion depth when evaluating nested arguments or expressions.
   * @returns The synchronously resolved value.
   */
  resolveDynamicValue(value, depth = 0, userActivated = false) {
    if (depth > MAX_DYNAMIC_VALUE_DEPTH) {
      const err = new A2uiExpressionError(`Maximum dynamic value nesting depth exceeded (${MAX_DYNAMIC_VALUE_DEPTH})`);
      this.dispatchExpressionError(err, "DynamicValue");
      return void 0;
    }
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      if (!this.containsDynamicValue(value)) {
        return value;
      }
      return value.map((item) => this.resolveDynamicValue(item, depth + 1, userActivated));
    }
    const rec = value;
    if (this.isDataBindingObject(rec)) {
      const bindingPath = rec["@path"] ?? rec.path;
      const absolutePath = this.resolvePath(bindingPath);
      const val = this.dataModel.get(absolutePath);
      if (val === void 0) {
        this.emitMissingDataBindingWarning(absolutePath);
      }
      return val;
    }
    if (this.isFunctionCallObject(rec)) {
      return this.resolveFunctionCallValue(rec, depth, userActivated);
    }
    return this.resolvePlainObjectValue(rec, depth);
  }
  /**
   * Resolves a function call by validating arguments and invoking the function.
   *
   * @param call Function call definition to execute.
   * @param depth Current recursion depth for nested expression tracking.
   * @param userActivated Whether the evaluation was initiated by an active user action.
   * @returns The resolved function return value.
   */
  resolveFunctionCallValue(call, depth = 0, userActivated = false) {
    const callName = call["@call"] ?? call.call;
    const targetCatalog = this.resolveCallCatalog(callName, call);
    if (!targetCatalog) {
      return void 0;
    }
    try {
      validateFunctionArgs(callName, call.args, targetCatalog);
    } catch (e2) {
      this.dispatchExpressionError(e2, callName);
      return void 0;
    }
    const args = {};
    for (const [key, argVal] of Object.entries(call.args ?? {})) {
      args[key] = this.resolveDynamicValue(argVal, depth + 1, userActivated);
    }
    const abortController = new AbortController();
    const prevActivated = this._isUserActivated;
    this._isUserActivated = prevActivated || userActivated;
    let result;
    try {
      result = this.evaluateFunctionReactive(callName, args, targetCatalog.invoker, abortController.signal);
    } finally {
      this._isUserActivated = prevActivated;
    }
    if (result === void 0) {
      return void 0;
    }
    return isSignal(result) ? peekValue(result) : result;
  }
  /**
   * Recursively resolves dynamic values nested inside a plain object.
   *
   * @param rec Plain object dictionary to resolve.
   * @param depth Current recursion depth for nested expression tracking.
   * @returns A copy of the object with all nested dynamic values resolved.
   */
  resolvePlainObjectValue(rec, depth = 0) {
    if (this.atLeastV10) {
      validateReservedDirectives(Object.keys(rec), this.surfaceProtocolVersion);
    }
    if (!this.containsDynamicValue(rec)) {
      return rec;
    }
    const resolved = {};
    for (const [k, v2] of Object.entries(rec)) {
      const key = this.atLeastV10 ? unescapeObjectKey(k) : k;
      resolved[key] = this.resolveDynamicValue(v2, depth + 1);
    }
    return resolved;
  }
  /**
   * Reactively listens to changes in a DynamicValue.
   *
   * Whenever the underlying data or function dependencies change, the `onChange`
   * callback fires with the freshly evaluated result.
   *
   * @template V Expected type of the resolved value.
   * @param value The DynamicValue or raw value to evaluate and observe.
   * @param onChange Callback fired whenever the evaluated result changes.
   * @returns A subscription containing the current value and an `unsubscribe` method.
   */
  subscribeDynamicValue(value, onChange) {
    const sig = this.resolveSignal(value);
    let isSync = true;
    let currentValue = peekValue(sig);
    const dispose = effect(() => {
      const val = getValue(sig);
      currentValue = val;
      if (!isSync) {
        onChange(val);
      }
    });
    isSync = false;
    return {
      get value() {
        return currentValue;
      },
      unsubscribe: () => {
        dispose();
        sig.unsubscribe?.();
      }
    };
  }
  /**
   * Resolves a DynamicValue into a reactive Signal.
   *
   * Recursively resolves any nested path bindings or function calls into a
   * single reactive `Signal`. Changes to underlying data or function dependencies
   * cause the signal's value to update.
   *
   * @template V Expected type of the signal value.
   * @param value The DynamicValue or raw value to evaluate and observe.
   * @param depth The current recursion depth when evaluating nested arguments or expressions.
   * @returns A reactive Signal containing the result of the evaluation.
   */
  resolveSignal(value, depth = 0) {
    if (depth > MAX_DYNAMIC_VALUE_DEPTH) {
      const err = new A2uiExpressionError(`Maximum dynamic value nesting depth exceeded (${MAX_DYNAMIC_VALUE_DEPTH})`);
      this.dispatchExpressionError(err, typeof value === "object" && value && ("@call" in value || "call" in value) ? value["@call"] ?? value.call : "DynamicValue");
      return signal(void 0);
    }
    if (typeof value !== "object" || value === null) {
      return signal(value);
    }
    if (Array.isArray(value)) {
      if (!this.containsDynamicValue(value)) {
        return signal(value);
      }
      const itemSignals = value.map((item) => this.resolveSignal(item, depth + 1));
      const resultSig = computed(() => itemSignals.map((s2) => getValue(s2)));
      resultSig.unsubscribe = () => {
        for (const s2 of itemSignals) {
          s2.unsubscribe?.();
        }
      };
      return resultSig;
    }
    const rec = value;
    if (this.isDataBindingObject(rec)) {
      const bindingPath = rec["@path"] ?? rec.path;
      const absolutePath = this.resolvePath(bindingPath);
      this.emitMissingDataBindingWarning(absolutePath);
      return this.dataModel.getSignal(absolutePath);
    }
    if (this.isFunctionCallObject(rec)) {
      const call = rec;
      const callName = call["@call"] ?? call.call;
      const targetCatalog = this.resolveCallCatalog(callName, call);
      if (!targetCatalog) {
        return signal(void 0);
      }
      try {
        validateFunctionArgs(callName, call.args, targetCatalog);
      } catch (e2) {
        this.dispatchExpressionError(e2, callName);
        return signal(void 0);
      }
      const argSignals = {};
      for (const [key, argVal] of Object.entries(call.args ?? {})) {
        argSignals[key] = this.resolveSignal(argVal, depth + 1);
      }
      if (Object.keys(argSignals).length === 0) {
        const abortController2 = new AbortController();
        const result = this.evaluateFunctionPassive({
          name: callName,
          args: {},
          abortSignal: abortController2.signal,
          invoker: targetCatalog.invoker
        });
        const sig = isSignal(result) ? result : signal(result);
        sig.unsubscribe = () => abortController2.abort();
        return sig;
      }
      const keys = Object.keys(argSignals);
      const resultSig = signal(void 0);
      let abortController;
      let innerUnsubscribe;
      const argsSig = computed(() => {
        const argsRecord = {};
        for (let i2 = 0; i2 < keys.length; i2++) {
          argsRecord[keys[i2]] = getValue(argSignals[keys[i2]]);
        }
        return argsRecord;
      });
      const stopper = effect(() => {
        try {
          const args = getValue(argsSig);
          if (abortController)
            abortController.abort();
          if (innerUnsubscribe) {
            innerUnsubscribe();
            innerUnsubscribe = void 0;
          }
          abortController = new AbortController();
          const res = this.evaluateFunctionPassive({
            name: callName,
            args,
            abortSignal: abortController.signal,
            invoker: targetCatalog.invoker
          });
          if (isSignal(res)) {
            innerUnsubscribe = effect(() => {
              setValue(resultSig, getValue(res));
            });
          } else {
            setValue(resultSig, res);
          }
        } catch (e2) {
          this.dispatchExpressionError(e2, callName);
          setValue(resultSig, void 0);
        }
      });
      resultSig.unsubscribe = () => {
        stopper();
        if (innerUnsubscribe)
          innerUnsubscribe();
        if (abortController)
          abortController.abort();
        for (let i2 = 0; i2 < keys.length; i2++) {
          argSignals[keys[i2]].unsubscribe?.();
        }
      };
      return resultSig;
    }
    if (this.atLeastV10) {
      validateReservedDirectives(Object.keys(rec), this.surfaceProtocolVersion);
    }
    if (!this.containsDynamicValue(rec)) {
      return signal(value);
    }
    const entrySignals = Object.entries(rec).map(([k, v2]) => {
      const key = this.atLeastV10 ? unescapeObjectKey(k) : k;
      return [key, this.resolveSignal(v2, depth + 1)];
    });
    const objSig = computed(() => {
      const resolved = {};
      for (const [k, s2] of entrySignals) {
        resolved[k] = getValue(s2);
      }
      return resolved;
    });
    const prevUnsubscribe = objSig.unsubscribe?.bind(objSig);
    objSig.unsubscribe = () => {
      prevUnsubscribe?.();
      for (const [, s2] of entrySignals) {
        s2.unsubscribe?.();
      }
    };
    return objSig;
  }
  /**
   * Resolves an action by evaluating its top-level dynamic values.
   *
   * For event actions, resolves each value in the context map.
   * For function call actions, evaluates the function call.
   *
   * @param action The Action object to resolve.
   * @returns The resolved action payload or function execution result.
   */
  resolveAction(action) {
    if ("event" in action && typeof action.event === "object" && action.event !== null) {
      const resolvedContext = {};
      const ev = action.event;
      if (ev.context && typeof ev.context === "object" && !Array.isArray(ev.context)) {
        for (const [key, value] of Object.entries(ev.context)) {
          resolvedContext[key] = this.resolveDynamicValue(value);
        }
      }
      const resolvedEvent = {
        ...ev,
        context: resolvedContext
      };
      if (ev.userMessage !== void 0) {
        resolvedEvent.userMessage = this.resolveDynamicValue(ev.userMessage);
      }
      return {
        ...action,
        event: resolvedEvent
      };
    }
    if ("name" in action) {
      const actObj = action;
      const resolvedContext = {};
      if (actObj.context && typeof actObj.context === "object" && !Array.isArray(actObj.context)) {
        for (const [key, value] of Object.entries(actObj.context)) {
          resolvedContext[key] = this.resolveDynamicValue(value);
        }
      }
      const resolved = {
        ...actObj,
        context: resolvedContext
      };
      if (actObj.userMessage !== void 0) {
        resolved.userMessage = this.resolveDynamicValue(actObj.userMessage);
      }
      return resolved;
    }
    if ("functionCall" in action) {
      return this.resolveDynamicValue(action.functionCall, 0, true);
    }
    if ("call" in action) {
      return this.resolveDynamicValue(action, 0, true);
    }
    return action;
  }
  /**
   * Resolves the catalog against which a function call executes.
   *
   * From v1.0, reserved `@`-prefixed system functions such as `@index` belong
   * to no catalog, so they resolve to the built-in system function set
   * whatever the surface's catalogs are. Before v1.0 a call cannot select a
   * catalog, so a `catalogId` on it is ignored and the call runs in the
   * surface catalog.
   *
   * @param name Name of the function being called.
   * @param catalogId Identifier of the catalog named by the call, if specified.
   * @param namesCatalog Whether the call carries a `catalogId` key, whatever
   *   its value.
   * @returns The resolved Catalog instance, or the surface default catalog if omitted.
   * @throws {A2uiExpressionError} If, from v1.0, a call to a reserved `@`
   *   system function names a catalog: such a function belongs to no catalog,
   *   so the call is a malformed expression.
   * @throws {A2uiCatalogError} If the call names a catalog ID that cannot be
   *   resolved on this surface, or names none on a surface without a default
   *   catalog. This is reported as a catalog fault rather than a missing
   *   function, since the function may exist in a catalog that is not
   *   available here.
   */
  resolveFunctionCatalog(name, catalogId, namesCatalog) {
    if (this.atLeastV10 && name.startsWith("@")) {
      if (namesCatalog) {
        throw new A2uiExpressionError(`System function '${name}' belongs to no catalog and must not name a catalogId.`, name);
      }
      return getSystemFunctionCatalog();
    }
    if (!this.surface) {
      throw new A2uiCatalogError(`No surface available to resolve catalog: ${catalogId ?? "default"}`);
    }
    return resolveSurfaceCatalog(this.surface, this.atLeastV10 ? catalogId : void 0, `Function call '${name}'`);
  }
  /**
   * Resolves the catalog a function call runs in, dispatching a
   * `CATALOG_ERROR` to the surface when it cannot be resolved, and an
   * `EXPRESSION_ERROR` for any other failure, such as a system function call
   * that names a catalog.
   *
   * @param name Name of the function being called.
   * @param call The function call, whose `catalogId` selects the catalog.
   * @returns The resolved Catalog instance, or `undefined` if resolution failed.
   */
  resolveCallCatalog(name, call) {
    try {
      return this.resolveFunctionCatalog(name, call.catalogId, "catalogId" in call);
    } catch (e2) {
      if (e2 instanceof A2uiCatalogError && this.surface) {
        this.surface.dispatchError({
          code: "CATALOG_ERROR",
          message: e2.message,
          expression: name
        });
      } else {
        this.dispatchExpressionError(e2, name);
      }
      return void 0;
    }
  }
  evaluateFunctionPassive(options) {
    const { name, args, invoker, abortSignal } = options;
    const prevPassive = this._isPassiveEvaluation;
    this._isPassiveEvaluation = true;
    try {
      return this.evaluateFunctionReactive(name, args, invoker, abortSignal);
    } finally {
      this._isPassiveEvaluation = prevPassive;
    }
  }
  /**
   * Evaluates a catalog function and returns its reactive Signal or static value.
   *
   * Invokes the function with this context through the invoker of the
   * catalog the call resolved to, and dispatches an `EXPRESSION_ERROR` if
   * execution throws.
   *
   * @template V Expected return type of the function evaluation.
   * @param name Name of the function to evaluate.
   * @param args Resolved arguments to pass to the function.
   * @param invoker Invoker of the catalog the call resolved to.
   * @param abortSignal Optional abort signal to cancel asynchronous execution.
   * @returns The evaluated result as a reactive `Signal` or static value, or `undefined` on failure.
   */
  evaluateFunctionReactive(name, args, invoker, abortSignal) {
    try {
      return invoker(name, args, this, abortSignal);
    } catch (e2) {
      this.dispatchExpressionError(e2, name);
      return void 0;
    }
  }
  /**
   * Dispatches an evaluation failure to the surface as an `EXPRESSION_ERROR`.
   *
   * Every failure other than an unresolvable catalog uses this code, including
   * a function missing from the catalog the call resolved to and an unknown
   * system function. Unresolvable catalogs are reported by
   * {@link resolveCallCatalog} as `CATALOG_ERROR`.
   *
   * @param e The error thrown while evaluating the call.
   * @param name Name of the function being evaluated.
   */
  dispatchExpressionError(e2, name) {
    if (!this.surface)
      return;
    if (e2 instanceof external_exports.ZodError || typeof e2 === "object" && e2 !== null && e2.name === "ZodError") {
      const zodErr = e2;
      const err = new A2uiExpressionError(`Validation failed for function '${name}': ${zodErr.message}`, name, zodErr.errors ?? zodErr.issues);
      this.surface.dispatchError({
        code: "EXPRESSION_ERROR",
        message: err.message,
        expression: name,
        details: err.details
      });
    } else if (e2 instanceof A2uiExpressionError) {
      this.surface.dispatchError({
        code: "EXPRESSION_ERROR",
        message: e2.message,
        expression: e2.expression,
        details: e2.details
      });
    } else {
      const errObj = typeof e2 === "object" && e2 !== null ? e2 : {};
      this.surface.dispatchError({
        code: "EXPRESSION_ERROR",
        message: errObj.message ?? `An unexpected error occurred in function ${name}.`,
        expression: name
      });
    }
  }
  /**
   * Creates a child DataContext scoped to a deeper relative path.
   *
   * @param relativePath The path relative to the current context's path.
   * @param index Optional explicit iteration index for this nested scope.
   * @returns A new DataContext instance pointing to the resolved absolute path.
   */
  nested(relativePath, index) {
    const newPath = this.resolvePath(relativePath);
    return new _DataContext(this.surface ?? this.dataModel, newPath, index, this);
  }
  resolvePath(path) {
    if (path.startsWith("/")) {
      return path;
    }
    let base = this.path;
    if (base.endsWith("/") && base.length > 1) {
      base = base.slice(0, -1);
    }
    if (path === "" || path === ".") {
      return base || "/";
    }
    if (base === "/")
      base = "";
    return `${base}/${path}`;
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v1_0/schema/common-types.js
var ComponentIdSchema2 = markChildRef(external_exports.string().describe("REF:#/$defs/ComponentId|The unique identifier for a component, used for both definitions and references within the same surface."), "component-id");
var CallIdSchema2 = external_exports.string().describe("REF:#/$defs/CallId|The unique identifier for a function call.");
var DataBindingSchema2 = external_exports.object({
  "@path": external_exports.string().describe("A JSON Pointer path to a value in the data model.").optional(),
  "path": external_exports.string().describe("A JSON Pointer path to a value in the data model.").optional()
}).refine((data) => data["@path"] !== void 0 || data.path !== void 0, {
  message: "Either '@path' or 'path' must be provided."
}).describe("REF:#/$defs/DataBinding");
var FunctionCommonSchema2 = external_exports.object({
  "@call": external_exports.string().describe("The name of the function to call.").optional(),
  "call": external_exports.string().describe("The name of the function to call.").optional(),
  "catalogId": external_exports.string().describe("The catalog ID for this function, overriding any surface-level default catalogId.").optional()
}).refine((data) => data["@call"] !== void 0 || data.call !== void 0, {
  message: "Either '@call' or 'call' must be provided."
}).describe("REF:#/$defs/FunctionCommon|Baseline envelope properties common to all function calls. Function-specific argument schemas ('args') are defined individually by each function in the active catalog.");
var FunctionCallSchema2 = external_exports.record(external_exports.string(), external_exports.any()).and(external_exports.intersection(FunctionCommonSchema2, external_exports.any())).describe("REF:#/$defs/FunctionCall|Invokes a named function, combining common function properties with the catalog function definition.");
var DynamicStringSchema2 = external_exports.union([external_exports.string(), DataBindingSchema2, FunctionCallSchema2]).describe("REF:#/$defs/DynamicString|Represents a string");
var DynamicBooleanSchema2 = external_exports.union([external_exports.boolean(), DataBindingSchema2, FunctionCallSchema2]).describe("REF:#/$defs/DynamicBoolean|A boolean value that can be a literal, a path, or a function call returning a boolean or a validation result object (coerced to its 'valid' boolean).");
var AccessibilityAttributesSchema2 = external_exports.object({
  "label": DynamicStringSchema2.optional(),
  "description": DynamicStringSchema2.optional(),
  "live": external_exports.enum(["off", "polite", "assertive"]).describe("Controls screen reader announcements for dynamic updates (WAI-ARIA aria-live). 'polite' waits for user pause; 'assertive' interrupts immediately for alerts.").default("off"),
  "hidden": DynamicBooleanSchema2.optional()
}).strict().describe("REF:#/$defs/AccessibilityAttributes|Attributes to enhance accessibility when using assistive technologies like screen readers or model understanding.");
var ExtensionsSchema2 = external_exports.record(external_exports.string(), external_exports.unknown()).superRefine((value, ctx) => {
  for (const key in value) {
    if (!key.match(/^[\p{XID_Start}_][\p{XID_Continue}:-]*$/u)) {
      ctx.addIssue({
        path: [key],
        code: external_exports.ZodIssueCode.custom,
        message: `Invalid extension key "${key}": Keys MUST be Unicode identifiers (UAX #31).`
      });
    }
  }
}).describe("REF:#/$defs/Extensions|Optional extension metadata. Keys MUST be Unicode identifiers (UAX #31). Keys starting with 'a2ui_' are reserved for official extensions.");
var ComponentCommonSchema2 = external_exports.object({
  "id": ComponentIdSchema2,
  "catalogId": external_exports.string().describe("The catalog ID for this component, overriding any surface-level default catalogId.").optional(),
  "accessibility": AccessibilityAttributesSchema2.optional(),
  "metadata": external_exports.object({ "extensions": ExtensionsSchema2.optional() }).strict().describe("Optional component-level metadata for vendor extensions.").optional()
}).describe("REF:#/$defs/ComponentCommon");
var ChildListSchema2 = markChildRef(external_exports.union([
  external_exports.array(ComponentIdSchema2).describe("A static list of child component IDs."),
  external_exports.object({
    "componentId": ComponentIdSchema2,
    "path": external_exports.string().describe("The path to the list of component property objects in the data model.")
  }).strict().describe("A template for generating a dynamic list of children from a data model list. The `componentId` is the component to use as a template.")
]).describe("REF:#/$defs/ChildList"), "child-list");
var DynamicValueSchema2 = external_exports.union([
  external_exports.string(),
  external_exports.number(),
  external_exports.boolean(),
  external_exports.array(external_exports.any()),
  external_exports.record(external_exports.string(), external_exports.unknown()).refine((obj) => !obj || !("@path" in obj) && !("path" in obj) && !("@call" in obj) && !("call" in obj)),
  DataBindingSchema2,
  FunctionCallSchema2
]).describe("REF:#/$defs/DynamicValue|A value that can be a literal, a path, or a function call returning any type.");
var DynamicNumberSchema2 = external_exports.union([external_exports.number(), DataBindingSchema2, FunctionCallSchema2]).describe("REF:#/$defs/DynamicNumber|Represents a value that can be either a literal number, a path to a number in the data model, or a function call returning a number.");
var DynamicStringListSchema2 = external_exports.union([external_exports.array(external_exports.string()), DataBindingSchema2, FunctionCallSchema2]).describe("REF:#/$defs/DynamicStringList|Represents a value that can be either a literal array of strings, a path to a string array in the data model, or a function call returning a string array.");
var IndexSystemFunctionSchema2 = external_exports.object({
  "@call": external_exports.literal("@index").optional(),
  "call": external_exports.literal("@index").optional(),
  "args": external_exports.object({ "offset": DynamicNumberSchema2.optional() }).optional()
}).refine((data) => data["@call"] !== void 0 || data.call !== void 0, {
  message: "Either '@call' or 'call' must be '@index'."
}).describe("REF:#/$defs/IndexSystemFunction");
var CheckRuleSchema2 = external_exports.object({
  "condition": external_exports.union([DataBindingSchema2, FunctionCallSchema2]).describe("Path or function call evaluating to a structured validation result object or a boolean."),
  "message": external_exports.string().describe("Optional fallback error message.").optional()
}).strict().describe("REF:#/$defs/CheckRule|A single validation check rule applied to an input component. The condition function or path evaluates to a structured validation result object or a boolean (which is coerced to a validation result object).");
var CheckableSchema2 = external_exports.object({
  "checks": external_exports.array(CheckRuleSchema2).describe("A list of validation check rules to perform on the component.").optional()
}).describe("REF:#/$defs/Checkable|Properties for components that support renderer-side checks.");
var ActionSchema2 = external_exports.union([
  external_exports.object({
    "event": external_exports.object({
      "name": external_exports.string().describe("The name of the action to be dispatched to the agent."),
      "userMessage": DynamicStringSchema2.optional(),
      "context": external_exports.record(external_exports.string(), DynamicValueSchema2).describe("A JSON object containing the key-value pairs for the action context. Values can be literals or paths. Use literal values unless the value must be dynamically bound to the data model. Do NOT use paths for static IDs.").optional()
    }).strict().describe("The event to dispatch to the agent.")
  }).strict().describe("Triggers an agent-side event."),
  external_exports.object({ "functionCall": FunctionCallSchema2 }).strict().describe("Executes a renderer or agent-side function.")
]).describe("REF:#/$defs/Action|Defines an interaction handler that can either trigger an agent-side event or execute a local renderer-side function.");
var SurfaceSchema2 = external_exports.object({ "component": external_exports.literal("Surface").optional(), "child": external_exports.literal("root").optional() }).strict().describe("REF:#/$defs/Surface|The reserved canonical container component representing an A2UI surface. The Surface component is immutable and always has 'child': 'root'.");
var FunctionResponseSchema2 = external_exports.object({
  "functionCallId": CallIdSchema2,
  "value": external_exports.any().describe("The return value of the function.").optional(),
  "error": external_exports.object({ "code": external_exports.string(), "message": external_exports.string() }).strict().describe("An error object indicating failure of the function execution.").optional()
}).strict().superRefine((val, ctx) => {
  const hasValue = "value" in val;
  const hasError = "error" in val;
  if (hasValue && hasError || !hasValue && !hasError) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: 'FunctionResponse must have either "value" or "error", but not both or neither.'
    });
  }
}).describe("REF:#/$defs/FunctionResponse|The return response matching a callAgentFunction or callRendererFunction invocation.");

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v1_0/functions/system_functions.js
var IndexApi = {
  /** Name of the system function. */
  name: "@index",
  /** Declared return type for catalog type checking. */
  returnType: "number",
  /** Scope of callers permitted to invoke this function. */
  allowedCallers: "rendererOnly",
  /**
   * Zod schema validating function arguments.
   *
   * `offset` is a DynamicNumber, so a payload may bind it to a path or a
   * nested call. Once resolved, the value is coerced to a number.
   */
  schema: external_exports.object({
    "offset": external_exports.union([DataBindingSchema2, FunctionCallSchema2, external_exports.coerce.number()]).optional()
  })
};
var IndexImplementation = createFunctionImplementation(IndexApi, (args, context) => {
  const offset = typeof args.offset === "number" && Number.isFinite(args.offset) ? args.offset : 0;
  const index = resolveContextIndex(context);
  if (index === void 0 || !Number.isFinite(index)) {
    throw new A2uiValidationError("@index function can only be evaluated inside a collection template iteration scope.");
  }
  return index + offset;
});
var SYSTEM_FUNCTIONS = [IndexImplementation];

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/catalog/types.js
function createFunctionImplementation(api, execute) {
  return {
    name: api.name,
    returnType: api.returnType,
    schema: api.schema,
    allowedCallers: api.allowedCallers,
    requiresUserActivation: api.requiresUserActivation,
    description: api.description,
    execute
  };
}
var Catalog = class _Catalog {
  /**
   * Peer catalogs available for resolving cross-catalog `$ref`s, in matching
   * order. Each is the unlinked catalog a peer was linked from.
   */
  get peerCatalogs() {
    return this._peerCatalogs;
  }
  /**
   * Returns a copy of this catalog linked to peer catalogs for resolving
   * cross-catalog `$ref`s. This catalog is left unchanged.
   *
   * The copy has the same runtime class, ID, version, entries, theme and
   * document, and its own derived views (`validationSchema`, `componentRefMap`
   * and the Zod schemas of entries `fromJson` loaded). Its peers are this
   * catalog's peers followed by `peers`, each preceded by the pristine catalog
   * it was pruned from, if any, without duplicates or this catalog. A peer
   * that is itself a linked copy is recorded as the catalog it was linked
   * from. When that adds no peer, this catalog is returned.
   *
   * @param peers The peer catalogs, in matching order.
   * @returns A linked copy of this catalog, or this catalog.
   */
  withPeerCatalogs(peers) {
    const origin = linkOrigin(this);
    const seen = /* @__PURE__ */ new Set([origin]);
    const linked = [];
    const add = (candidate) => {
      if (!candidate)
        return;
      const candidateOrigin = linkOrigin(candidate);
      if (!seen.has(candidateOrigin)) {
        seen.add(candidateOrigin);
        linked.push(candidateOrigin);
      }
    };
    for (const peer of this._peerCatalogs) {
      add(peer);
    }
    for (const peer of peers) {
      add(peer._sourceCatalog);
      add(peer);
    }
    if (linked.length === this._peerCatalogs.length && linked.every((peer, i2) => peer === this._peerCatalogs[i2])) {
      return this;
    }
    const components = /* @__PURE__ */ new Map();
    for (const [name, component] of this.components) {
      components.set(name, linkEntry(component, linked));
    }
    const functions = /* @__PURE__ */ new Map();
    for (const [name, fn] of this.functions) {
      functions.set(name, linkEntry(fn, linked));
    }
    const copy = Object.create(Object.getPrototypeOf(this));
    Object.assign(copy, this, {
      components,
      functions,
      invoker: createCatalogInvoker(this.id, this.protocolVersion, functions),
      cachedValidationSchema: void 0,
      _componentRefMap: void 0,
      _peerCatalogs: Object.freeze(linked),
      _linkedFrom: origin
    });
    return copy;
  }
  /**
   * Self-contained JSON Schema for validating payloads against this catalog.
   *
   * Built from the catalog's model and memoized: from the definition of each
   * entry `toJson` writes, or, for an entry defined in code without
   * specification annotations, from its Zod schema. Common
   * types references are localized and the referenced standard definitions
   * for the catalog's protocol version, and any of the catalog's `defs` an
   * entry references, are bundled into `$defs`, together with the component
   * envelope and the `anyComponent`/`anyFunction` unions. Use `toJson` for the
   * catalog document itself.
   *
   * Each read returns a fresh copy that the caller may modify.
   */
  get validationSchema() {
    if (!this.cachedValidationSchema) {
      this.cachedValidationSchema = generateValidationSchema(this);
    }
    return deepCopyJson(this.cachedValidationSchema);
  }
  /**
   * Dynamically reconstructs and memoizes the unified standard A2UI catalog JSON Schema document.
   *
   * @deprecated Use `validationSchema` for the bundled schema or `toJson` for
   *   the catalog document.
   */
  get catalogSchema() {
    return this.validationSchema;
  }
  /**
   * Returns the unbundled catalog document for this catalog, assembled from
   * its model and memoized.
   *
   * The document-level fields come from the catalog (`CatalogDocumentOptions`).
   * An entry `fromJson` loaded is written as its definition, with references
   * kept as written, unless it references a local definition the catalog
   * lacks. An entry defined in code whose schema is a specification model is
   * computed from its model in the layout of the catalog's protocol version,
   * with its mixins and the `defModels` written to `$defs`; any other entry
   * is generated from its Zod schema. Common types references are written
   * against `commonTypesUri`. The `anyComponent` and `anyFunction` unions are
   * computed from the entries. So for a catalog loaded with `fromJson`, the
   * result equals the loaded document (minus any entries that the document's
   * `anyComponent.oneOf` or `anyFunction.oneOf` unions omit, which `fromJson`
   * filters out on load), and for a built-in basic catalog, the published
   * document.
   *
   * @returns A fresh document that the caller may modify.
   */
  toJson() {
    if (!this.cachedDocument) {
      this.cachedDocument = serializeCatalogDocument(this);
    }
    return deepCopyJson(this.cachedDocument);
  }
  /**
   * Returns a catalog with this catalog's ID, version, theme and
   * document-level fields, and the given entries instead of its own.
   *
   * Definitions of `defs` that only entries left out referenced are dropped,
   * so `toJson` of the result does not carry, say, the mixin of a pruned
   * component. Catalog transformers use it to derive a catalog.
   *
   * @param components The components of the new catalog.
   * @param functions The functions of the new catalog.
   * @returns A new catalog.
   */
  withEntries(components, functions) {
    const componentsChanged = components.length !== this.components.size || components.some((c2) => this.components.get(c2.name) !== c2);
    const functionsChanged = functions.length !== this.functions.size || functions.some((f2) => this.functions.get(f2.name) !== f2);
    let baseDefs = this.defs;
    if (baseDefs && (componentsChanged || functionsChanged)) {
      const copy2 = { ...baseDefs };
      if (componentsChanged)
        delete copy2["anyComponent"];
      if (functionsChanged)
        delete copy2["anyFunction"];
      baseDefs = copy2;
    }
    const unions = this.unions ? {
      anyComponent: this.unions.anyComponent || componentsChanged,
      anyFunction: this.unions.anyFunction || functionsChanged
    } : void 0;
    const copy = new _Catalog(this.id, this.protocolVersion, components, functions, {
      themeSchema: this.themeSchema,
      instructions: this.instructions,
      schemaUri: this.schemaUri,
      schemaId: this.schemaId,
      title: this.title,
      description: this.description,
      declaredProtocolVersion: this.declaredProtocolVersion,
      declaresCatalogId: this.declaresCatalogId,
      declaresComponents: this.declaresComponents,
      functionsLayout: this.functionsLayout,
      unions,
      defs: retainedDefs(baseDefs, [...this.components.values(), ...this.functions.values()], [...components, ...functions], this.extensionFields),
      extensionFields: this.extensionFields,
      commonTypesUri: this.commonTypesUri,
      themeLocation: this.themeLocation,
      defModels: this.defModels
    });
    copy._sourceCatalog = this._sourceCatalog ?? linkOrigin(this);
    return this._peerCatalogs.length > 0 ? copy.withPeerCatalogs(this._peerCatalogs) : copy;
  }
  /**
   * Lazily computed component reference map for child reference extraction and topology validation.
   */
  get componentRefMap() {
    if (!this._componentRefMap) {
      this._componentRefMap = buildComponentRefMap(this, V09_CHILD_REF_OPTIONS);
    }
    return this._componentRefMap;
  }
  /**
   * Initializes a new `Catalog`.
   *
   * @param id Unique identifier for the catalog, usually a URI.
   * @param protocolVersion Protocol specification version this catalog targets.
   * @param components Component definitions to register.
   * @param functions Function definitions to register.
   * @param themeSchemaOrOptions Optional schema for this catalog's theme
   *   parameters, or a `CatalogOptions` object.
   * @param instructions Optional system instructions or usage guidelines. Ignored
   *   when `themeSchemaOrOptions` is a `CatalogOptions` object that sets them.
   * @throws {A2uiCatalogError} If `protocolVersion` is empty or not provided.
   */
  constructor(id, protocolVersion, components = [], functions = [], themeSchemaOrOptions, instructions) {
    this._peerCatalogs = [];
    if (!protocolVersion) {
      throw new A2uiCatalogError("protocolVersion must be provided.");
    }
    this.id = id;
    this.protocolVersion = protocolVersion;
    const compMap = /* @__PURE__ */ new Map();
    for (const comp of components) {
      compMap.set(comp.name, comp);
    }
    this.components = compMap;
    const funcMap = /* @__PURE__ */ new Map();
    for (const fn of functions) {
      funcMap.set(fn.name, fn);
    }
    this.functions = funcMap;
    const options = isZodSchema(themeSchemaOrOptions) ? { themeSchema: themeSchemaOrOptions } : themeSchemaOrOptions ?? {};
    this.themeSchema = options.themeSchema;
    this.instructions = options.instructions ?? instructions;
    this.schemaUri = options.schemaUri;
    this.schemaId = options.schemaId;
    this.title = options.title;
    this.description = options.description;
    this.declaredProtocolVersion = options.declaredProtocolVersion;
    this.declaresCatalogId = options.declaresCatalogId ?? true;
    this.declaresComponents = options.declaresComponents ?? true;
    this.functionsLayout = options.functionsLayout;
    this.unions = options.unions ? Object.freeze({ ...options.unions }) : void 0;
    this.defs = frozenJson(options.defs);
    this.extensionFields = frozenJson(options.extensionFields);
    this.commonTypesUri = options.commonTypesUri;
    this.themeLocation = options.themeLocation;
    this.defModels = options.defModels ? Object.freeze([...options.defModels]) : void 0;
    this.invoker = createCatalogInvoker(this.id, this.protocolVersion, this.functions);
  }
  /**
   * Constructs a schema-only Catalog from an authored A2UI catalog document.
   *
   * Each entry is a `JsonComponentApi` or `JsonFunctionApi` whose model is
   * its definition as written, from which its Zod schema is derived on first
   * use, and the catalog keeps the document-level fields, so `toJson` returns
   * the document unchanged.
   *
   * @param json Raw catalog document or client capabilities inline catalog.
   * @param protocolVersion Protocol version of the catalog. When given, it
   *   takes precedence over the `protocolVersion` the document declares: it
   *   becomes the catalog's `protocolVersion` and selects the version's
   *   loading rules, while `toJson` still writes the version the document
   *   declares. When omitted, the document's version applies, and for a
   *   document that declares none, such as those published before v1.0,
   *   `DEFAULT_PROTOCOL_VERSION`.
   * @param catalogId Catalog ID to use instead of the one the document
   *   declares, or for a document that declares none, such as the v0.8 basic
   *   catalog. It becomes the catalog's `id`, and replaces the document's own
   *   `catalogId` in `toJson`; a document that declares none still has none
   *   in `toJson`.
   * @returns A new Catalog populated with component and function schemas.
   * @throws {Error} If the catalog ID is missing or not a string.
   */
  static fromJson(json, protocolVersion, catalogId) {
    const { id, protocolVersion: resolvedVersion, components, functions, ...options } = parseCatalogSchema(json, protocolVersion, catalogId);
    return new _Catalog(id, resolvedVersion, components, functions, options);
  }
  /**
   * Constructs a schema-only Catalog directly from a raw A2UI catalog schema.
   *
   * @deprecated Use `Catalog.fromJson` instead.
   * @param catalogSchema Raw catalog schema or client capabilities payload object.
   * @param protocolVersion Protocol version of the catalog, which takes
   *   precedence over the one the schema declares, as in `fromJson`.
   * @returns A new Catalog populated with component and function schemas.
   * @throws {Error} If the catalog ID is missing or not a string.
   */
  static fromSchema(catalogSchema, protocolVersion) {
    return _Catalog.fromJson(catalogSchema, protocolVersion);
  }
};
function linkOrigin(catalog) {
  return catalog._linkedFrom ?? catalog;
}
var crossDocumentRefs = /* @__PURE__ */ new WeakMap();
function referencesOtherCatalogs(catalog) {
  const origin = linkOrigin(catalog);
  let result = crossDocumentRefs.get(origin);
  if (result === void 0) {
    result = hasCrossDocumentRefs(origin.toJson());
    crossDocumentRefs.set(origin, result);
  }
  return result;
}
function linkCatalogs(catalogs, extraPeers = []) {
  const list = Array.from(catalogs);
  const extras = Array.from(extraPeers);
  if (list.length + extras.length < 2) {
    return list;
  }
  return list.map((catalog, i2) => {
    if (typeof catalog.withPeerCatalogs !== "function" || !referencesOtherCatalogs(catalog)) {
      return catalog;
    }
    const peers = [...extras, ...list.filter((other, j2) => j2 !== i2 && other !== catalog)];
    return catalog.withPeerCatalogs(peers);
  });
}
function isZodSchema(value) {
  return typeof value === "object" && value !== null && typeof value.safeParse === "function";
}
function createCatalogInvoker(catalogId, protocolVersion, functions) {
  return (name, rawArgs, ctx, abortSignal) => {
    const fn = functions.get(name) ?? (isAtLeastVersion(protocolVersion, SpecVersion.V1_0) && name === "@index" ? IndexImplementation : void 0);
    if (!fn) {
      throw new A2uiExpressionError(`Function not found in catalog '${catalogId}': ${name}`, name);
    }
    assertUserActivation(fn, ctx);
    const execute = fn.execute;
    if (typeof execute !== "function") {
      throw new A2uiExpressionError(`Function '${name}' in catalog '${catalogId}' is schema-only and has no implementation.`, name);
    }
    try {
      const safeArgs = fn.schema.parse(rawArgs);
      return execute.call(fn, safeArgs, ctx, abortSignal);
    } catch (e2) {
      if (e2?.name === "ZodError" || e2 instanceof external_exports.ZodError) {
        throw new A2uiExpressionError(`Validation failed for function '${name}': ${e2.message}`, name, e2.errors ?? e2.issues);
      }
      throw e2;
    }
  };
}
function assertUserActivation(fn, ctx) {
  if (!fn.requiresUserActivation)
    return;
  const isPassive = Boolean(ctx?.isPassiveEvaluation);
  const isActivated = Boolean(ctx?.isUserActivated);
  const browserUnactivated = !isActivated && typeof navigator !== "undefined" && !(navigator.userActivation?.isActive ?? true);
  if (isPassive || browserUnactivated) {
    throw new A2uiExpressionError(`Function '${fn.name}' requires user activation and cannot be evaluated without an active user gesture.`, fn.name);
  }
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/common/events.js
var EventEmitter = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set();
  }
  /**
   * Subscribes to the event.
   *
   * @param listener The listener function to call when the event is emitted.
   * @returns A subscription object that can be used to unsubscribe.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return {
      unsubscribe: () => this.listeners.delete(listener)
    };
  }
  /**
   * Emits an event to all subscribers.
   *
   * @param data The data to pass to subscribers.
   */
  async emit(data) {
    for (const listener of this.listeners) {
      try {
        await listener(data);
      } catch (e2) {
        console.error("EventEmitter error:", e2);
      }
    }
  }
  /**
   * Removes all registered listeners and disposes the emitter.
   */
  dispose() {
    this.listeners.clear();
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/validation/integrity-checker.js
var MAX_GLOBAL_DEPTH = 50;
var MAX_FUNC_CALL_DEPTH = 5;
var RELAXED_PATH_PATTERN = /^(?:(?:\/(?:[^~/]|~[01])*)*|(?:[^~/]|~[01])+(?:\/(?:[^~/]|~[01])*)*)$/;
function* extractPointers(val, currentPath, nestedKeys) {
  if (typeof val === "string") {
    yield [val, currentPath];
  } else if (Array.isArray(val)) {
    for (let idx = 0; idx < val.length; idx++) {
      const item = val[idx];
      const subPath = `${currentPath}[${idx}]`;
      yield* extractPointers(item, subPath, nestedKeys);
    }
  } else if (typeof val === "object" && val !== null) {
    const obj = val;
    if ("componentId" in obj && typeof obj.componentId === "string" && ("path" in obj || "dataBinding" in obj)) {
      yield [obj.componentId, `${currentPath}.componentId`];
    } else if (nestedKeys?.size) {
      for (const subKey of nestedKeys) {
        if (subKey in obj) {
          yield* extractPointers(obj[subKey], `${currentPath}.${subKey}`);
        }
      }
    } else {
      for (const [subKey, subVal] of Object.entries(obj)) {
        yield* extractPointers(subVal, `${currentPath}.${subKey}`);
      }
    }
  }
}
function getOrCreateRefMap(catalog) {
  return catalog.componentRefMap;
}
function* getComponentReferences(component, catalogOrRefMap) {
  if (!component || typeof component !== "object") {
    return;
  }
  const refFieldsMap = catalogOrRefMap instanceof Catalog ? getOrCreateRefMap(catalogOrRefMap) : catalogOrRefMap;
  const compVal = component.component;
  let compType = "";
  let props = component;
  if (typeof compVal === "string") {
    compType = compVal;
  } else if (typeof compVal === "object" && compVal !== null) {
    const compObj = compVal;
    compType = Object.keys(compObj)[0] ?? "";
    props = compObj[compType] ?? {};
  }
  if (!compType || typeof props !== "object" || props === null) {
    return;
  }
  const childRefs = refFieldsMap[compType];
  const singleRefs = childRefs ? childRefs.singleRefs : /* @__PURE__ */ new Set();
  const listRefs = childRefs ? childRefs.listRefs : /* @__PURE__ */ new Set();
  const nestedRefs = childRefs?.nestedRefs;
  for (const [key, value] of Object.entries(props)) {
    if (singleRefs.has(key) || listRefs.has(key)) {
      yield* extractPointers(value, key, nestedRefs?.[key]);
    }
  }
}
var STRICT_VALIDATION = Object.freeze({
  allowOrphanComponents: false,
  allowDanglingReferences: false,
  allowMissingRoot: false,
  allowUnknownElements: false
});
var RELAXED_VALIDATION = Object.freeze({
  allowOrphanComponents: true,
  allowDanglingReferences: true,
  allowMissingRoot: true,
  allowUnknownElements: true
});
function traverseRecursionAndPaths(item, globalDepth, funcDepth) {
  if (globalDepth > MAX_GLOBAL_DEPTH) {
    throw new A2uiRecursionError(`Global recursion limit exceeded: Depth > ${MAX_GLOBAL_DEPTH}`);
  }
  if (Array.isArray(item)) {
    for (const x2 of item) {
      traverseRecursionAndPaths(x2, globalDepth + 1, funcDepth);
    }
    return;
  }
  if (typeof item === "object" && item !== null) {
    const obj = item;
    for (const path of [obj.path, obj["@path"]]) {
      if (typeof path === "string" && !RELAXED_PATH_PATTERN.test(path)) {
        throw new A2uiValidationError(`Invalid path syntax: '${path}'`);
      }
    }
    const isFunctionCallWrapper = "functionCall" in obj && typeof obj.functionCall === "object" && obj.functionCall !== null;
    const isBareFunctionCall = ("call" in obj || "@call" in obj) && "args" in obj;
    if (isFunctionCallWrapper) {
      if (funcDepth >= MAX_FUNC_CALL_DEPTH) {
        throw new A2uiRecursionError(`Recursion limit exceeded: functionCall depth > ${MAX_FUNC_CALL_DEPTH}`);
      }
      for (const [k, v2] of Object.entries(obj)) {
        if (k === "functionCall") {
          traverseRecursionAndPaths(v2, globalDepth + 1, funcDepth + 1);
        } else {
          traverseRecursionAndPaths(v2, globalDepth + 1, funcDepth);
        }
      }
    } else if (isBareFunctionCall) {
      if (funcDepth >= MAX_FUNC_CALL_DEPTH) {
        throw new A2uiRecursionError(`Recursion limit exceeded: functionCall depth > ${MAX_FUNC_CALL_DEPTH}`);
      }
      for (const [k, v2] of Object.entries(obj)) {
        if (k === "args") {
          traverseRecursionAndPaths(v2, globalDepth + 1, funcDepth + 1);
        } else {
          traverseRecursionAndPaths(v2, globalDepth + 1, funcDepth);
        }
      }
    } else {
      for (const v2 of Object.values(obj)) {
        traverseRecursionAndPaths(v2, globalDepth + 1, funcDepth);
      }
    }
  }
}
function validateRecursionAndPaths(data) {
  traverseRecursionAndPaths(data, 0, 0);
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/state/surface-components-model.js
var SurfaceComponentsModel = class {
  /**
   * Initializes a new `SurfaceComponentsModel` instance.
   *
   * @param catalogOrRefMap Optional Catalog or precomputed ComponentRefMap used for schema-driven child reference extraction.
   */
  constructor(catalogOrRefMap) {
    this.components = /* @__PURE__ */ new Map();
    this._onCreated = new EventEmitter();
    this._onDeleted = new EventEmitter();
    this.onCreated = this._onCreated;
    this.onDeleted = this._onDeleted;
    if (catalogOrRefMap) {
      this.setCatalog(catalogOrRefMap);
    }
  }
  /**
   * Associates a catalog or reference map with this model for schema-driven child detection.
   *
   * @param catalogOrRefMap Catalog instance or ComponentRefMap.
   */
  setCatalog(catalogOrRefMap) {
    this.refMap = catalogOrRefMap instanceof Catalog ? catalogOrRefMap.componentRefMap : catalogOrRefMap;
  }
  /**
   * Retrieves a component by its ID.
   *
   * @param id The ID of the component to retrieve.
   * @returns The component model, or undefined if not found.
   */
  get(id) {
    return this.components.get(id);
  }
  /**
   * Returns a copy of the internal component map.
   *
   * @returns Map of component models keyed by component ID.
   */
  getAll() {
    return new Map(this.components);
  }
  /**
   * Checks whether a component with the specified ID exists in the model.
   *
   * @param id Component identifier to check.
   * @returns Whether the component exists in the model.
   */
  has(id) {
    return this.components.has(id);
  }
  /**
   * Returns an iterator over the component ID and model entries.
   */
  get entries() {
    return this.components.entries();
  }
  /**
   * Returns an iterator over all component IDs in the model.
   */
  get keys() {
    return this.components.keys();
  }
  /**
   * Returns an iterator over all component models in the model.
   */
  get values() {
    return this.components.values();
  }
  /**
   * Total number of components in the model.
   */
  get size() {
    return this.components.size;
  }
  /**
   * Returns a readonly map of all active components in the model.
   */
  get componentsMap() {
    return this.components;
  }
  /**
   * Adds a component to the model.
   * Throws an error if a component with the same ID already exists.
   *
   * @param component The component to add.
   */
  addComponent(component) {
    if (this.components.has(component.id)) {
      throw new A2uiStateError(`Component with id '${component.id}' already exists.`);
    }
    this.components.set(component.id, component);
    this._onCreated.emit(component);
  }
  /**
   * Removes a component from the model by its ID.
   * Disposes of the component upon removal.
   *
   * @param id The ID of the component to remove.
   */
  removeComponent(id) {
    const component = this.components.get(id);
    if (component) {
      this.components.delete(id);
      component.dispose();
      this._onDeleted.emit(id);
    }
  }
  /**
   * Extracts child component references for a given component identifier.
   *
   * @param componentId The ID of the component whose children should be resolved.
   * @returns Array of tuples containing `[referencedId, propertyPath]`.
   */
  getChildReferences(componentId) {
    const comp = this.components.get(componentId);
    if (!comp)
      return [];
    const refMap = comp.catalog.components.size ? comp.catalog.componentRefMap : this.refMap ?? comp.catalog.componentRefMap;
    return Array.from(getComponentReferences(comp.componentTree, refMap));
  }
  /**
   * Returns array of referenced child component IDs for a given component identifier.
   *
   * @param componentId The ID of the component whose child IDs should be retrieved.
   * @returns Array of unique child component IDs.
   */
  getChildIds(componentId) {
    return this.getChildReferences(componentId).map(([refId]) => refId);
  }
  /**
   * Detects self-references, circular dependencies, and exceeds depth limits via DFS.
   *
   * @param options Configuration specifying root node, max depth, or allowing missing root.
   * @returns Set of visited component identifiers.
   * @throws {A2uiRecursionError} When self-reference, cycle, or max depth limit is exceeded.
   */
  detectCycles(options = {}) {
    const rootId = options.rootId ?? "root";
    const maxDepth = options.maxDepth ?? MAX_GLOBAL_DEPTH;
    const allowMissingRoot = options.allowMissingRoot ?? false;
    for (const comp of this.components.values()) {
      for (const [childId, fieldName] of this.getChildReferences(comp.id)) {
        if (childId === comp.id) {
          throw new A2uiRecursionError(`Circular reference detected: Component '${comp.id}' references itself in field '${fieldName}' (Self-reference detected)`);
        }
      }
    }
    const visited = /* @__PURE__ */ new Set();
    const recursionStack = /* @__PURE__ */ new Set();
    const dfs = (nodeId, depth) => {
      if (depth > maxDepth) {
        throw new A2uiRecursionError(`Global recursion limit exceeded: logical depth > ${maxDepth}`);
      }
      visited.add(nodeId);
      recursionStack.add(nodeId);
      const childIds = this.getChildIds(nodeId);
      for (const childId of childIds) {
        if (!this.components.has(childId)) {
          continue;
        }
        if (!visited.has(childId)) {
          dfs(childId, depth + 1);
        } else if (recursionStack.has(childId)) {
          throw new A2uiRecursionError(`Circular reference detected involving component '${childId}'`);
        }
      }
      recursionStack.delete(nodeId);
    };
    if (allowMissingRoot) {
      const sortedIds = Array.from(this.components.keys()).sort();
      for (const nodeId of sortedIds) {
        if (!visited.has(nodeId)) {
          dfs(nodeId, 0);
        }
      }
    } else {
      if (this.components.has(rootId)) {
        dfs(rootId, 0);
      }
    }
    return visited;
  }
  /**
   * Validates topology, completeness, and references across the component hierarchy.
   *
   * @param options Validation settings (allowMissingRoot, allowDanglingReferences, allowOrphanComponents).
   * @throws {A2uiIntegrityError} If missing root, dangling references, or orphan components exist.
   * @throws {A2uiRecursionError} If self-reference, cycle, or depth limit is detected.
   */
  validateTopology(options = {}) {
    if (this.components.size === 0)
      return;
    const rootId = options.rootId ?? "root";
    const allowMissingRoot = options.allowMissingRoot ?? false;
    const allowDanglingReferences = options.allowDanglingReferences ?? false;
    const allowOrphanComponents = options.allowOrphanComponents ?? false;
    if (!allowMissingRoot && !this.components.has(rootId)) {
      throw new A2uiIntegrityError(`Missing root component: No component has id='${rootId}'`);
    }
    if (!allowDanglingReferences) {
      for (const comp of this.components.values()) {
        for (const [childId, fieldName] of this.getChildReferences(comp.id)) {
          if (!this.components.has(childId)) {
            throw new A2uiIntegrityError(`Component '${comp.id}' references non-existent component '${childId}' in field '${fieldName}' (Dangling reference '${childId}' in component '${comp.id}')`);
          }
        }
      }
    }
    const visited = this.detectCycles({ rootId, allowMissingRoot, maxDepth: options.maxDepth });
    if (!allowOrphanComponents && !allowMissingRoot) {
      if (visited.size < this.components.size) {
        const orphans = Array.from(this.components.keys()).filter((id) => !visited.has(id)).sort();
        if (orphans.length > 0) {
          throw new A2uiIntegrityError(`Component '${orphans[0]}' is not reachable from '${rootId}' (Orphaned component '${orphans[0]}' is not reachable from root)`);
        }
      }
    }
  }
  /**
   * Performs non-throwing validation of references and topology across the component graph.
   * Returns an array containing the first validation error encountered, or an empty array if valid.
   *
   * @param options Validation options.
   * @returns Array of validation error objects.
   */
  validateReferences(options = {}) {
    const errors = [];
    try {
      this.validateTopology(options);
    } catch (err) {
      if (err instanceof A2uiValidationError) {
        errors.push(err);
      } else if (err instanceof Error) {
        errors.push(new A2uiValidationError(err.message));
      }
    }
    return errors;
  }
  /**
   * Disposes the model, clearing all components and update event emitters.
   */
  dispose() {
    for (const component of this.components.values()) {
      component.dispose();
    }
    this.components.clear();
    this._onCreated.dispose();
    this._onDeleted.dispose();
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/state/surface-model.js
function canonicalProtocolVersion(version) {
  if (!version)
    return void 0;
  const canonical = toCanonicalVersion(version);
  return canonical ? `v${canonical}` : version;
}
var SurfaceModel = class {
  /**
   * Initializes a new `SurfaceModel` instance.
   *
   * @param id Unique identifier for this surface.
   * @param defaultCatalog Catalog that resolves components and functions that
   *   do not name a catalog explicitly. From v1.0 a surface may have none, in
   *   which case every component and function call must name its catalog.
   * @param availableCatalogs Every catalog a payload on this surface may select
   *   by `catalogId`, keyed by that identifier. The message processor populates
   *   it with the catalogs whose protocol version is compatible with the
   *   surface's own.
   * @param theme Theme to apply to this surface.
   * @param sendDataModel Whether the renderer sends the full data model with actions.
   * @param dataModel Optional custom DataModel instance. If provided, the SurfaceModel assumes
   *   full ownership of its lifecycle and will dispose it when dispose() is called.
   * @param rootId Identifier of the root component on this surface (defaults to `'root'`).
   * @param metadata Optional surface-level metadata for vendor extensions.
   * @param protocolVersion Protocol version of the surface. Defaults to the
   *   default catalog's version; surfaces without a default catalog pass it
   *   explicitly.
   */
  constructor(id, defaultCatalog, availableCatalogs = /* @__PURE__ */ new Map(), theme = {}, sendDataModel = false, dataModel, rootId = "root", metadata, protocolVersion) {
    this.id = id;
    this.defaultCatalog = defaultCatalog;
    this.theme = theme;
    this.sendDataModel = sendDataModel;
    this.rootId = rootId;
    this.metadata = metadata;
    this._onAction = new EventEmitter();
    this._onError = new EventEmitter();
    this._onWarning = new EventEmitter();
    this.onAction = this._onAction;
    this.onError = this._onError;
    this.onWarning = this._onWarning;
    this.protocolVersion = canonicalProtocolVersion(protocolVersion ?? defaultCatalog?.protocolVersion);
    if (availableCatalogs !== void 0 && availableCatalogs !== null && !(availableCatalogs instanceof Map)) {
      throw new TypeError("availableCatalogs must be a Map, or undefined/null. Note that availableCatalogs is now the 3rd argument to SurfaceModel and theme is the 4th argument.");
    }
    const catalogs = new Map(availableCatalogs ?? []);
    if (defaultCatalog?.id && !catalogs.has(defaultCatalog.id)) {
      catalogs.set(defaultCatalog.id, defaultCatalog);
    }
    this.availableCatalogs = catalogs;
    this.dataModel = dataModel ?? new DataModel({});
    this.componentsModel = new SurfaceComponentsModel(defaultCatalog);
  }
  /**
   * The surface's default catalog.
   *
   * @deprecated Use {@link defaultCatalog}. Renamed for symmetry with the other
   *   SDKs now that a surface can carry more than one catalog. This alias will
   *   be removed in a future release.
   */
  get catalog() {
    return this.defaultCatalog;
  }
  /**
   * Resolves the catalog that an item on this surface uses.
   *
   * An item that names a catalog uses that entry of {@link availableCatalogs};
   * one that names none uses the {@link defaultCatalog}. Both the message
   * processor, when validating a payload, and `DataContext`, when running a
   * function call, resolve catalogs through this method.
   *
   * @param catalogId Catalog the item names, or `undefined` when it names none.
   * @param subject Description of the item for error messages, such as
   *   `Function call 'formatDate'`.
   * @returns The catalog the item resolves to.
   * @throws {A2uiCatalogError} If the named catalog is not available on this
   *   surface, or if the item names none and the surface has no default
   *   catalog.
   */
  resolveCatalog(catalogId, subject = "Item") {
    return resolveSurfaceCatalog(this, catalogId, subject);
  }
  /**
   * Dispatches an action from this surface to registered listeners.
   *
   * Resolves event action payload details, propagates any explicit `catalogId`,
   * and emits an `ActionPayload` via `onAction`. Local function actions (`functionCall`)
   * are executed locally and are not emitted as agent actions.
   *
   * @param payload Action payload (name and context) to dispatch.
   * @param sourceComponentId Identifier of the component that triggered the action.
   * @returns A promise that resolves once all registered listeners have processed the action.
   */
  async dispatchAction(payload, sourceComponentId) {
    if (!payload || typeof payload !== "object") {
      return;
    }
    const eventPayload = extractActionTarget(payload);
    if (!eventPayload) {
      return;
    }
    const name = eventPayload.name;
    if (!name || typeof name !== "string") {
      return;
    }
    const rawContext = eventPayload.context;
    const context = rawContext && typeof rawContext === "object" && !Array.isArray(rawContext) ? rawContext : {};
    const actionToDispatch = {
      name,
      surfaceId: this.id,
      sourceComponentId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      context
    };
    const catalogId = eventPayload.catalogId ?? payload.catalogId;
    if (typeof catalogId === "string" && catalogId) {
      actionToDispatch.catalogId = catalogId;
    }
    if (typeof eventPayload.userMessage === "string" && eventPayload.userMessage.length > 0) {
      actionToDispatch.userMessage = eventPayload.userMessage;
    }
    await this._onAction.emit(actionToDispatch);
  }
  /**
   * Dispatches an error from this surface to registered listeners.
   *
   * @param error Error payload to dispatch, conforming to the renderer-to-agent schema.
   * @returns A promise that resolves once all registered listeners have processed the error.
   */
  async dispatchError(error) {
    await this._onError.emit({
      ...error,
      surfaceId: this.id
    });
  }
  /**
   * Dispatches a non-fatal warning from this surface to registered listeners.
   *
   * @param warning The warning payload to dispatch.
   * @returns Promise that resolves once listeners have handled the warning.
   */
  async dispatchWarning(warning) {
    await this._onWarning.emit({
      ...warning,
      surfaceId: this.id
    });
  }
  /**
   * Disposes the surface, data model, components, and event emitters.
   */
  dispose() {
    this.dataModel.dispose();
    this.componentsModel.dispose();
    this._onAction.dispose();
    this._onError.dispose();
    this._onWarning.dispose();
  }
};
function extractActionTarget(payload) {
  if ("event" in payload && payload.event && typeof payload.event === "object") {
    return payload.event;
  }
  if ("name" in payload && typeof payload.name === "string") {
    return payload;
  }
  return null;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/state/surface-group-model.js
var SurfaceGroupModel = class {
  constructor() {
    this.surfaces = /* @__PURE__ */ new Map();
    this.surfaceUnsubscribers = /* @__PURE__ */ new Map();
    this._onSurfaceCreated = new EventEmitter();
    this._onSurfaceDeleted = new EventEmitter();
    this._onAction = new EventEmitter();
    this.onSurfaceCreated = this._onSurfaceCreated;
    this.onSurfaceDeleted = this._onSurfaceDeleted;
    this.onAction = this._onAction;
  }
  /**
   * Adds a surface to the group.
   *
   * Ignores if a surface with the same ID already exists.
   *
   * @param surface The surface model to add.
   */
  addSurface(surface) {
    if (this.surfaces.has(surface.id)) {
      console.warn(`Surface ${surface.id} already exists. Ignoring.`);
      return;
    }
    this.surfaces.set(surface.id, surface);
    const sub = surface.onAction.subscribe((action) => this._onAction.emit(action));
    this.surfaceUnsubscribers.set(surface.id, sub);
    this._onSurfaceCreated.emit(surface);
  }
  /**
   * Removes a surface from the group by its ID.
   *
   * Disposes of the surface upon removal.
   *
   * @param id The ID of the surface to remove.
   */
  deleteSurface(id) {
    const surface = this.surfaces.get(id);
    if (surface) {
      const sub = this.surfaceUnsubscribers.get(id);
      if (sub) {
        sub.unsubscribe();
        this.surfaceUnsubscribers.delete(id);
      }
      this.surfaces.delete(id);
      surface.dispose();
      this._onSurfaceDeleted.emit(id);
    }
  }
  /**
   * Retrieves a surface by its ID.
   *
   * @param id The ID of the surface to retrieve.
   * @returns The surface model, or undefined if not found.
   */
  getSurface(id) {
    return this.surfaces.get(id);
  }
  /**
   * Readonly map of all active surfaces keyed by surface ID.
   */
  get surfacesMap() {
    return this.surfaces;
  }
  /**
   * Disposes the group and all contained surfaces.
   */
  dispose() {
    for (const id of Array.from(this.surfaces.keys())) {
      this.deleteSurface(id);
    }
    this._onSurfaceCreated.dispose();
    this._onSurfaceDeleted.dispose();
    this._onAction.dispose();
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/state/component-model.js
var ComponentModel = class {
  /**
   * Initializes a new `ComponentModel` instance.
   *
   * @param id The unique identifier for this component.
   * @param type The component type name.
   * @param initialProperties The initial properties for the component.
   * @param catalog The catalog that defines this component's type.
   */
  constructor(id, type, initialProperties, catalog, metadata) {
    this.id = id;
    this.type = type;
    this.catalog = catalog;
    this.metadata = metadata;
    this._onUpdated = new EventEmitter();
    this.onUpdated = this._onUpdated;
    this._properties = initialProperties;
  }
  /**
   * Current properties of the component.
   */
  get properties() {
    return this._properties;
  }
  set properties(newProperties) {
    this._properties = newProperties;
    this._onUpdated.emit(this);
  }
  /**
   * Disposes the component model and its update event emitters.
   */
  dispose() {
    this._onUpdated.dispose();
  }
  /**
   * Serialized JSON representation of the component definition.
   */
  get componentTree() {
    return {
      ...this._properties,
      id: this.id,
      component: this.type,
      ...this.metadata !== void 0 ? { metadata: this.metadata } : {}
    };
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/processing/format-zod-issue.js
function formatZodIssue(err) {
  const path = err.path.join(".") || "root";
  switch (err.code) {
    case external_exports.ZodIssueCode.invalid_union: {
      const unionIssues = err.unionErrors?.flatMap((uErr) => uErr.issues);
      if (unionIssues && unionIssues.length > 0) {
        return unionIssues.map(formatZodIssue).join("; ");
      }
      return `${path}: Invalid union`;
    }
    case external_exports.ZodIssueCode.unrecognized_keys: {
      const keysStr = err.keys.map((k) => `'${k}'`).join(", ");
      return `${path}: Unrecognized key(s) in object: ${keysStr}`;
    }
    case external_exports.ZodIssueCode.invalid_enum_value: {
      const issue = err;
      const optionsStr = issue.options.map((o2) => String(o2)).join(" | ");
      return `${path}: Invalid enum value. Expected ${optionsStr}, received '${String(issue.received)}'`;
    }
    case external_exports.ZodIssueCode.invalid_type: {
      const issue = err;
      return `${path}: Expected ${issue.expected}, received ${issue.received}`;
    }
    case external_exports.ZodIssueCode.custom:
      return `${path}: ${err.message}`;
    default:
      return err.message ? `${path}: ${err.message}` : `${path}: Validation error (${err.code})`;
  }
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/processing/adapters/base.js
var DEFAULT_CATALOG_COMPATIBILITY = {
  "0.8": /* @__PURE__ */ new Set(["0.8"]),
  "0.9": /* @__PURE__ */ new Set(["0.9", "0.9.1"]),
  "0.9.1": /* @__PURE__ */ new Set(["0.9.1", "0.9"]),
  "1.0": /* @__PURE__ */ new Set(["1.0"])
};
function isCatalogVersionCompatible(catalogVersion, messageVersion, compatibilityMap = DEFAULT_CATALOG_COMPATIBILITY) {
  if (!catalogVersion || !messageVersion) {
    return false;
  }
  const catalogCanonical = toCanonicalVersion(catalogVersion);
  const messageCanonical = toCanonicalVersion(messageVersion);
  if (catalogCanonical && messageCanonical) {
    if (catalogCanonical === messageCanonical) {
      return true;
    }
    const compatible = compatibilityMap[messageCanonical];
    if (compatible && compatible.has(catalogCanonical)) {
      return true;
    }
    const catalogSemver = toSemVer(catalogVersion);
    const messageSemver = toSemVer(messageVersion);
    if (catalogSemver && messageSemver && catalogSemver.major >= 1 && catalogSemver.major === messageSemver.major) {
      return true;
    }
    return false;
  }
  if (typeof catalogVersion !== "string" || typeof messageVersion !== "string") {
    return false;
  }
  const normalizedCatalog = normalizeVersionString(catalogVersion);
  const normalizedMessage = normalizeVersionString(messageVersion);
  return normalizedCatalog.length > 0 && normalizedCatalog === normalizedMessage;
}
var globalKnownActionsProvider;
function registerKnownActionsProvider(provider) {
  globalKnownActionsProvider = provider;
}
function validateActionSurfaceIds(msgObj, actionKeys) {
  for (const key of actionKeys) {
    const actionVal = msgObj[key];
    if (actionVal && typeof actionVal === "object") {
      const actionObj = actionVal;
      if ("surfaceId" in actionObj && actionObj.surfaceId !== void 0 && typeof actionObj.surfaceId !== "string") {
        throw new A2uiValidationError("surfaceId must be a string");
      }
    }
  }
}
var BaseVersionAdapter = class {
  /** Canonical catalog protocol versions compatible with this adapter. */
  get compatibleCatalogVersions() {
    const canonical = toCanonicalVersion(this.version);
    return canonical ? /* @__PURE__ */ new Set([canonical]) : /* @__PURE__ */ new Set();
  }
  /** Set of valid message action keys supported by this protocol version. */
  get validActions() {
    return new Set(this.getNativeActionKeys());
  }
  /** Checks if a catalog protocol version is compatible with this adapter. */
  isCatalogCompatible(catalogVersion) {
    if (!catalogVersion) {
      return false;
    }
    return isCatalogVersionCompatible(catalogVersion, this.version);
  }
  extractOperations(payload) {
    if (!payload || typeof payload !== "object")
      return [];
    if (Array.isArray(payload)) {
      return payload.flatMap((item) => this.extractOperations(item));
    }
    const msgObj = payload;
    if (Array.isArray(msgObj.messages)) {
      return this.extractOperations(msgObj.messages);
    }
    const nativeActionKeys = this.getNativeActionKeys();
    validateActionSurfaceIds(msgObj, nativeActionKeys);
    const presentNativeKeys = nativeActionKeys.filter((k) => k in msgObj).sort();
    if (presentNativeKeys.length > 1) {
      throw new A2uiValidationError(`Message contains multiple conflicting update actions: ${presentNativeKeys.join(", ")}.`);
    }
    if (presentNativeKeys.length === 0) {
      const allKnown = globalKnownActionsProvider ? globalKnownActionsProvider() : new Set(nativeActionKeys);
      const otherAction = Object.keys(msgObj).find((k) => allKnown.has(k) && !nativeActionKeys.includes(k));
      const sortedAllowed = nativeActionKeys.slice().sort().join(", ");
      if (otherAction) {
        throw new A2uiValidationError(`Invalid ${this.version} message: action '${otherAction}' is not supported in protocol version ${this.version}. Allowed actions: ${sortedAllowed}.`);
      }
      throw new A2uiValidationError(`Invalid ${this.version} message: message must contain exactly one update action: ${sortedAllowed}.`);
    }
    const preparedPayload = this.preparePayloadForValidation(msgObj);
    const parseResult = this.schema.safeParse(preparedPayload);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.errors.map(formatZodIssue).join("; ");
      throw new A2uiValidationError(`Invalid ${this.version} message: ${formattedErrors}`, parseResult.error);
    }
    return this.extractOperationsFromObject(msgObj);
  }
  /**
   * Normalizes the message object before running schema validation.
   *
   * Defaults to attaching `version` if not present.
   *
   * @param msgObj Raw message object.
   * @returns Normalized message payload for schema validation.
   */
  preparePayloadForValidation(msgObj) {
    return "version" in msgObj ? msgObj : { version: this.version, ...msgObj };
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v0_8/schema/common-types.js
var exactlyOneKey = (val, ctx) => {
  const keys = Object.keys(val).filter((k) => val[k] !== void 0);
  if (keys.length !== 1) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `Must define exactly one property, found ${keys.length} (${keys.join(", ")}).`
    });
  }
};
var StringValueSchema = external_exports.object({
  path: external_exports.string().optional(),
  literalString: external_exports.string().optional(),
  literal: external_exports.string().optional()
}).strict().superRefine(exactlyOneKey);
var DataValueMapItemSchema = external_exports.lazy(() => external_exports.object({
  key: external_exports.string(),
  valueString: external_exports.string().optional(),
  valueNumber: external_exports.number().optional(),
  valueBoolean: external_exports.boolean().optional(),
  valueMap: external_exports.array(DataValueMapItemSchema).optional()
}).strict().superRefine((val, ctx) => {
  let count = 0;
  if (val.valueString !== void 0)
    count++;
  if (val.valueNumber !== void 0)
    count++;
  if (val.valueBoolean !== void 0)
    count++;
  if (val.valueMap !== void 0)
    count++;
  if (count !== 1) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `Value map item must have exactly one value property (valueString, valueNumber, valueBoolean, valueMap), found ${count}.`
    });
  }
}));
function createDataValueSchema(options = {}) {
  const maxDepth = options.maxDepth ?? 5;
  return DataValueMapItemSchema.superRefine((val, ctx) => {
    const checkDepth = (v2, currentDepth) => {
      if (currentDepth > maxDepth) {
        ctx.addIssue({
          code: external_exports.ZodIssueCode.custom,
          message: `valueMap recursion exceeded maximum depth of ${maxDepth}.`
        });
        return;
      }
      if (v2.valueMap && Array.isArray(v2.valueMap)) {
        for (const item of v2.valueMap) {
          checkDepth(item, currentDepth + 1);
        }
      }
    };
    checkDepth(val, 1);
  });
}
var DataValueSchema = createDataValueSchema();
var NumberValueSchema = external_exports.object({
  path: external_exports.string().optional(),
  literalNumber: external_exports.number().optional(),
  literal: external_exports.number().optional()
}).strict().superRefine(exactlyOneKey);
var BooleanValueSchema = external_exports.object({
  path: external_exports.string().optional(),
  literalBoolean: external_exports.boolean().optional(),
  literal: external_exports.boolean().optional()
}).strict().superRefine(exactlyOneKey);
var ActionSchema3 = external_exports.object({
  name: external_exports.string().describe("A unique name identifying the action (e.g., 'submitForm')."),
  context: external_exports.array(external_exports.object({
    key: external_exports.string(),
    value: external_exports.object({
      path: external_exports.string().describe("A data binding reference to a location in the data model (e.g., '/user/name').").optional(),
      literalString: external_exports.string().describe("A fixed, hardcoded string value.").optional(),
      literalNumber: external_exports.number().optional(),
      literalBoolean: external_exports.boolean().optional()
    }).describe("The dynamic value. Define EXACTLY ONE of the nested properties.").strict().superRefine(exactlyOneKey)
  })).describe("A key-value map of data bindings to be resolved when the action is triggered.").optional()
});
var TextSchema = external_exports.object({
  text: StringValueSchema,
  usageHint: external_exports.enum(["h1", "h2", "h3", "h4", "h5", "caption", "body"]).optional()
});
var ImageSchema = external_exports.object({
  url: StringValueSchema,
  usageHint: external_exports.enum(["icon", "avatar", "smallFeature", "mediumFeature", "largeFeature", "header"]).optional(),
  fit: external_exports.enum(["contain", "cover", "fill", "none", "scale-down"]).optional(),
  altText: StringValueSchema.optional()
});
var IconSchema = external_exports.object({
  name: StringValueSchema
});
var VideoSchema = external_exports.object({
  url: StringValueSchema
});
var AudioPlayerSchema = external_exports.object({
  url: StringValueSchema,
  description: StringValueSchema.optional().describe("A label, title, or placeholder text.")
});
var TabsSchema = external_exports.object({
  tabItems: external_exports.array(external_exports.object({
    title: external_exports.object({
      path: external_exports.string().describe("A data binding reference to a location in the data model (e.g., '/user/name').").optional(),
      literalString: external_exports.string().describe("A fixed, hardcoded string value.").optional()
    }),
    child: external_exports.string().describe("A reference to a component instance by its unique ID.")
  }).strict().superRefine((val, ctx) => {
    if (!val.title) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "Tab item is missing 'title'."
      });
    }
    if (!val.child) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        message: "Tab item is missing 'child'."
      });
    }
    if (val.title) {
      exactlyOneKey(val.title, ctx);
    }
  })).describe("A list of tabs, each with a title and a child component ID.")
});
var DividerSchema = external_exports.object({
  axis: external_exports.enum(["horizontal", "vertical"]).optional().describe("The orientation."),
  color: external_exports.string().optional().describe("The color of the divider (e.g., hex code or semantic name)."),
  thickness: external_exports.number().optional().describe("The thickness of the divider.")
});
var ModalSchema = external_exports.object({
  entryPointChild: external_exports.string().describe("The ID of the component (e.g., a button) that triggers the modal."),
  contentChild: external_exports.string().describe("The ID of the component to display as the modal's content.")
});
var ButtonSchema = external_exports.object({
  child: external_exports.string().describe("The ID of the component to display as the button's content."),
  action: ActionSchema3.describe("Represents a user-initiated action."),
  primary: external_exports.boolean().optional().describe("Indicates if this button should be styled as the primary action.")
});
var CheckboxSchema = external_exports.object({
  label: StringValueSchema,
  value: external_exports.object({
    path: external_exports.string().describe("A data binding reference to a location in the data model (e.g., '/user/name').").optional(),
    literalBoolean: external_exports.boolean().optional()
  }).strict().superRefine(exactlyOneKey)
});
var TextFieldSchema = external_exports.object({
  text: StringValueSchema.optional(),
  label: StringValueSchema.describe("A label, title, or placeholder text."),
  textFieldType: external_exports.enum(["shortText", "number", "date", "longText", "obscured"]).optional(),
  validationRegexp: external_exports.string().optional().describe("A regex string to validate the input.")
});
var DateTimeInputSchema = external_exports.object({
  value: StringValueSchema,
  enableDate: external_exports.boolean().optional(),
  enableTime: external_exports.boolean().optional(),
  outputFormat: external_exports.string().optional().describe("The string format for the output (e.g., 'YYYY-MM-DD').")
});
var MultipleChoiceSchema = external_exports.object({
  selections: external_exports.object({
    path: external_exports.string().describe("A data binding reference to a location in the data model (e.g., '/user/name').").optional(),
    literalArray: external_exports.array(external_exports.string()).optional()
  }).strict().superRefine(exactlyOneKey),
  options: external_exports.array(external_exports.object({
    label: external_exports.object({
      path: external_exports.string().describe("A data binding reference to a location in the data model (e.g., '/user/name').").optional(),
      literalString: external_exports.string().describe("A fixed, hardcoded string value.").optional()
    }).strict().superRefine(exactlyOneKey),
    value: external_exports.string()
  })).optional(),
  maxAllowedSelections: external_exports.number().optional(),
  type: external_exports.enum(["checkbox", "chips"]).optional(),
  filterable: external_exports.boolean().optional()
});
var SliderSchema = external_exports.object({
  value: external_exports.object({
    path: external_exports.string().describe("A data binding reference to a location in the data model (e.g., '/user/name').").optional(),
    literalNumber: external_exports.number().optional()
  }).strict().superRefine(exactlyOneKey),
  minValue: external_exports.number().optional(),
  maxValue: external_exports.number().optional(),
  label: StringValueSchema.optional()
});
var ComponentArrayTemplateSchema = external_exports.object({
  componentId: external_exports.string(),
  dataBinding: external_exports.string()
});
var ComponentArrayReferenceSchema = external_exports.object({
  explicitList: external_exports.array(external_exports.string()).optional(),
  template: ComponentArrayTemplateSchema.describe("A template for generating a dynamic list of children from a data model list. `componentId` is the component to use as a template, and `dataBinding` is the path to the map of components in the data model. Values in the map will define the list of children.").optional()
}).strict().superRefine(exactlyOneKey);
var RowSchema = external_exports.object({
  children: ComponentArrayReferenceSchema,
  distribution: external_exports.enum(["start", "center", "end", "spaceBetween", "spaceAround", "spaceEvenly"]).optional(),
  alignment: external_exports.enum(["start", "center", "end", "stretch"]).optional()
});
var ColumnSchema = external_exports.object({
  children: ComponentArrayReferenceSchema,
  distribution: external_exports.enum(["start", "center", "end", "spaceBetween", "spaceAround", "spaceEvenly"]).optional(),
  alignment: external_exports.enum(["start", "center", "end", "stretch"]).optional()
});
var ListSchema = external_exports.object({
  children: ComponentArrayReferenceSchema,
  direction: external_exports.enum(["vertical", "horizontal"]).optional(),
  alignment: external_exports.enum(["start", "center", "end", "stretch"]).optional()
});
var CardSchema = external_exports.object({
  child: external_exports.string().describe("The ID of the component to be rendered inside the card.")
});

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v0_8/schema/server-to-client.js
var ValueMapSchema = DataValueSchema.describe("A single data entry. Exactly one 'value*' property should be provided alongside the key.");
var ComponentPropertiesSchema = external_exports.record(external_exports.any()).refine((val) => Object.keys(val).length === 1, "A wrapper object that MUST contain exactly one key, which is the name of the component type (e.g., 'Heading').");
var ComponentInstanceSchema = external_exports.object({
  id: external_exports.string().describe("The unique identifier for this component."),
  weight: external_exports.number().optional().describe("The relative weight of this component within a Row or Column. This corresponds to the CSS 'flex-grow' property. Note: this may ONLY be set when the component is a direct descendant of a Row or Column."),
  component: ComponentPropertiesSchema.describe("A wrapper object that MUST contain exactly one key, which is the name of the component type (e.g., 'Heading'). The value is an object containing the properties for that specific component.")
}).strict().describe("Represents a *single* component in a UI widget tree. This component could be one of many supported types.");
var BeginRenderingMessageSchema = external_exports.object({
  surfaceId: external_exports.string().describe("The unique identifier for the UI surface to be rendered."),
  catalogId: external_exports.string().optional().describe("The identifier of the component catalog to use for this surface. If omitted, the client MUST default to the standard catalog for this A2UI version (https://a2ui.org/specification/v0_8/standard_catalog_definition.json)."),
  root: external_exports.string().describe("The ID of the root component to render."),
  styles: external_exports.object({
    font: external_exports.string().optional().describe("The primary font for the UI."),
    primaryColor: external_exports.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe("The primary UI color as a hexadecimal code (e.g., '#00BFFF').")
  }).strict().optional().describe("Styling information for the UI.")
}).strict().describe("Signals the client to begin rendering a surface with a root component and specific styles.");
var SurfaceUpdateMessageSchema = external_exports.object({
  surfaceId: external_exports.string().describe("The unique identifier for the UI surface to be updated. If you are adding a new surface this *must* be a new, unique identified that has never been used for any existing surfaces shown."),
  components: external_exports.array(ComponentInstanceSchema).min(1).describe("A list containing all UI components for the surface.")
}).strict().superRefine((data, ctx) => {
  const componentIds = /* @__PURE__ */ new Set();
  for (const c2 of data.components) {
    if (c2.id) {
      if (componentIds.has(c2.id)) {
        ctx.addIssue({
          code: external_exports.ZodIssueCode.custom,
          message: `Duplicate component ID found: ${c2.id}`,
          path: ["components"]
        });
      }
      componentIds.add(c2.id);
    }
  }
  const checkRefs = (ids, componentId) => {
    for (const id of ids) {
      if (id && !componentIds.has(id)) {
        ctx.addIssue({
          code: external_exports.ZodIssueCode.custom,
          message: `Component '${componentId}' references non-existent component ID '${id}'.`,
          path: ["components"]
        });
      }
    }
  };
  for (const component of data.components) {
    if (!component.id || !component.component)
      continue;
    const componentTypes = Object.keys(component.component);
    if (componentTypes.length !== 1)
      continue;
    const componentType = componentTypes[0];
    const properties = component.component[componentType];
    switch (componentType) {
      case "Row":
      case "Column":
      case "List":
        if (properties.children && !Array.isArray(properties.children)) {
          const hasExplicit = !!properties.children.explicitList;
          const hasTemplate = !!properties.children.template;
          if (hasExplicit && hasTemplate || !hasExplicit && !hasTemplate) {
            ctx.addIssue({
              code: external_exports.ZodIssueCode.custom,
              message: `Component '${component.id}' must have either 'explicitList' or 'template' in children, but not both or neither.`
            });
          }
          if (hasExplicit)
            checkRefs(properties.children.explicitList, component.id);
          if (hasTemplate)
            checkRefs([properties.children.template?.componentId], component.id);
        }
        break;
      case "Card":
        if (properties.child)
          checkRefs([properties.child], component.id);
        break;
      case "Tabs":
        if (properties.tabItems && Array.isArray(properties.tabItems)) {
          properties.tabItems.forEach((tab) => {
            if (tab.child)
              checkRefs([tab.child], component.id);
          });
        }
        break;
      case "Modal":
        checkRefs([properties.entryPointChild, properties.contentChild], component.id);
        break;
      case "Button":
        if (properties.child)
          checkRefs([properties.child], component.id);
        break;
    }
  }
}).describe("Updates a surface with a new set of components.");
var DataModelUpdateMessageSchema = external_exports.object({
  surfaceId: external_exports.string().describe("The unique identifier for the UI surface this data model update applies to."),
  path: external_exports.string().optional().describe("An optional path to a location within the data model (e.g., '/user/name'). If omitted, or set to '/', the entire data model will be replaced."),
  contents: external_exports.array(ValueMapSchema).describe("An array of data entries. Each entry must contain a 'key' and exactly one corresponding typed 'value*' property.")
}).strict().describe("Updates the data model for a surface.");
var DeleteSurfaceMessageSchema = external_exports.object({
  surfaceId: external_exports.string().describe("The unique identifier for the UI surface to be deleted.")
}).strict().describe("Signals the client to delete the surface identified by 'surfaceId'.");
var A2uiMessageSchema = external_exports.object({
  beginRendering: BeginRenderingMessageSchema.optional(),
  surfaceUpdate: SurfaceUpdateMessageSchema.optional(),
  dataModelUpdate: DataModelUpdateMessageSchema.optional(),
  deleteSurface: DeleteSurfaceMessageSchema.optional()
}).strict().superRefine((data, ctx) => {
  const keys = Object.keys(data).filter((k) => ["beginRendering", "surfaceUpdate", "dataModelUpdate", "deleteSurface"].includes(k));
  if (keys.length !== 1) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "A2UI Protocol message must have exactly one of: surfaceUpdate, dataModelUpdate, beginRendering, deleteSurface."
    });
  }
}).describe("Describes a JSON payload for an A2UI (Agent to UI) message, which is used to dynamically construct and update user interfaces. A message MUST contain exactly ONE of the action properties: 'beginRendering', 'surfaceUpdate', 'dataModelUpdate', or 'deleteSurface'.");

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/processing/adapters/v0_8.js
function normalizeV08Component(comp) {
  if (!comp || typeof comp !== "object") {
    return { id: "", component: "" };
  }
  const c2 = comp;
  let componentName = typeof c2.component === "string" ? c2.component : "";
  const props = {};
  for (const [k, v2] of Object.entries(c2)) {
    if (k !== "component" && k !== "id") {
      props[k] = v2;
    }
  }
  if (c2.component && typeof c2.component === "object") {
    const obj = c2.component;
    const keys = Object.keys(obj);
    if (keys.length > 0) {
      componentName = keys[0];
      const compProps = obj[keys[0]];
      if (compProps && typeof compProps === "object" && compProps !== null && !Array.isArray(compProps)) {
        Object.assign(props, compProps);
      }
    }
  }
  return {
    ...props,
    id: String(c2.id ?? ""),
    component: componentName
  };
}
var V0Point8Adapter = class extends BaseVersionAdapter {
  constructor() {
    super(...arguments);
    this.version = "v0.8";
    this.schema = A2uiMessageSchema;
  }
  getNativeActionKeys() {
    return ["beginRendering", "surfaceUpdate", "dataModelUpdate", "deleteSurface"];
  }
  preparePayloadForValidation(msgObj) {
    const msgWithoutVersion = { ...msgObj };
    delete msgWithoutVersion.version;
    return msgWithoutVersion;
  }
  extractOperationsFromObject(msgObj) {
    const ops = [];
    if ("beginRendering" in msgObj) {
      const cs = msgObj.beginRendering;
      ops.push({
        type: "createSurface",
        surfaceId: String(cs?.surfaceId ?? ""),
        catalogId: typeof cs?.catalogId === "string" ? cs.catalogId : void 0,
        theme: cs?.theme ?? cs?.styles,
        sendDataModel: Boolean(cs?.sendDataModel),
        components: Array.isArray(cs?.components) ? cs.components.map(normalizeV08Component) : void 0,
        dataModel: cs?.dataModel && typeof cs.dataModel === "object" && !Array.isArray(cs.dataModel) ? cs.dataModel : void 0,
        version: typeof msgObj.version === "string" ? msgObj.version : this.version,
        rootId: typeof cs?.root === "string" && cs.root ? cs.root : void 0
      });
    }
    if ("surfaceUpdate" in msgObj) {
      const uc = msgObj.surfaceUpdate;
      ops.push({
        type: "updateComponents",
        surfaceId: String(uc?.surfaceId ?? ""),
        components: Array.isArray(uc?.components) ? uc.components.map(normalizeV08Component) : []
      });
    }
    if ("dataModelUpdate" in msgObj) {
      const ud = msgObj.dataModelUpdate;
      const surfaceId = String(ud?.surfaceId ?? "");
      const rawPath = typeof ud?.path === "string" ? ud.path.trim() : "";
      const basePath = rawPath && rawPath !== "/" ? (rawPath.startsWith("/") ? rawPath : `/${rawPath}`).replace(/\/+$/, "") : "";
      const extractContentValue = (entry) => {
        if ("valueNumber" in entry)
          return entry.valueNumber;
        if ("valueString" in entry)
          return entry.valueString;
        if ("valueBoolean" in entry)
          return entry.valueBoolean;
        if ("valueObject" in entry)
          return entry.valueObject;
        if ("valueArray" in entry)
          return entry.valueArray;
        if (Array.isArray(entry.valueMap)) {
          const nested = {};
          for (const sub of entry.valueMap) {
            if (sub && typeof sub === "object" && typeof sub.key === "string") {
              nested[sub.key] = extractContentValue(sub);
            }
          }
          return nested;
        }
        return entry.value;
      };
      if (Array.isArray(ud?.contents)) {
        for (const item of ud.contents) {
          if (item && typeof item === "object" && typeof item.key === "string") {
            const val = extractContentValue(item);
            const itemKey = item.key.replace(/^\/+/, "");
            const fullPath = itemKey === "." || itemKey === "" ? basePath || "/" : `${basePath}/${itemKey}`;
            ops.push({
              type: "updateDataModel",
              surfaceId,
              path: fullPath,
              value: val
            });
          }
        }
      } else {
        ops.push({
          type: "updateDataModel",
          surfaceId,
          path: typeof ud?.path === "string" ? ud.path : void 0,
          value: ud?.value
        });
      }
    }
    if ("deleteSurface" in msgObj) {
      const ds = msgObj.deleteSurface;
      ops.push({
        type: "deleteSurface",
        surfaceId: String(ds?.surfaceId ?? "")
      });
    }
    return ops;
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v0_9/schema/server-to-client.js
var CreateSurfaceMessageSchema = external_exports.object({
  "version": external_exports.enum(["v0.9", "v0.9.1"]),
  "createSurface": external_exports.object({
    "surfaceId": external_exports.string().describe("The unique identifier for the UI surface to be rendered."),
    "catalogId": external_exports.string().describe("A string that uniquely identifies this catalog. It is recommended to prefix this with an internet domain that you own, to avoid conflicts e.g. mycompany.com:somecatalog'."),
    "theme": external_exports.any().optional(),
    "sendDataModel": external_exports.boolean().describe("If true, the client will send the full data model of this surface in the metadata of every A2A message sent to the server that created the surface. Defaults to false.").optional()
  }).strict().describe("Signals the client to create a new surface and begin rendering it. It is an error to send 'createSurface' for a surfaceId that already exists without first deleting it. When this message is sent, the client will expect 'updateComponents' and/or 'updateDataModel' messages for the same surfaceId that define the component tree.")
}).strict();
var UpdateComponentsMessageSchema = external_exports.object({
  "version": external_exports.enum(["v0.9", "v0.9.1"]),
  "updateComponents": external_exports.object({
    "surfaceId": external_exports.string().describe("The unique identifier for the UI surface to be updated."),
    "components": external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).min(1).describe("A list containing all UI components for the surface.")
  }).strict().describe("Updates a surface with a new set of components. This message can be sent multiple times to update the component tree of an existing surface. One of the components in one of the components lists MUST have an 'id' of 'root' to serve as the root of the component tree. A createSurface message MUST have been previously sent for the 'surfaceId' in this message; the surface's catalog is the one specified by that createSurface.")
}).strict();
var UpdateDataModelMessageSchema = external_exports.object({
  "version": external_exports.enum(["v0.9", "v0.9.1"]),
  "updateDataModel": external_exports.object({
    "surfaceId": external_exports.string().describe("The unique identifier for the UI surface this data model update applies to."),
    "path": external_exports.string().describe("An optional path to a location within the data model (e.g., '/user/name'). If omitted, or set to '/', refers to the entire data model.").optional(),
    "value": external_exports.any().describe("The data to be updated in the data model. If present, the value at 'path' is replaced (or created). If omitted, the key at 'path' is removed.").optional()
  }).strict().describe("Updates the data model for an existing surface. This message can be sent multiple times to update the data model. A createSurface message MUST have been previously sent for the 'surfaceId' in this message; the surface's catalog is the one specified by that createSurface.")
}).strict();
var DeleteSurfaceMessageSchema2 = external_exports.object({
  "version": external_exports.enum(["v0.9", "v0.9.1"]),
  "deleteSurface": external_exports.object({
    "surfaceId": external_exports.string().describe("The unique identifier for the UI surface to be deleted.")
  }).strict().describe("Signals the client to delete the surface identified by 'surfaceId'. A createSurface message MUST have been previously sent for the 'surfaceId' in this message; the surface's catalog is the one specified by that createSurface.")
}).strict();
var A2uiMessageSchema2 = external_exports.union([
  CreateSurfaceMessageSchema,
  UpdateComponentsMessageSchema,
  UpdateDataModelMessageSchema,
  DeleteSurfaceMessageSchema2
]);
var A2uiMessageListSchema = external_exports.array(A2uiMessageSchema2).describe("A list of messages.");
var A2uiMessageListWrapperSchema = external_exports.object({
  messages: A2uiMessageListSchema
}).strict().describe("An object wrapping a list of messages.");

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/processing/adapters/v0_9.js
var V0Point9Adapter = class extends BaseVersionAdapter {
  constructor() {
    super(...arguments);
    this.version = "v0.9";
    this.schema = A2uiMessageSchema2;
  }
  get compatibleCatalogVersions() {
    return /* @__PURE__ */ new Set(["0.9", "0.9.1"]);
  }
  getNativeActionKeys() {
    return ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"];
  }
  extractOperationsFromObject(msgObj) {
    const ops = [];
    if ("createSurface" in msgObj) {
      const cs = msgObj.createSurface;
      ops.push({
        type: "createSurface",
        surfaceId: String(cs?.surfaceId || ""),
        catalogId: typeof cs?.catalogId === "string" ? cs.catalogId : void 0,
        theme: cs?.theme,
        sendDataModel: Boolean(cs?.sendDataModel),
        components: Array.isArray(cs?.components) ? cs.components : void 0,
        dataModel: cs?.dataModel && typeof cs.dataModel === "object" && !Array.isArray(cs.dataModel) ? cs.dataModel : void 0,
        version: typeof msgObj.version === "string" ? msgObj.version : this.version
      });
    }
    if ("updateComponents" in msgObj) {
      const uc = msgObj.updateComponents;
      ops.push({
        type: "updateComponents",
        surfaceId: String(uc?.surfaceId || ""),
        components: Array.isArray(uc?.components) ? uc.components : []
      });
    }
    if ("updateDataModel" in msgObj) {
      const ud = msgObj.updateDataModel;
      ops.push({
        type: "updateDataModel",
        surfaceId: String(ud?.surfaceId || ""),
        path: typeof ud?.path === "string" ? ud.path : void 0,
        value: ud?.value
      });
    }
    if ("deleteSurface" in msgObj) {
      const ds = msgObj.deleteSurface;
      ops.push({
        type: "deleteSurface",
        surfaceId: String(ds?.surfaceId || "")
      });
    }
    return ops;
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/processing/operations.js
var INTERNAL_OPERATION_TYPES = [
  "createSurface",
  "updateComponents",
  "updateDataModel",
  "deleteSurface",
  "callRendererFunction",
  "agentFunctionResponse"
];
function isInternalOperation(payload) {
  return typeof payload === "object" && payload !== null && "type" in payload && typeof payload.type === "string" && INTERNAL_OPERATION_TYPES.includes(payload.type);
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v1_0/schema/helpers.js
var TemplateChildListSchema = external_exports.object({
  "componentId": external_exports.lazy(() => ComponentIdSchema2),
  "path": external_exports.string().describe("The path to the list of component property objects in the data model.")
}).strict().describe("REF:#/$defs/TemplateChildList|A template for generating a dynamic list of children from a data model list. The `componentId` is the component to use as a template.");
var AnyComponentSchema2 = external_exports.lazy(() => ComponentCommonSchema2.extend({
  component: external_exports.string()
}).passthrough().refine((comp) => comp.component !== "Surface", {
  message: 'Component type cannot be "Surface". "Surface" is a top-level protocol container defined in createSurface, not a child component.'
}));
var ComponentsListSchema = external_exports.array(AnyComponentSchema2).min(1);
var RendererCapabilitiesSchema = external_exports.record(external_exports.string(), external_exports.any());

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/v1_0/schema/agent-to-renderer.js
var CreateSurfaceMessageSchema2 = external_exports.object({
  "version": external_exports.literal("v1.0"),
  "createSurface": external_exports.object({
    "surfaceId": external_exports.string().describe("The unique identifier for the UI surface to be rendered. It must be globally unique for the renderer's lifetime."),
    "catalogId": external_exports.string().describe("A string that uniquely identifies the default catalog for this surface. It is recommended to prefix this with an internet domain that you own, to avoid conflicts e.g. 'mycompany.com:somecatalog'. Components and function calls that do not explicitly specify a catalogId will use this surface-level default catalogId.").optional(),
    "sendDataModel": external_exports.boolean().describe("If true, the renderer will send the full data model of this surface in the metadata of every A2A message sent to the agent that created the surface. Defaults to false.").optional(),
    "components": ComponentsListSchema.optional(),
    "dataModel": external_exports.record(external_exports.string(), external_exports.any()).describe("The initial root data model object for the surface.").optional(),
    "metadata": external_exports.object({ "extensions": ExtensionsSchema2.optional() }).strict().describe("Optional surface-level metadata.").optional()
  }).strict().describe("Signals the renderer to create a new surface and begin rendering it. Creating a surface implicitly instantiates the canonical 'Surface' container component ('common_types.json#/$defs/Surface') with 'child': 'root'. It is an error to try to create a surface with an existing ID without first deleting it; surfaceId MUST be globally unique for the renderer's lifetime. When this message is sent, the renderer expects 'updateComponents' and/or 'updateDataModel' messages for the same surfaceId to define the component tree.")
}).strict();
var UpdateComponentsMessageSchema2 = external_exports.object({
  "version": external_exports.literal("v1.0"),
  "updateComponents": external_exports.object({
    "surfaceId": external_exports.string().describe("The unique identifier for the UI surface to be updated. It must be globally unique for the renderer's lifetime."),
    "components": ComponentsListSchema
  }).strict().describe("Updates a surface with a new set of components. This message can be sent multiple times to update the component tree of an existing surface. One of the components in one of the components lists MUST have an 'id' of 'root' to serve as the root of the component tree. The createSurface message MUST have been previously sent for this surfaceId.")
}).strict();
var UpdateDataModelMessageSchema2 = external_exports.object({
  "version": external_exports.literal("v1.0"),
  "updateDataModel": external_exports.object({
    "surfaceId": external_exports.string().describe("The unique identifier for the UI surface this data model update applies to. It must be globally unique for the renderer's lifetime."),
    "path": external_exports.string().describe("An optional path to a location within the data model (e.g., '/user/name'). If omitted, or set to '/', refers to the entire data model.").optional(),
    "value": external_exports.any().describe("The data to be updated in the data model. To delete the key/value at 'path', set 'value' explicitly to null.")
  }).strict().describe("Updates the data model for an existing surface. This message can be sent multiple times to update the data model. The createSurface message MUST have been previously sent for this surfaceId.")
}).strict();
var DeleteSurfaceMessageSchema3 = external_exports.object({
  "version": external_exports.literal("v1.0"),
  "deleteSurface": external_exports.object({
    "surfaceId": external_exports.string().describe("The unique identifier for the UI surface to be deleted. It must be globally unique for the renderer's lifetime.")
  }).strict().describe("Signals the renderer to delete the surface identified by 'surfaceId'. The createSurface message MUST have been previously sent for this surfaceId.")
}).strict();
var CallRendererFunctionMessageSchema = external_exports.object({
  "version": external_exports.literal("v1.0"),
  "callRendererFunction": external_exports.object({
    "surfaceId": external_exports.string().describe("Optional ID of the surface whose data model provides the evaluation context for this call. If omitted, the function executes in a surface-independent root context with an empty data model.").optional(),
    "functionCallId": CallIdSchema2,
    "callFunction": external_exports.intersection(FunctionCallSchema2, external_exports.object({ "catalogId": external_exports.string() }).passthrough())
  }).strict().describe("Signals the renderer to execute a function locally on behalf of the agent.")
}).strict();
var AgentFunctionResponseMessageSchema = external_exports.object({ "version": external_exports.literal("v1.0"), "agentFunctionResponse": FunctionResponseSchema2 }).strict();
var AgentToRendererMessageSchema = external_exports.union([
  CreateSurfaceMessageSchema2,
  UpdateComponentsMessageSchema2,
  UpdateDataModelMessageSchema2,
  DeleteSurfaceMessageSchema3,
  CallRendererFunctionMessageSchema,
  AgentFunctionResponseMessageSchema
]);

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/processing/adapters/v1_0.js
var V1Point0Adapter = class extends BaseVersionAdapter {
  constructor() {
    super(...arguments);
    this.version = "v1.0";
    this.schema = AgentToRendererMessageSchema;
  }
  getNativeActionKeys() {
    return [...INTERNAL_OPERATION_TYPES];
  }
  extractOperationsFromObject(msgObj) {
    const ops = [];
    if ("createSurface" in msgObj) {
      const cs = msgObj.createSurface;
      ops.push({
        type: "createSurface",
        surfaceId: String(cs?.surfaceId || ""),
        catalogId: typeof cs?.catalogId === "string" ? cs.catalogId : void 0,
        theme: cs?.theme,
        sendDataModel: Boolean(cs?.sendDataModel),
        components: Array.isArray(cs?.components) ? cs.components : void 0,
        dataModel: cs?.dataModel && typeof cs.dataModel === "object" && !Array.isArray(cs.dataModel) ? cs.dataModel : void 0,
        version: typeof msgObj.version === "string" ? msgObj.version : this.version,
        metadata: cs?.metadata && typeof cs.metadata === "object" && !Array.isArray(cs.metadata) ? cs.metadata : void 0
      });
    }
    if ("updateComponents" in msgObj) {
      const uc = msgObj.updateComponents;
      ops.push({
        type: "updateComponents",
        surfaceId: String(uc?.surfaceId || ""),
        components: Array.isArray(uc?.components) ? uc.components : []
      });
    }
    if ("updateDataModel" in msgObj) {
      const ud = msgObj.updateDataModel;
      ops.push({
        type: "updateDataModel",
        surfaceId: String(ud?.surfaceId || ""),
        path: typeof ud?.path === "string" ? ud.path : void 0,
        value: ud?.value
      });
    }
    if ("deleteSurface" in msgObj) {
      const ds = msgObj.deleteSurface;
      ops.push({
        type: "deleteSurface",
        surfaceId: String(ds?.surfaceId || "")
      });
    }
    if ("callRendererFunction" in msgObj) {
      const crf = msgObj.callRendererFunction;
      const cf = crf?.callFunction || {};
      ops.push({
        type: "callRendererFunction",
        surfaceId: typeof crf?.surfaceId === "string" ? crf.surfaceId : void 0,
        functionCallId: String(crf?.functionCallId || ""),
        call: String(cf?.["@call"] || cf?.call || ""),
        version: this.version,
        catalogId: typeof cf?.catalogId === "string" ? cf.catalogId : void 0,
        args: cf?.args && typeof cf.args === "object" && !Array.isArray(cf.args) ? cf.args : {}
      });
    }
    if ("agentFunctionResponse" in msgObj) {
      const afr = msgObj.agentFunctionResponse;
      ops.push({
        type: "agentFunctionResponse",
        functionCallId: String(afr?.functionCallId || ""),
        version: this.version,
        value: afr?.value,
        error: afr?.error && typeof afr.error === "object" ? afr.error : void 0
      });
    }
    return ops;
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/processing/adapters/factory.js
var VersionAdapterFactory = class {
  constructor() {
    this.adapters = /* @__PURE__ */ new Map([
      ["0.8", new V0Point8Adapter()],
      ["0.9", new V0Point9Adapter()],
      ["0.9.1", new V0Point9Adapter()],
      ["1.0", new V1Point0Adapter()]
    ]);
  }
  /**
   * Returns the aggregated set of all action keys supported by all registered adapters.
   *
   * @return A set of all supported action key strings.
   */
  getAllKnownActions() {
    const actions = /* @__PURE__ */ new Set();
    for (const adapter of this.adapters.values()) {
      if (adapter.validActions) {
        for (const action of adapter.validActions) {
          actions.add(action);
        }
      }
    }
    return actions;
  }
  /**
   * Dynamically registers a version adapter on this factory instance.
   *
   * @param adapter The version adapter instance to register.
   */
  registerAdapter(adapter) {
    const key = toCanonicalVersion(adapter.version) ?? normalizeVersionString(adapter.version);
    this.adapters.set(key, adapter);
  }
  /**
   * Resolves the version adapter for the specified version string from this factory instance.
   *
   * @param version The protocol version string (e.g. 'v1.0').
   * @return The matching version adapter.
   * @throws A2uiValidationError if the version string is unsupported.
   */
  getAdapter(version) {
    const key = toCanonicalVersion(version) ?? normalizeVersionString(version);
    const adapter = this.adapters.get(key);
    if (!adapter) {
      const supported = Array.from(new Set(Array.from(this.adapters.keys()).map((k) => k.startsWith("v") ? k : `v${k}`))).sort().join(", ");
      throw new A2uiValidationError(`[VersionAdapterFactory] Unsupported protocol version '${version}'. Supported versions: ${supported}.`);
    }
    return adapter;
  }
  /**
   * Resolves the version adapter directly from an incoming message payload using this factory instance.
   *
   * @param payload The raw JSON message payload.
   * @returns The resolved version adapter.
   * @throws A2uiValidationError if the payload is missing a valid 'version' string.
   */
  resolveFromPayload(payload) {
    const item = Array.isArray(payload) ? payload[0] : payload;
    if (typeof item === "object" && item !== null) {
      if ("messages" in item && Array.isArray(item.messages)) {
        return this.resolveFromPayload(item.messages);
      }
      if ("version" in item) {
        const ver = item.version;
        if (typeof ver !== "string") {
          throw new A2uiValidationError(`[VersionAdapterFactory] Message payload is missing a valid 'version' string: 'version' property must be a string, got ${typeof ver}.`);
        }
        return this.getAdapter(ver);
      }
      if ("beginRendering" in item || "surfaceUpdate" in item || "dataModelUpdate" in item || "deleteSurface" in item) {
        return this.getAdapter("v0.8");
      }
    }
    throw new A2uiValidationError("[VersionAdapterFactory] Message payload is missing a valid 'version' string.");
  }
  /**
   * Registers a version adapter on the default singleton factory instance.
   *
   * @param adapter Version adapter instance to register.
   */
  static registerAdapter(adapter) {
    defaultVersionAdapterFactory.registerAdapter(adapter);
  }
  /**
   * Resolves a version adapter for the specified version from the default singleton factory instance.
   *
   * @param version Protocol version string.
   * @return Matching version adapter.
   */
  static getAdapter(version) {
    return defaultVersionAdapterFactory.getAdapter(version);
  }
  /**
   * Resolves a version adapter directly from a payload using the default singleton factory instance.
   *
   * @param payload Raw JSON message payload.
   * @returns Resolved version adapter.
   */
  static resolveFromPayload(payload) {
    return defaultVersionAdapterFactory.resolveFromPayload(payload);
  }
  /**
   * Returns the aggregated set of all action keys supported by all registered adapters
   * from the default singleton factory instance.
   *
   * @return A set of all supported action key strings.
   */
  static getAllKnownActions() {
    return defaultVersionAdapterFactory.getAllKnownActions();
  }
};
var defaultVersionAdapterFactory = new VersionAdapterFactory();
registerKnownActionsProvider(() => defaultVersionAdapterFactory.getAllKnownActions());

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/validation/payload-validator.js
var COMPONENT_ENVELOPE_KEYS2 = ["id", "component", "catalogId", "metadata"];
function getSystemFunctionApi(name) {
  return name === IndexApi.name ? IndexApi : void 0;
}
function assertSystemCallNamesNoCatalog(name, call) {
  if (call["catalogId"] !== void 0) {
    throw new A2uiValidationError(`System function '${name}' belongs to no catalog and must not name a catalogId.`);
  }
}
function nonStringCatalogIdMessage(name) {
  return `Function call '${name}' has a non-string 'catalogId'.`;
}
function nestedCallRunsInCatalog(callCatalogId, catalogId, { catalogIsDefault }) {
  if (callCatalogId === void 0) {
    return catalogIsDefault;
  }
  return callCatalogId === catalogId;
}
var PayloadValidator = class {
  /**
   * Initializes a new `PayloadValidator`.
   *
   * @param catalog Catalog whose schemas define what a valid payload is.
   * @param config Validation strictness. When omitted, unknown components and
   *   functions are tolerated.
   */
  constructor(catalog, config) {
    this.catalog = catalog;
    this.config = config;
    this.enforceIdentifiers = isAtLeastVersion(catalog.protocolVersion, "1.0");
  }
  /**
   * Whether unrecognized components and functions are tolerated.
   *
   * An absent config means the caller is not validating at all, so unknown
   * elements pass. This preserves the gate `MessageProcessor` applied before
   * this class existed, and matches Python, whose `validate_components_update`
   * returns early when `config is None`.
   */
  get allowUnknown() {
    return this.config ? this.config.allowUnknownElements ?? false : true;
  }
  /**
   * Validates a single component payload against its catalog definition,
   * including any nested function calls within its properties.
   *
   * @param comp Raw component payload, including its `id` and `component`
   *   envelope keys.
   * @param knownType Component type to assume when the payload omits
   *   `component`, as happens on a partial update to an existing component.
   * @throws {A2uiValidationError} If the identifier, the component type, any
   *   property, or any nested function call fails validation.
   */
  validateComponent(comp, knownType) {
    const id = comp["id"];
    if (typeof id !== "string" || !id) {
      throw new A2uiValidationError(`Component '${comp["component"]}' is missing an 'id'; entries require a valid string 'id'.`);
    }
    this.assertIdentifier(id, `Component id '${id}' must be a valid UAX #31 identifier`);
    const declaredType = comp["component"];
    const componentType = typeof declaredType === "string" ? declaredType : knownType;
    if (!componentType) {
      throw new A2uiValidationError(`Cannot create component ${id} without a type.`);
    }
    const rawCatalogId = comp["catalogId"];
    const componentCatalogId = typeof rawCatalogId === "string" ? rawCatalogId : void 0;
    const properties = stripEnvelopeKeys(comp);
    const componentApi = this.catalog.components.get(componentType);
    if (!componentApi) {
      if (!this.allowUnknown) {
        throw new A2uiValidationError(`Unknown component type '${componentType}' not found in catalog '${this.catalog.id}'.`);
      }
      this.validateNestedFunctions(properties, componentCatalogId);
      return;
    }
    const knownKeys = getKnownSchemaKeys(componentApi.schema);
    this.validateCommonEnvelopeFields(properties, knownKeys, componentType, id, componentCatalogId);
    const result = componentApi.schema.safeParse(properties);
    if (!result.success) {
      const formattedErrors = result.error.errors.map(formatZodIssue).join(", ");
      throw new A2uiValidationError(`Validation failed for component '${componentType}' (${id}): ${formattedErrors}`, result.error.issues);
    }
    this.validateNestedFunctions(properties, componentCatalogId);
  }
  /**
   * Validates `accessibility` and `metadata` from `ComponentCommon` when the
   * component schema does not explicitly declare them, removing them from
   * `properties` before strict component schema parsing.
   */
  validateCommonEnvelopeFields(properties, knownKeys, componentType, id, componentCatalogId) {
    if ("accessibility" in properties && !knownKeys?.has("accessibility")) {
      const accVal = properties["accessibility"];
      delete properties["accessibility"];
      const accResult = AccessibilityAttributesSchema.optional().safeParse(accVal);
      if (!accResult.success) {
        const formattedErrors = accResult.error.errors.map(formatZodIssue).join(", ");
        throw new A2uiValidationError(`Validation failed for component '${componentType}' (${id}): ${formattedErrors}`, accResult.error.issues);
      }
      this.validateNestedFunctions(accVal, componentCatalogId);
    }
    if ("metadata" in properties && !knownKeys?.has("metadata")) {
      const metaVal = properties["metadata"];
      delete properties["metadata"];
      const metaResult = ComponentCommonSchema.shape.metadata.safeParse(metaVal);
      if (!metaResult.success) {
        const formattedErrors = metaResult.error.errors.map(formatZodIssue).join(", ");
        throw new A2uiValidationError(`Validation failed for component '${componentType}' (${id}): ${formattedErrors}`, metaResult.error.issues);
      }
    }
  }
  /**
   * Asserts that a v1.0 call's envelope is well formed without consulting its
   * catalog: the function name and all argument keys satisfy UAX #31
   * identifier syntax, and `args`, when present, is an object.
   *
   * @param name Function name to check.
   * @param args Function arguments object whose keys are checked.
   * @throws {A2uiValidationError} If the function name or any argument key is
   *   not a valid UAX #31 identifier, or `args` is not an object.
   */
  assertFunctionIdentifiers(name, args) {
    this.assertIdentifier(name, `Function name '${name}' must be a valid UAX #31 identifier`, true);
    if (this.enforceIdentifiers && args !== void 0 && args !== null && (typeof args !== "object" || Array.isArray(args))) {
      throw new A2uiValidationError(`Validation failed for function '${name}': Expected object, received ${Array.isArray(args) ? "array" : typeof args}`);
    }
    if (args && typeof args === "object" && !Array.isArray(args)) {
      const keys = Object.keys(args);
      if (keys.length > MAX_FUNCTION_CALL_ARGS) {
        throw new A2uiValidationError(`Function call '${name}' exceeds maximum allowed arguments count (${MAX_FUNCTION_CALL_ARGS})`);
      }
      for (const argName of keys) {
        this.assertIdentifier(argName, `Function argument '${argName}' in function '${name}' must be a valid UAX #31 identifier`);
      }
    }
  }
  /**
   * Recursively walks a component's property values and validates any nested
   * function call objects.
   *
   * From v1.0 a call that runs in this catalog (see `nestedCallRunsInCatalog`)
   * is validated against this catalog. Any other call runs in a catalog this
   * validator cannot see, so only its envelope (name and argument
   * identifiers) is checked; `MessageProcessor` validates it against the
   * catalog it resolves to. A non-string `catalogId` is rejected. Reserved `@`
   * system functions belong to no catalog and are validated fully.
   *
   * @param val Property value or subtree to inspect.
   * @param componentCatalogId The `catalogId` the component names, if any.
   * @throws {A2uiValidationError} If any nested function call fails schema or identifier validation.
   */
  validateNestedFunctions(val, componentCatalogId) {
    if (Array.isArray(val)) {
      for (const item of val) {
        this.validateNestedFunctions(item, componentCatalogId);
      }
      return;
    }
    if (typeof val !== "object" || val === null) {
      return;
    }
    const record = val;
    if (this.enforceIdentifiers) {
      validateReservedDirectives(Object.keys(record), this.catalog.protocolVersion);
    }
    const rawName = this.enforceIdentifiers ? record["@call"] : record["call"] ?? record["function"];
    if (typeof rawName === "string" && (this.enforceIdentifiers || rawName.length > 0)) {
      const rawArgs = record["args"];
      const argsDict = rawArgs !== void 0 ? rawArgs : {};
      if (!this.enforceIdentifiers) {
        this.validateFunction(rawName, argsDict);
      } else if (rawName.startsWith("@")) {
        assertSystemCallNamesNoCatalog(rawName, record);
        this.validateFunction(rawName, argsDict);
      } else {
        const callCatalogId = record["catalogId"];
        if (callCatalogId !== void 0 && typeof callCatalogId !== "string") {
          throw new A2uiValidationError(nonStringCatalogIdMessage(rawName));
        }
        if (nestedCallRunsInCatalog(callCatalogId, this.catalog.id, {
          catalogIsDefault: componentCatalogId === void 0
        })) {
          this.validateFunction(rawName, argsDict);
        } else {
          this.assertFunctionIdentifiers(rawName, argsDict);
        }
      }
    }
    for (const v2 of Object.values(record)) {
      this.validateNestedFunctions(v2, componentCatalogId);
    }
  }
  /**
   * Validates the arguments of a function call against the catalog definition.
   *
   * @param name Name of the function being called.
   * @param args Arguments supplied by the payload.
   * @returns The parsed arguments object (including any schema defaults).
   * @throws {A2uiValidationError} If the function name, an argument name, or an
   *   argument value fails validation.
   */
  validateFunction(name, args) {
    this.assertFunctionIdentifiers(name, args);
    const fn = this.enforceIdentifiers && name.startsWith("@") ? getSystemFunctionApi(name) : this.catalog.functions.get(name);
    if (!fn) {
      if (!this.allowUnknown) {
        throw new A2uiValidationError(`Unrecognized function '${name}'`);
      }
      return args ?? {};
    }
    if (!fn.schema) {
      if (args !== void 0 && (typeof args !== "object" || args === null || Array.isArray(args))) {
        throw new A2uiValidationError(`Validation failed for function '${name}': Expected object, received ${Array.isArray(args) ? "array" : typeof args}`);
      }
      return args ?? {};
    }
    const result = fn.schema.safeParse(args ?? {});
    if (!result.success) {
      const formattedErrors = result.error.errors.map(formatZodIssue).join(", ");
      throw new A2uiValidationError(`Validation failed for function '${name}': ${formattedErrors}`, result.error.issues);
    }
    return result.data;
  }
  /**
   * Validates a surface theme against the catalog's theme schema.
   *
   * A catalog that declares no theme schema accepts any theme.
   *
   * @param theme Theme payload supplied on `createSurface`.
   * @returns The parsed theme, which a schema may have defaulted or coerced.
   * @throws {A2uiValidationError} If the theme does not satisfy the schema.
   */
  validateTheme(theme) {
    const themeSchema = this.catalog.themeSchema;
    if (!themeSchema)
      return theme;
    const result = themeSchema.safeParse(theme);
    if (!result.success) {
      const formattedErrors = result.error.errors.map(formatZodIssue).join(", ");
      throw new A2uiValidationError(`Validation failed for theme: ${formattedErrors}`, result.error.issues);
    }
    return result.data;
  }
  /**
   * Asserts that an identifier is valid if identifier enforcement is enabled.
   *
   * @param name Identifier to check.
   * @param message Error message to use when validation fails.
   * @throws {A2uiValidationError} If identifier enforcement is active and `name` is invalid.
   */
  assertIdentifier(name, message, allowLeadingAt = false) {
    if (!this.enforceIdentifiers)
      return;
    if (!isValidUax31Identifier(name, allowLeadingAt)) {
      throw new A2uiValidationError(message);
    }
  }
};
function stripEnvelopeKeys(comp) {
  const properties = {};
  for (const [key, value] of Object.entries(comp)) {
    if (COMPONENT_ENVELOPE_KEYS2.includes(key))
      continue;
    properties[key] = value;
  }
  return properties;
}

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/rpc/rpc-handler.js
var RpcHandler = class {
  constructor(optionsOrCatalogs, outboundListener) {
    this.pendingAgentCalls = /* @__PURE__ */ new Map();
    this.isDisposed = false;
    if (Array.isArray(optionsOrCatalogs)) {
      this.catalogs = optionsOrCatalogs;
      this.outboundListener = outboundListener;
      this.defaultTimeoutMs = 3e4;
    } else {
      const options = optionsOrCatalogs ?? {};
      this.catalogs = options.catalogs ?? [];
      this.outboundListener = options.outboundListener;
      this.defaultTimeoutMs = options.defaultTimeoutMs ?? 3e4;
    }
  }
  /**
   * Whether this RPC handler has been disposed.
   */
  get disposed() {
    return this.isDisposed;
  }
  /**
   * Executes a remote renderer function requested by the server agent.
   *
   * @param message Inbound callRendererFunction message.
   * @param context DataContext for function execution.
   * @param isUserActivated Whether execution occurs in an active user gesture context.
   * @returns A promise resolving to the renderer function response message.
   */
  async handleCallRendererFunction(message, context, isUserActivated = false) {
    const validationError = this.validateInboundMessage(message);
    if (validationError) {
      await this.emitOutboundResponse(validationError);
      return validationError;
    }
    const { version, callRendererFunction } = message;
    const { surfaceId, functionCallId, callFunction } = callRendererFunction;
    if (surfaceId !== void 0 && context?.surface?.id !== surfaceId) {
      const errorResponse = this.createResponseError(functionCallId, RpcErrorCode.INVALID_FUNCTION_CALL, `Surface not found: ${surfaceId}`, version);
      await this.emitOutboundResponse(errorResponse);
      return errorResponse;
    }
    const call = callFunction["@call"] ?? callFunction.call;
    const { catalogId, args } = callFunction;
    const resolved = this.resolveFunctionImplementation(catalogId, call, context, version);
    if ("error" in resolved) {
      const errorResponse = this.createResponseError(functionCallId, RpcErrorCode.INVALID_FUNCTION_CALL, resolved.error, version);
      await this.emitOutboundResponse(errorResponse);
      return errorResponse;
    }
    const accessError = this.checkExecutionPermissions(resolved.funcImpl, call, isUserActivated);
    if (accessError) {
      const errorResponse = this.createResponseError(functionCallId, RpcErrorCode.INVALID_FUNCTION_CALL, accessError, version);
      await this.emitOutboundResponse(errorResponse);
      return errorResponse;
    }
    const effectiveContext = this.ensureDataContext(context, resolved.catalog, functionCallId);
    const resolvedArgsResult = this.resolveDynamicArguments(args, effectiveContext, isUserActivated);
    if ("error" in resolvedArgsResult) {
      const errorResponse = this.createResponseError(functionCallId, RpcErrorCode.EXECUTION_ERROR, resolvedArgsResult.error, version);
      await this.emitOutboundResponse(errorResponse);
      return errorResponse;
    }
    const parsedArgsResult = this.parseArguments(resolved.catalog, resolved.funcImpl, resolvedArgsResult.args, call);
    if ("error" in parsedArgsResult) {
      const errorResponse = this.createResponseError(functionCallId, RpcErrorCode.INVALID_FUNCTION_CALL, parsedArgsResult.error, version);
      await this.emitOutboundResponse(errorResponse);
      return errorResponse;
    }
    const response = await this.executeFunctionSafely(resolved.funcImpl, parsedArgsResult.args, effectiveContext, functionCallId, version);
    await this.emitOutboundResponse(response);
    return response;
  }
  /**
   * Processes an inbound agent function response to resolve or reject the matching pending outbound call.
   *
   * @param message Inbound agent function response message.
   */
  handleAgentFunctionResponse(message) {
    if (!message || !message.agentFunctionResponse)
      return;
    const { functionCallId, value, error } = message.agentFunctionResponse;
    const pending = this.pendingAgentCalls.get(functionCallId);
    if (!pending)
      return;
    this.pendingAgentCalls.delete(functionCallId);
    if (error) {
      const errCode = error.code ?? RpcErrorCode.UNKNOWN_ERROR;
      const errMsg = error.message ?? "Agent function execution failed";
      pending.reject(new A2uiRpcError(errMsg, errCode, functionCallId, error));
    } else {
      pending.resolve(value);
    }
  }
  /**
   * Invokes a remote function on the server agent using an options bag.
   *
   * @template T Expected return value type of the agent function.
   * @param surfaceId Identifier of the surface requesting execution.
   * @param call Function call details.
   * @param options Optional invocation options (custom functionCallId, timeoutMs).
   * @returns A promise resolving to the agent function return value.
   * @throws {A2uiRpcError} If the handler is disposed, no listener is configured, the call is invalid or duplicate, or invocation times out or fails.
   */
  callAgentFunction(surfaceId, call, options) {
    if (this.isDisposed) {
      return Promise.reject(new A2uiRpcError("RpcHandler has been disposed.", RpcErrorCode.DISPOSED));
    }
    if (!this.outboundListener) {
      return Promise.reject(new A2uiRpcError("Cannot call agent function without outboundListener configured.", RpcErrorCode.NO_LISTENER));
    }
    const callName = call?.["@call"] ?? call?.call;
    if (!call || !callName) {
      return Promise.reject(new A2uiRpcError("Missing or invalid function call name.", RpcErrorCode.INVALID_FUNCTION_CALL));
    }
    const opts = options ?? {};
    const functionCallId = opts.functionCallId ?? this.generateFunctionCallId();
    const effectiveTimeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;
    if (this.pendingAgentCalls.has(functionCallId)) {
      return Promise.reject(new A2uiRpcError(`A call with functionCallId '${functionCallId}' is already pending.`, RpcErrorCode.DUPLICATE, functionCallId));
    }
    const normalized = {
      functionCallId,
      call,
      effectiveTimeoutMs,
      version: opts.version
    };
    return this.dispatchAgentCall(surfaceId, normalized);
  }
  /**
   * Disposes the RPC handler and cancels all pending agent function calls with a `CANCELLED` error.
   */
  dispose() {
    if (this.isDisposed)
      return;
    this.isDisposed = true;
    for (const [id, pending] of this.pendingAgentCalls.entries()) {
      pending.reject(new A2uiRpcError(`RpcHandler disposed while call '${id}' was pending.`, RpcErrorCode.CANCELLED, id));
    }
    this.pendingAgentCalls.clear();
  }
  /**
   * Sends an outbound renderer response message to the outbound listener.
   *
   * @param response Renderer function response message to transmit.
   */
  async emitOutboundResponse(response) {
    if (this.outboundListener) {
      try {
        const res = this.outboundListener(response);
        if (res && typeof res.catch === "function") {
          await res;
        }
      } catch {
      }
    }
  }
  /**
   * Validates an inbound renderer function call message.
   *
   * @param message Inbound message to validate.
   * @returns An error response if validation fails; otherwise `null`.
   */
  validateInboundMessage(message) {
    if (!message) {
      return this.createResponseError("unknown", RpcErrorCode.INVALID_FUNCTION_CALL, "Inbound message is null or undefined.", "unknown");
    }
    const version = message.version;
    if (this.isDisposed) {
      return this.createResponseError(message.callRendererFunction?.functionCallId ?? "unknown", RpcErrorCode.DISPOSED, "RpcHandler has been disposed.", version);
    }
    if (!message.callRendererFunction?.callFunction) {
      return this.createResponseError(message.callRendererFunction?.functionCallId ?? "unknown", RpcErrorCode.INVALID_FUNCTION_CALL, "Malformed message: missing callRendererFunction or callFunction.", version);
    }
    return null;
  }
  /**
   * Resolves the catalog and function implementation for the requested call.
   *
   * @param catalogId Optional catalog identifier specified in the call.
   * @param call Function name to resolve.
   * @param context Optional data context providing a default surface catalog.
   * @param expectedVersion Optional protocol version to check compatibility against.
   * @returns The resolved function implementation and catalog, or an error descriptor.
   */
  resolveFunctionImplementation(catalogId, call, context, expectedVersion) {
    let catalog;
    if (catalogId) {
      catalog = context?.surface?.availableCatalogs?.get(catalogId) ?? this.catalogs.find((c2) => c2.id === catalogId);
      if (!catalog) {
        return { error: `Catalog not found: ${catalogId}` };
      }
    }
    if (!catalog) {
      return { error: "No catalog available for function resolution." };
    }
    if (catalog.protocolVersion && expectedVersion) {
      if (!isCatalogVersionCompatible(catalog.protocolVersion, expectedVersion)) {
        return {
          error: `Catalog '${catalog.id}' specification version (${catalog.protocolVersion}) does not match message protocol version (${expectedVersion}).`
        };
      }
    }
    const funcImpl = catalog.functions?.get(call);
    if (!funcImpl) {
      return { error: `Function not found: ${call}` };
    }
    return { funcImpl, catalog };
  }
  /**
   * Ensures a valid DataContext is available for dynamic argument resolution and function execution.
   *
   * @param context Optional context supplied by the caller.
   * @param catalog Resolved target catalog.
   * @param functionCallId Function call identifier for fallback surface naming.
   * @returns A DataContext backed by the caller's surface or an isolated empty fallback surface.
   */
  ensureDataContext(context, catalog, functionCallId) {
    if (context instanceof DataContext && context.surface) {
      return context;
    }
    const availableCatalogs = /* @__PURE__ */ new Map();
    for (const cat of this.catalogs) {
      if (catalog.protocolVersion && cat.protocolVersion && isCatalogVersionCompatible(catalog.protocolVersion, cat.protocolVersion)) {
        availableCatalogs.set(cat.id, cat);
      }
    }
    availableCatalogs.set(catalog.id, catalog);
    const fallbackSurface = new SurfaceModel(`_rpc_fallback_${functionCallId || "default"}`, catalog, availableCatalogs);
    return new DataContext(fallbackSurface, "/");
  }
  /**
   * Resolves dynamic values (`@path` bindings and `@call` expressions) inside function arguments.
   *
   * @param args Raw arguments dictionary from the call payload.
   * @param context DataContext used to evaluate dynamic expressions.
   * @param isUserActivated Whether execution occurs in an active user gesture context.
   * @returns The resolved arguments dictionary, or an error descriptor if expression evaluation fails.
   */
  resolveDynamicArguments(args, context, isUserActivated) {
    if (args === void 0 || typeof args !== "object" || args === null || Array.isArray(args)) {
      return { args };
    }
    const resolvedArgs = {};
    let expressionError;
    const errorSub = context.surface?.onError.subscribe((err) => {
      if (!expressionError && err?.code === "EXPRESSION_ERROR") {
        expressionError = err.message || "An error occurred during function execution.";
      }
    });
    try {
      for (const [key, val] of Object.entries(args)) {
        resolvedArgs[key] = context.resolveDynamicValue(val, 0, isUserActivated);
      }
    } catch (err) {
      expressionError = this.extractErrorMessage(err) || "An error occurred during function execution.";
    } finally {
      errorSub?.unsubscribe();
    }
    if (expressionError) {
      return { error: expressionError };
    }
    return { args: resolvedArgs };
  }
  /**
   * Verifies caller boundary permissions and user activation requirements for a function.
   *
   * @param funcImpl Function implementation to inspect.
   * @param call Function name being invoked.
   * @param isUserActivated Whether execution occurs within an active user gesture context.
   * @returns An error message if permissions are not satisfied; otherwise `null`.
   */
  checkExecutionPermissions(funcImpl, call, isUserActivated) {
    const boundary = funcImpl.allowedCallers ?? "rendererOnly";
    const isAllowedCaller = boundary === "rendererOrAgent" || boundary === "agentOnly";
    if (!isAllowedCaller) {
      return `Function '${call}' cannot be called by agent (allowedCallers is ${boundary}).`;
    }
    if (funcImpl.requiresUserActivation && !isUserActivated) {
      return `Function '${call}' requires user activation context to execute.`;
    }
    return null;
  }
  /**
   * Validates and parses function arguments against the catalog function schema.
   *
   * @param catalog Catalog declaring the function.
   * @param _funcImpl Function implementation.
   * @param args Raw argument dictionary.
   * @param call Function name being invoked.
   * @returns Parsed arguments on success, or an error descriptor on validation failure.
   */
  parseArguments(catalog, _funcImpl, args, call) {
    try {
      const parsed = new PayloadValidator(catalog, { allowUnknownElements: false }).validateFunction(call, args);
      return { args: parsed };
    } catch (err) {
      const errMsg = this.extractErrorMessage(err);
      return { error: `Invalid function arguments for '${call}': ${errMsg}` };
    }
  }
  /**
   * Executes a catalog function implementation, catching unhandled exceptions and formatting the response.
   *
   * Unwraps reactive signals and maps any thrown errors to an `EXECUTION_ERROR` response.
   *
   * @param funcImpl Function implementation to execute.
   * @param args Validated function arguments.
   * @param context Data context for function evaluation.
   * @param functionCallId Identifier of the function call.
   * @param version Protocol version for the response message.
   * @returns A promise resolving to the renderer function response message.
   */
  async executeFunctionSafely(funcImpl, args, context, functionCallId, version) {
    const respVersion = version || "v1.0";
    try {
      const rawResult = await Promise.resolve(funcImpl.execute(args, context));
      const unwrapped = isSignal(rawResult) ? getValue(rawResult) : rawResult;
      const value = unwrapped !== void 0 ? unwrapped : null;
      return {
        version: respVersion,
        rendererFunctionResponse: {
          functionCallId,
          value
        }
      };
    } catch (err) {
      const errMsg = this.extractErrorMessage(err);
      return {
        version: respVersion,
        rendererFunctionResponse: {
          functionCallId,
          error: {
            code: RpcErrorCode.EXECUTION_ERROR,
            message: errMsg || "An error occurred during function execution."
          }
        }
      };
    }
  }
  /**
   * Generates a unique function call identifier.
   *
   * @returns A unique call identifier string.
   */
  generateFunctionCallId() {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    const randSuffix = Math.random().toString(36).substring(2, 15).padEnd(13, "0");
    return `call-${Date.now()}-${randSuffix}`;
  }
  /**
   * Dispatches an outbound agent function call and registers a pending promise with timeout handling.
   *
   * @template T Expected return value type.
   * @param surfaceId Identifier of the surface initiating the call.
   * @param callInfo Normalized agent call parameters.
   * @returns A promise resolving to the agent function return value.
   */
  dispatchAgentCall(surfaceId, callInfo) {
    const { functionCallId, call, effectiveTimeoutMs, version } = callInfo;
    return new Promise((resolve3, reject) => {
      let timer;
      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = void 0;
        }
        this.pendingAgentCalls.delete(functionCallId);
      };
      const callName = (call["@call"] ?? call.call) || "unknown";
      timer = this.createTimeoutTimer(functionCallId, callName, effectiveTimeoutMs, cleanup, reject);
      this.pendingAgentCalls.set(functionCallId, {
        resolve: (val) => {
          cleanup();
          resolve3(val);
        },
        reject: (err) => {
          cleanup();
          reject(err);
        }
      });
      this.sendOutboundMessage(surfaceId, functionCallId, call, version, cleanup, reject);
    });
  }
  /**
   * Creates a timeout timer for a pending agent function call.
   *
   * @param functionCallId Identifier of the pending function call.
   * @param callName Name of the function being called.
   * @param timeoutMs Duration in milliseconds before timeout expiry.
   * @param cleanup Teardown callback to invoke when the timer fires.
   * @param reject Rejection callback to reject the pending promise with a `TIMEOUT` error.
   * @returns The timer handle, or `undefined` if timeout is disabled.
   */
  createTimeoutTimer(functionCallId, callName, timeoutMs, cleanup, reject) {
    if (timeoutMs <= 0)
      return void 0;
    return setTimeout(() => {
      if (this.pendingAgentCalls.delete(functionCallId)) {
        cleanup();
        reject(new A2uiRpcError(`Agent function call '${callName}' timed out after ${timeoutMs}ms.`, RpcErrorCode.TIMEOUT, functionCallId));
      }
    }, timeoutMs);
  }
  /**
   * Transmits an outbound callAgentFunction message to the registered outbound listener.
   *
   * @param surfaceId Identifier of the surface initiating the call.
   * @param functionCallId Identifier of the function call.
   * @param call Function call specification.
   * @param version Optional protocol version string.
   * @param cleanup Teardown callback invoked on failure.
   * @param reject Rejection callback invoked if transmission throws or rejects.
   */
  sendOutboundMessage(surfaceId, functionCallId, call, version, cleanup, reject) {
    const outboundMsg = {
      version: version || "v1.0",
      callAgentFunction: {
        surfaceId,
        functionCallId,
        callFunction: call
      }
    };
    try {
      const result = this.outboundListener(outboundMsg);
      if (result && typeof result.catch === "function") {
        result.catch((err) => {
          cleanup();
          reject(err);
        });
      }
    } catch (err) {
      cleanup();
      reject(err);
    }
  }
  /**
   * Extracts a human-readable message string from an unknown error value.
   *
   * @param err Unknown error caught in a try/catch block.
   * @returns Formatted error message string.
   */
  extractErrorMessage(err) {
    return err instanceof Error ? err.message : String(err);
  }
  /**
   * Constructs a renderer function error response message.
   *
   * @param functionCallId Identifier of the function call that failed.
   * @param code RPC error code or string category.
   * @param message Human-readable error description.
   * @param version Protocol version string.
   * @returns Formatted renderer function response message containing the error.
   */
  createResponseError(functionCallId, code, message, version) {
    return {
      version: version || "v1.0",
      rendererFunctionResponse: {
        functionCallId,
        error: { code, message }
      }
    };
  }
};

// ../../node_modules/.pnpm/@a2ui+web_core@0.14.0/node_modules/@a2ui/web_core/src/processing/message-processor.js
var MessageProcessor = class {
  /**
   * Initializes a new `MessageProcessor` instance.
   *
   * The processor works with copies of `catalogs` linked to each other, so
   * that cross-catalog `$ref`s resolve (see `linkCatalogs`); the catalogs
   * passed in are not changed.
   *
   * @param catalogs List of available component catalogs.
   * @param actionHandler Global handler for actions dispatched from all surfaces.
   * @param options Configuration options for the processor.
   */
  constructor(catalogs, actionHandler, options) {
    this.actionHandler = actionHandler;
    this.catalogs = linkCatalogs(catalogs);
    this.model = new SurfaceGroupModel();
    this.adapterRegistry = options?.adapterRegistry ?? defaultVersionAdapterFactory;
    this.rpc = new RpcHandler({
      catalogs: this.catalogs,
      outboundListener: options?.outboundListener,
      defaultTimeoutMs: options?.defaultTimeoutMs
    });
    if (options?.validationConfig) {
      this.validationConfig = {
        allowOrphanComponents: false,
        allowDanglingReferences: false,
        allowMissingRoot: false,
        allowUnknownElements: false,
        ...options.validationConfig
      };
    } else {
      this.validationConfig = void 0;
    }
    if (this.actionHandler) {
      this.model.onAction.subscribe(this.actionHandler);
    }
  }
  /**
   * Invokes a remote function on the server agent using an options bag.
   *
   * @param surfaceId The ID of the surface requesting execution.
   * @param call The function call details.
   * @param options Optional invocation options (custom functionCallId, timeoutMs).
   * @returns A promise resolving to the agent function return value.
   */
  callAgentFunction(surfaceId, call, options) {
    return this.rpc.callAgentFunction(surfaceId, call, options);
  }
  /**
   * Disposes the MessageProcessor, tearing down active surfaces and rejecting pending RPC calls.
   */
  dispose() {
    this.rpc.dispose();
  }
  /**
   * Generates the renderer capabilities object for the current processor.
   *
   * @param options Configuration for capability generation.
   * @returns The capabilities object.
   */
  getRendererCapabilities(options) {
    if (!options?.versions || options.versions.length === 0) {
      throw new A2uiValidationError("At least one protocol version must be provided in CapabilitiesOptions to generate renderer capabilities.");
    }
    const versions = options.versions;
    const result = {};
    for (const ver of versions) {
      const versionCaps = {
        supportedCatalogIds: this.catalogs.map((c2) => c2.id)
      };
      const inlineCatalogs = options?.includeInlineCatalogs ? this.catalogs.map((c2) => {
        if (compareSemVer(ver, "1.0") >= 0) {
          return this.generateInlineCatalog(c2);
        }
        return this.generateLegacyInlineCatalog(c2, options?.componentEnvelopeRef ?? "common_types.json#/$defs/ComponentCommon");
      }) : void 0;
      if (inlineCatalogs) {
        versionCaps.inlineCatalogs = inlineCatalogs;
      }
      result[ver] = versionCaps;
    }
    return result;
  }
  /**
   * Generates the client/renderer capabilities object for the current processor.
   *
   * @deprecated Use `getRendererCapabilities` instead.
   * @param options Configuration for capability generation.
   * @returns The capabilities object.
   */
  getClientCapabilities(options) {
    return this.getRendererCapabilities(options);
  }
  /**
   * Generates a v1.0 inline catalog: the catalog's `toJson()` document with the
   * `catalogId` and bare semantic version `protocolVersion` that
   * `catalog_definition.json` requires, whatever the source document declared.
   *
   * @param catalog The catalog instance to serialize.
   * @returns The inline catalog document.
   */
  generateInlineCatalog(catalog) {
    const doc = catalog.toJson();
    doc.catalogId = catalog.id;
    const version = typeof doc.protocolVersion === "string" ? doc.protocolVersion : toCanonicalVersion(catalog.protocolVersion) ?? catalog.protocolVersion;
    doc.protocolVersion = version.trim().replace(/^[vV](?=\d)/, "");
    return doc;
  }
  /**
   * Generates a backwards-compatible inline catalog representation for v0.8/v0.9/v0.9.1.
   *
   * @param catalog The catalog instance to serialize.
   * @param componentEnvelopeRef Reference URI for the component base envelope.
   * @returns Legacy inline catalog object with array-based functions and flat theme properties.
   */
  generateLegacyInlineCatalog(catalog, componentEnvelopeRef = "common_types.json#/$defs/ComponentCommon") {
    const components = {};
    for (const [name, comp] of catalog.components.entries()) {
      let props = {};
      let reqList = [];
      if (comp.schema && typeof comp.schema === "object" && "safeParse" in comp.schema) {
        const rawZod = zodToJsonSchema(comp.schema, {
          target: "jsonSchema2019-09",
          $refStrategy: "none"
        });
        cleanSchemaNode(rawZod, void 0, { stripAdditionalProperties: true });
        props = rawZod.properties || {};
        reqList = Array.isArray(rawZod.required) ? rawZod.required.filter((r2) => r2 !== "component" && r2 !== "id") : [];
      }
      const { component: _ignoredComp, id: _ignoredId, ...sanitizedProps } = props;
      components[name] = {
        allOf: [
          { $ref: componentEnvelopeRef },
          {
            properties: {
              component: { const: name },
              ...sanitizedProps
            },
            required: ["component", ...reqList]
          }
        ]
      };
    }
    const functions = [];
    for (const fn of catalog.functions.values()) {
      let paramSchema = { type: "object", properties: {} };
      if (fn.schema && typeof fn.schema === "object" && "safeParse" in fn.schema) {
        const rawZod = zodToJsonSchema(fn.schema, {
          target: "jsonSchema2019-09",
          $refStrategy: "none"
        });
        cleanSchemaNode(rawZod, void 0, { stripAdditionalProperties: true });
        paramSchema = rawZod;
      }
      functions.push({
        name: fn.name,
        ...fn.description ? { description: fn.description } : {},
        returnType: fn.returnType,
        parameters: paramSchema
      });
    }
    let theme;
    if (catalog.themeSchema) {
      const rawTheme = zodToJsonSchema(catalog.themeSchema, {
        target: "jsonSchema2019-09",
        $refStrategy: "none"
      });
      cleanSchemaNode(rawTheme, void 0, { stripAdditionalProperties: true });
      theme = rawTheme.properties || void 0;
    }
    return {
      catalogId: catalog.id,
      ...Object.keys(components).length > 0 ? { components } : {},
      ...functions.length > 0 ? { functions } : {},
      ...theme ? { theme } : {}
    };
  }
  /**
   * Serializes active surface data models configured for client-to-agent reporting.
   *
   * If version is provided, returns data models only for surfaces compatible with that version.
   * If version is omitted:
   *   - Automatically derives the protocol version from the active surface(s) with sendDataModel.
   *   - If active surfaces have conflicting protocol versions, throws A2uiValidationError.
   *
   * @param version Optional target protocol version to filter surfaces.
   * @returns Serialized data model payload, or undefined if no matching surfaces exist.
   */
  getRendererDataModel(version) {
    const enabledSurfaces = Array.from(this.model.surfacesMap.values()).filter((s2) => s2.sendDataModel);
    if (enabledSurfaces.length === 0) {
      return void 0;
    }
    if (version !== void 0) {
      const surfaces2 = {};
      for (const surface of enabledSurfaces) {
        const catVer = surface.protocolVersion;
        if (!catVer || isCatalogVersionCompatible(catVer, version)) {
          surfaces2[surface.id] = surface.dataModel.get("/");
        }
      }
      if (Object.keys(surfaces2).length === 0) {
        return void 0;
      }
      return {
        version,
        surfaces: surfaces2
      };
    }
    const versionsSet = /* @__PURE__ */ new Set();
    for (const surface of enabledSurfaces) {
      if (surface.protocolVersion) {
        const canonical = toCanonicalVersion(surface.protocolVersion);
        const canonicalVer = canonical ? `v${canonical}` : surface.protocolVersion;
        versionsSet.add(canonicalVer);
      }
    }
    if (versionsSet.size > 1) {
      throw new A2uiValidationError(`Multiple protocol versions detected among active surfaces: ${Array.from(versionsSet).sort().join(", ")}. Specify a target protocol version in getRendererDataModel(version).`);
    }
    const verStr = versionsSet.size === 1 ? versionsSet.values().next().value : "v1.0";
    const surfaces = {};
    for (const surface of enabledSurfaces) {
      surfaces[surface.id] = surface.dataModel.get("/");
    }
    return {
      version: verStr,
      surfaces
    };
  }
  /**
   * Aggregates active client/renderer data models.
   *
   * @deprecated Use `getRendererDataModel` instead.
   * @param version Optional target protocol version to format data models for.
   * @returns Serialized data model payload, or undefined if no matching surfaces exist.
   */
  getClientDataModel(version) {
    return this.getRendererDataModel(version);
  }
  /**
   * Resolves a relative path against a context path.
   *
   * @deprecated Use `DataModel.resolvePath` instead.
   * @param path The path to resolve.
   * @param contextPath The base path (optional).
   * @returns The resolved absolute path.
   */
  resolvePath(path, contextPath) {
    return DataModel.resolvePath(path, contextPath);
  }
  /**
   * Gets a read-only map of active surfaces managed by this processor.
   *
   * @returns Map of surface models keyed by surface identifier.
   */
  getSurfaces() {
    return this.model.surfacesMap;
  }
  /**
   * Retrieves an active surface by its ID.
   *
   * @param id The surface ID.
   * @returns The matching surface model, or undefined if not found.
   */
  getSurface(id) {
    return this.model.getSurface(id);
  }
  /**
   * Subscribes to surface creation events.
   *
   * @param handler Callback invoked when a surface is created.
   * @returns A subscription object to unsubscribe.
   */
  onSurfaceCreated(handler) {
    return this.model.onSurfaceCreated.subscribe(handler);
  }
  /**
   * Subscribes to surface deletion events.
   *
   * @param handler Callback invoked when a surface is deleted.
   * @returns A subscription object to unsubscribe.
   */
  onSurfaceDeleted(handler) {
    return this.model.onSurfaceDeleted.subscribe(handler);
  }
  /**
   * Processes a list of messages, a message wrapper, or raw operations synchronously.
   *
   * @param messages The messages or operations to process.
   * @param context Contextual execution options.
   */
  processMessages(messages, context) {
    const operations = this.prepareOperations(messages);
    for (const op of operations) {
      this.processOperation(op, context);
    }
  }
  /**
   * Asynchronously processes messages, executing RPC calls and returning all produced responses.
   *
   * @param messages The messages or operations to process.
   * @param context Contextual execution options.
   * @returns Array of rendererFunctionResponse messages produced during execution.
   */
  async processMessagesAsync(messages, context) {
    const operations = this.prepareOperations(messages);
    const responses = [];
    for (const op of operations) {
      const resp = await this.processOperationAsync(op, context);
      if (resp) {
        responses.push(resp);
      }
    }
    return responses;
  }
  prepareOperations(messages) {
    if (!messages || Array.isArray(messages) && messages.length === 0)
      return [];
    if (this.validationConfig) {
      validateRecursionAndPaths(messages);
    }
    if (this.validationConfig?.targetVersion) {
      this.validateTargetVersion(messages);
    }
    if (isInternalOperation(messages)) {
      return [messages];
    }
    const adapter = this.adapterRegistry.resolveFromPayload(messages);
    return adapter.extractOperations(messages);
  }
  validateTargetVersion(messages) {
    const expected = this.validationConfig?.targetVersion;
    if (!expected)
      return;
    const checkMsg = (msg) => {
      if (typeof msg === "object" && msg !== null && "version" in msg) {
        const msgVer = msg.version;
        if (msgVer) {
          const normMsg = toCanonicalVersion(msgVer) ?? msgVer;
          const normExpected = toCanonicalVersion(expected) ?? expected;
          if (normMsg !== normExpected) {
            throw new A2uiValidationError(`Message version '${msgVer}' does not match expected target version '${expected}'`);
          }
        }
      }
    };
    if (Array.isArray(messages)) {
      for (const m2 of messages) {
        checkMsg(m2);
      }
    } else {
      checkMsg(messages);
    }
  }
  applyStateOperation(op) {
    if (this.validationConfig?.allowedMessages && !this.validationConfig.allowedMessages.includes(op.type)) {
      throw new A2uiValidationError(`Operation '${op.type}' is not permitted by ValidationConfig.allowedMessages`);
    }
    switch (op.type) {
      case "createSurface":
        this.processCreateSurfaceOp(op);
        break;
      case "deleteSurface":
        this.processDeleteSurfaceOp(op);
        break;
      case "updateComponents":
        this.processUpdateComponentsOp(op);
        break;
      case "updateDataModel":
        this.processUpdateDataModelOp(op);
        break;
      case "agentFunctionResponse":
        this.rpc.handleAgentFunctionResponse({
          version: op.version ?? "v1.0",
          agentFunctionResponse: {
            functionCallId: op.functionCallId,
            value: op.value,
            error: op.error
          }
        });
        break;
      case "callRendererFunction":
        break;
    }
  }
  /**
   * Resolves the DataContext for an inbound RPC callRendererFunction operation.
   *
   * @param op Operation containing optional surface, catalog, and function call identifiers.
   * @returns A DataContext attached to the requested surface, an isolated fallback surface when surfaceId is omitted, or undefined if surfaceId is not found.
   */
  resolveRpcDataContext(op) {
    if (op.surfaceId !== void 0) {
      const surface = this.model.surfacesMap.get(op.surfaceId);
      return surface ? new DataContext(surface, "/") : void 0;
    }
    const targetCatalog = op.catalogId ? this.catalogs.find((c2) => c2.id === op.catalogId) : void 0;
    if (!targetCatalog) {
      return void 0;
    }
    const fallbackSurfaceId = `_rpc_fallback_${op.functionCallId || "default"}`;
    const availableCatalogs = /* @__PURE__ */ new Map();
    for (const cat of this.catalogs) {
      if (targetCatalog?.protocolVersion && cat.protocolVersion && isCatalogVersionCompatible(targetCatalog.protocolVersion, cat.protocolVersion)) {
        availableCatalogs.set(cat.id, cat);
      }
    }
    if (targetCatalog) {
      availableCatalogs.set(targetCatalog.id, targetCatalog);
    }
    return new DataContext(new SurfaceModel(fallbackSurfaceId, targetCatalog, availableCatalogs), "/");
  }
  /**
   * Processes a single canonical internal operation.
   *
   * @param op The internal operation to execute.
   * @param context Contextual execution options.
   */
  processOperation(op, context) {
    if (op.type === "callRendererFunction") {
      const dataContext = this.resolveRpcDataContext(op);
      const isUserActivated = context?.isUserActivated ?? op.isUserActivated ?? false;
      const callMsg = {
        version: op.version ?? "v1.0",
        callRendererFunction: {
          ...op.surfaceId !== void 0 ? { surfaceId: op.surfaceId } : {},
          functionCallId: op.functionCallId,
          callFunction: {
            call: op.call,
            catalogId: op.catalogId,
            args: op.args
          }
        }
      };
      void this.rpc.handleCallRendererFunction(callMsg, dataContext, isUserActivated).catch((err) => {
        console.error(`Unhandled error in callRendererFunction (${op.call}):`, err);
      });
      return;
    }
    this.applyStateOperation(op);
  }
  async processOperationAsync(op, context) {
    if (op.type === "callRendererFunction") {
      const dataContext = this.resolveRpcDataContext(op);
      const isUserActivated = context?.isUserActivated ?? op.isUserActivated ?? false;
      const callMsg = {
        version: op.version ?? "v1.0",
        callRendererFunction: {
          ...op.surfaceId !== void 0 ? { surfaceId: op.surfaceId } : {},
          functionCallId: op.functionCallId,
          callFunction: {
            call: op.call,
            catalogId: op.catalogId,
            args: op.args
          }
        }
      };
      return await this.rpc.handleCallRendererFunction(callMsg, dataContext, isUserActivated);
    }
    this.applyStateOperation(op);
    return null;
  }
  processCreateSurfaceOp(op) {
    const { surfaceId, catalogId, theme, sendDataModel, components, dataModel } = op;
    const msgVersion = op.version;
    const noDefaultCatalog = catalogId === void 0 && msgVersion !== void 0 && isAtLeastVersion(msgVersion, "1.0");
    const catalog = noDefaultCatalog ? void 0 : resolveSurfaceDefaultCatalog(this.catalogs, catalogId, msgVersion);
    if (!catalog && !noDefaultCatalog) {
      if (catalogId !== void 0) {
        throw new A2uiCatalogError(`Catalog not found: ${catalogId}`);
      }
      throw new A2uiCatalogError(`No default catalog available for surface '${surfaceId}'.`);
    }
    if (catalog?.protocolVersion && msgVersion && !isCatalogVersionCompatible(catalog.protocolVersion, msgVersion)) {
      throw new A2uiValidationError(`Surface '${surfaceId}' catalog '${catalogId ?? catalog.id}' specification version (${catalog.protocolVersion}) does not match message protocol version (${msgVersion}).`);
    }
    if (this.model.getSurface(surfaceId)) {
      throw new A2uiIntegrityError(`Surface ${surfaceId} already exists.`);
    }
    let validatedTheme = theme;
    if (theme && catalog?.themeSchema) {
      try {
        validatedTheme = new PayloadValidator(catalog, this.validationConfig).validateTheme(theme);
      } catch (err) {
        if (err instanceof A2uiValidationError) {
          throw new A2uiValidationError(err.message.replace(/^Validation failed for theme:/, `Validation failed for theme on surface '${surfaceId}':`), err.details);
        }
        throw err;
      }
    }
    const surfaceVersion = catalog?.protocolVersion ?? msgVersion;
    const availableCatalogs = new Map(this.catalogs.filter((c2) => isCatalogVersionCompatible(c2.protocolVersion, surfaceVersion)).map((c2) => [c2.id, c2]));
    const surface = new SurfaceModel(surfaceId, catalog, availableCatalogs, validatedTheme, sendDataModel ?? false, void 0, op.rootId ?? "root", op.metadata, surfaceVersion);
    this.model.addSurface(surface);
    if (dataModel) {
      surface.dataModel.set("/", dataModel);
    }
    if (components && components.length > 0) {
      this.processUpdateComponentsOp({
        type: "updateComponents",
        surfaceId,
        components
      });
    }
  }
  processDeleteSurfaceOp(op) {
    if (!op.surfaceId)
      return;
    this.model.deleteSurface(op.surfaceId);
  }
  validateComponentProperties(comp, surface) {
    const { id, component } = comp;
    if (typeof id !== "string" || !id) {
      throw new A2uiValidationError(`Component '${component}' is missing an 'id'; entries require a valid string 'id'.`);
    }
    const targetCatalog = this.resolveComponentCatalog(comp, surface);
    const existing = surface.componentsModel.get(id);
    new PayloadValidator(targetCatalog, this.validationConfig).validateComponent(this.componentPayloadForValidation(comp, surface, targetCatalog), existing?.type);
    this.validateNestedFunctionCalls(comp, surface, targetCatalog);
  }
  /**
   * Builds the component payload handed to `PayloadValidator`, telling it
   * which catalog the component is in.
   *
   * From v1.0 a function call that names no `catalogId` runs in the surface
   * default catalog. The validator takes a component that names no
   * `catalogId` to be in the surface default, so the payload names the
   * component's catalog only when that catalog is another one; the validator
   * then leaves those calls to `validateNestedFunctionCalls`, which checks
   * them against the surface default. Whether the payload itself wrote a
   * `catalogId` doesn't matter: a component naming the surface default is in
   * it all the same.
   *
   * @param comp Raw component payload.
   * @param surface Surface the component belongs to.
   * @param componentCatalog Catalog the component resolved to.
   * @returns The payload to validate.
   */
  componentPayloadForValidation(comp, surface, componentCatalog) {
    const { catalogId: _catalogId, ...payload } = comp;
    if (isAtLeastVersion(surface.protocolVersion, "1.0") && componentCatalog !== surface.defaultCatalog) {
      payload["catalogId"] = componentCatalog.id;
    }
    return payload;
  }
  /**
   * Resolves the catalog that defines a component in an update.
   *
   * The component uses the catalog it names, and otherwise the surface's
   * default catalog. Below v1.0 only, an existing component updated without a
   * new type keeps its catalog; from v1.0 every update is a full replacement
   * and resolves afresh.
   *
   * @param comp Raw component payload.
   * @param surface Surface the component belongs to.
   * @returns The catalog that defines the component.
   * @throws {A2uiCatalogError} If the named catalog is unknown or speaks an
   *   incompatible protocol version, or if the component names no catalog and
   *   the surface has no default catalog.
   */
  resolveComponentCatalog(comp, surface) {
    const { id, component, catalogId } = comp;
    const subject = `Component '${id}'`;
    const atLeastV1 = isAtLeastVersion(surface.protocolVersion, "1.0");
    if (typeof catalogId === "string" && (catalogId || atLeastV1)) {
      return this.resolveSurfaceItemCatalog(surface, catalogId, subject);
    }
    if (!atLeastV1) {
      const existing = typeof id === "string" ? surface.componentsModel.get(id) : void 0;
      if (existing && (typeof component !== "string" || !component || component === existing.type)) {
        return existing.catalog;
      }
    }
    return this.resolveSurfaceItemCatalog(surface, void 0, subject);
  }
  /**
   * Validates each v1.0 function call nested in a component against the
   * catalog it resolves to on the surface.
   *
   * Each call resolves on its own, by the `catalogId` it names or else to
   * the surface's default catalog, whatever catalog an enclosing call or the
   * component names, so a call may run in a catalog other than the
   * component's. This pass resolves every call's catalog and checks the
   * arguments of the calls that run outside the component's catalog;
   * component validation, which runs first and walks every nested call, has
   * already checked the others, as decided by `nestedCallRunsInCatalog`.
   * Reserved `@` system functions belong to no catalog and are validated by
   * `PayloadValidator`; their arguments are still walked here.
   *
   * Catalog resolution runs even without a `validationConfig`, so a call no
   * catalog on the surface can run is always rejected before state changes.
   *
   * @param comp Raw component payload.
   * @param surface Surface the component belongs to.
   * @param componentCatalog Catalog the component resolved to.
   * @throws {A2uiCatalogError} If a call's catalog cannot be resolved.
   * @throws {A2uiValidationError} If a call fails validation against the
   *   catalog it resolves to.
   */
  validateNestedFunctionCalls(comp, surface, componentCatalog) {
    if (!isAtLeastVersion(surface.protocolVersion, "1.0"))
      return;
    const visit = (node) => {
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (typeof node !== "object" || node === null)
        return;
      const record = node;
      const name = record["@call"];
      if (typeof name === "string" && !name.startsWith("@")) {
        const rawCatalogId = record["catalogId"];
        if (rawCatalogId !== void 0 && typeof rawCatalogId !== "string") {
          throw new A2uiValidationError(nonStringCatalogIdMessage(name));
        }
        const catalogId = rawCatalogId;
        const target = this.resolveSurfaceItemCatalog(surface, catalogId, `Function call '${name}'`);
        const checked = nestedCallRunsInCatalog(catalogId, componentCatalog.id, {
          catalogIsDefault: componentCatalog === surface.defaultCatalog
        });
        if (!checked) {
          const rawArgs = record["args"];
          new PayloadValidator(target, this.validationConfig).validateFunction(name, rawArgs ?? {});
        }
      }
      Object.values(record).forEach(visit);
    };
    for (const [key, value] of Object.entries(comp)) {
      if (key === "id" || key === "component" || key === "catalogId" || key === "metadata") {
        continue;
      }
      visit(value);
    }
  }
  /**
   * Resolves the catalog an item on a surface uses: the catalog it names, or
   * else the surface's default catalog.
   *
   * Delegates to `SurfaceModel.resolveCatalog`, which `DataContext` also uses
   * at runtime, so validation and execution share one rule and one set of
   * error messages. It first reports a catalog the processor knows yet the
   * surface cannot use because its protocol version differs.
   *
   * @param surface Surface the item belongs to.
   * @param catalogId Catalog the item names, if any.
   * @param subject Description of the item for error messages.
   * @returns The catalog the item resolves to.
   * @throws {A2uiCatalogError} If the item's catalog cannot be resolved.
   */
  resolveSurfaceItemCatalog(surface, catalogId, subject) {
    if (catalogId !== void 0 && !surface.availableCatalogs.has(catalogId)) {
      const known = this.catalogs.find((c2) => c2.id === catalogId);
      if (known) {
        throw new A2uiCatalogError(`${subject} names catalog '${catalogId}', whose specification version (${known.protocolVersion}) does not match surface '${surface.id}' version (${surface.protocolVersion}).`);
      }
    }
    return surface.resolveCatalog(catalogId, subject);
  }
  applyComponentUpdate(comp, surface) {
    const { id, component, catalogId: _catalogId, metadata: rawMetadata, ...properties } = comp;
    if (typeof id !== "string")
      return;
    const metadata = extractComponentMetadata(rawMetadata);
    const targetCatalog = this.resolveComponentCatalog(comp, surface);
    const existing = surface.componentsModel.get(id);
    if (existing) {
      const componentType = typeof component === "string" ? component : existing.type;
      if (componentType !== existing.type || existing.catalog.id !== targetCatalog.id) {
        surface.componentsModel.removeComponent(id);
        const newComponent = new ComponentModel(id, componentType, properties, targetCatalog, metadata);
        surface.componentsModel.addComponent(newComponent);
      } else {
        existing.metadata = metadata;
        existing.properties = properties;
      }
    } else {
      if (typeof component !== "string" || !component) {
        throw new A2uiValidationError(`Cannot create component ${id} without a type.`);
      }
      const newComponent = new ComponentModel(id, component, properties, targetCatalog, metadata);
      surface.componentsModel.addComponent(newComponent);
    }
  }
  processUpdateComponentsOp(op) {
    if (!op.surfaceId)
      return;
    const surface = this.model.getSurface(op.surfaceId);
    if (!surface) {
      throw new A2uiIntegrityError(`Surface not found for message: ${op.surfaceId}`);
    }
    const seenBatchIds = /* @__PURE__ */ new Set();
    for (const comp of op.components) {
      if (comp && typeof comp === "object" && typeof comp.id === "string") {
        if (seenBatchIds.has(comp.id)) {
          throw new A2uiIntegrityError(`Duplicate component ID: '${comp.id}'`, [comp.id]);
        }
        seenBatchIds.add(comp.id);
      }
      this.validateComponentProperties(comp, surface);
    }
    this.validateCompositionConstraints(surface, op.components);
    this.validateCandidateTopology(surface, op.components);
    for (const comp of op.components) {
      this.applyComponentUpdate(comp, surface);
    }
  }
  processUpdateDataModelOp(op) {
    if (!op.surfaceId)
      return;
    const surface = this.model.getSurface(op.surfaceId);
    if (!surface) {
      throw new A2uiIntegrityError(`Surface not found for message: ${op.surfaceId}`);
    }
    const path = op.path || "/";
    const value = op.value;
    surface.dataModel.set(path, value);
  }
  validateParentConstraints(id, componentType, allowedParents, parents) {
    if (!parents || parents.length === 0) {
      const isRoot = id === "root";
      const enforceTopLevel = isRoot || this.validationConfig && this.validationConfig.allowOrphanComponents === false;
      if (enforceTopLevel && !allowedParents.includes("Surface")) {
        throw new A2uiValidationError(`Component '${id}' (${componentType}) cannot be placed under parent 'Surface' (Surface). Allowed parents: ${JSON.stringify(allowedParents)}.`, void 0, "UNALLOWED_PARENT");
      }
      return;
    }
    for (const parentInfo of parents) {
      if (!allowedParents.includes(parentInfo.parentType)) {
        throw new A2uiValidationError(`Component '${id}' (${componentType}) cannot be placed under parent '${parentInfo.parentId}' (${parentInfo.parentType || "unknown"}). Allowed parents: ${JSON.stringify(allowedParents)}.`, void 0, "UNALLOWED_PARENT");
      }
    }
  }
  validateChildConstraints(id, componentType, allowedChildren, children, typeMap) {
    for (const childId of children) {
      const childType = typeMap.get(childId);
      if (childType && !allowedChildren.includes(childType)) {
        throw new A2uiValidationError(`Container '${id}' (${componentType}) cannot contain child '${childId}' (${childType}). Allowed children: ${JSON.stringify(allowedChildren)}.`, void 0, "UNALLOWED_CHILD");
      }
    }
  }
  buildCompositionTopology(surface, newComponents) {
    const typeMap = /* @__PURE__ */ new Map();
    const compCatalogMap = /* @__PURE__ */ new Map();
    const childMap = /* @__PURE__ */ new Map();
    for (const [id, model] of surface.componentsModel.entries) {
      typeMap.set(id, model.type);
      compCatalogMap.set(id, model.catalog);
      const children = surface.componentsModel.getChildIds(id);
      if (children.length > 0) {
        childMap.set(id, children);
      }
    }
    for (const comp of newComponents) {
      const { id, component, ...props } = comp;
      if (typeof id !== "string")
        continue;
      const compCatalog = this.resolveComponentCatalog(comp, surface);
      compCatalogMap.set(id, compCatalog);
      const existing = surface.componentsModel.get(id);
      const compType = (typeof component === "string" ? component : existing?.type) ?? "";
      if (compType) {
        typeMap.set(id, compType);
      }
      const compDef = { id, component: compType, ...props };
      const children = Array.from(getComponentReferences(compDef, compCatalog)).map(([childId]) => childId);
      if (children.length > 0) {
        childMap.set(id, children);
      } else {
        childMap.delete(id);
      }
    }
    const parentMap = /* @__PURE__ */ new Map();
    for (const [parentId, children] of childMap.entries()) {
      const parentType = typeMap.get(parentId) || "Unknown";
      for (const childId of children) {
        const parents = parentMap.get(childId) ?? [];
        parents.push({ parentId, parentType });
        parentMap.set(childId, parents);
      }
    }
    return { typeMap, compCatalogMap, childMap, parentMap };
  }
  validateCompositionConstraints(surface, newComponents) {
    const { typeMap, compCatalogMap, childMap, parentMap } = this.buildCompositionTopology(surface, newComponents);
    for (const [id, componentType] of typeMap.entries()) {
      const compCatalog = compCatalogMap.get(id);
      const componentApi = compCatalog?.components.get(componentType);
      if (!componentApi)
        continue;
      if (componentApi.allowedParents && componentApi.allowedParents.length > 0) {
        this.validateParentConstraints(id, componentType, componentApi.allowedParents, parentMap.get(id));
      }
      if (componentApi.allowedChildren && componentApi.allowedChildren.length > 0) {
        this.validateChildConstraints(id, componentType, componentApi.allowedChildren, childMap.get(id) || [], typeMap);
      }
    }
  }
  validateCandidateTopology(surface, newComponents) {
    if (!this.validationConfig)
      return;
    const candidateModel = new SurfaceComponentsModel(surface.defaultCatalog);
    for (const [id, comp] of surface.componentsModel.entries) {
      candidateModel.addComponent(new ComponentModel(id, comp.type, comp.properties, comp.catalog));
    }
    for (const comp of newComponents) {
      const { id, component, ...properties } = comp;
      if (typeof id !== "string" || !id)
        continue;
      const targetCatalog = this.resolveComponentCatalog(comp, surface);
      delete properties.catalogId;
      delete properties.metadata;
      const existing = candidateModel.get(id);
      const componentType = (typeof component === "string" ? component : existing?.type) || "";
      if (!componentType)
        continue;
      if (existing) {
        if (componentType !== existing.type || existing.catalog.id !== targetCatalog.id) {
          candidateModel.removeComponent(id);
          candidateModel.addComponent(new ComponentModel(id, componentType, properties, targetCatalog));
        } else {
          existing.properties = properties;
        }
      } else {
        candidateModel.addComponent(new ComponentModel(id, componentType, properties, targetCatalog));
      }
    }
    candidateModel.validateTopology({
      ...this.validationConfig,
      rootId: this.validationConfig.rootId ?? surface.rootId
    });
  }
};
function extractComponentMetadata(rawMetadata) {
  if (rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)) {
    return rawMetadata;
  }
  return void 0;
}
function resolveSurfaceDefaultCatalog(catalogs, catalogId, msgVersion) {
  if (catalogId !== void 0) {
    return catalogs.find((c2) => c2.id === catalogId);
  }
  return catalogs.find((c2) => msgVersion ? isCatalogVersionCompatible(c2.protocolVersion, msgVersion) : true) ?? catalogs[0];
}

// ../sdk/js/dist/a2ui/validator.js
var CATALOG_VERSION = "0.9";
var MESSAGE_VERSION = "v0.9";
var SURFACE_OPERATIONS = ["updateComponents", "updateDataModel"];
var MESSAGE_TYPES = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"];
var isObject5 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var categoryOf = (error) => error instanceof A2uiRecursionError ? "RecursionError" : error instanceof A2uiIntegrityError ? "IntegrityError" : "ValidationError";
var messageOf2 = (error) => error instanceof Error ? error.message : String(error);
var isZodIssue = (value) => isObject5(value) && Array.isArray(value.path) && typeof value.message === "string";
function issueText(issue) {
  const label = `${issue.path.length > 0 ? issue.path.join(".") : "root"}: `;
  const parts = formatZodIssue(issue).split("; ").map((part) => part.startsWith(label) ? part.slice(label.length) : part);
  return [...new Set(parts)].join("; ");
}
function callPath(value, name, at = "") {
  if (Array.isArray(value)) {
    for (const [i2, item] of value.entries()) {
      const found = callPath(item, name, `${at}/${i2}`);
      if (found !== void 0)
        return found;
    }
    return void 0;
  }
  if (!isObject5(value))
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
  const ajv5 = new import__3.Ajv2020({ allErrors: true, strict: false, validateFormats: false });
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
      return [{ category: "ValidationError", message: `the catalog does not load: ${messageOf2(error)}` }];
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
      if (!isObject5(message)) {
        findings.push({ category: "ValidationError", path: base, message: "a message must be an object" });
        return;
      }
      const create = message.createSurface;
      if (isObject5(create) && typeof create.surfaceId === "string") {
        created.set(create.surfaceId, typeof create.catalogId === "string" ? create.catalogId : ownId);
      }
      for (const operation of SURFACE_OPERATIONS) {
        const op = message[operation];
        if (isObject5(op) && typeof op.surfaceId === "string")
          touched.push(op.surfaceId);
      }
      const update = message.updateComponents;
      if (!isObject5(update) || !Array.isArray(update.components))
        return;
      const surface = typeof update.surfaceId === "string" ? surfaceOf(update.surfaceId) : void 0;
      const seen = /* @__PURE__ */ new Set();
      update.components.forEach((component, i2) => {
        const at = `${base}/updateComponents/components/${i2}`;
        if (!isObject5(component)) {
          findings.push({ category: "ValidationError", path: at, message: "a component must be an object" });
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
      const types = isObject5(message) ? MESSAGE_TYPES.filter((type) => type in message) : [];
      if (types.length !== 1 || types[0] !== "updateComponents") {
        if (isObject5(message))
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
var ajv3 = new import__4.Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
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
  for (let i2 = 0; i2 < bytes.length; i2 += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i2, i2 + 32768));
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
    return { findings: read.errors.map((e2) => `${label}: ${ARTIFACT_DESCRIPTOR_FILE}: ${e2}`) };
  }
  const descriptor = read.value;
  const at = `${label} (${descriptor.catalogId})`;
  const findings = [];
  const listed = new Map(files);
  listed.delete(ARTIFACT_DESCRIPTOR_FILE);
  findings.push(...(await verifyArtifactFiles(descriptor, listed)).map((e2) => `${at}: ${e2}`));
  findings.push(...checkHostInterface(descriptor.hostInterface).map((e2) => `${at}: ${e2}`));
  const schemaBytes = listed.get(descriptor.schema);
  if (schemaBytes) {
    const schema = parseJson(schemaBytes);
    if (!schema.ok) {
      findings.push(`${at}: ${descriptor.schema}: ${schema.error}`);
    } else {
      findings.push(...checkArtifactSchema(descriptor, schema.value).map((e2) => `${at}: ${e2}`));
      findings.push(...checkCatalogSchemaCompiles(schema.value).map((e2) => `${at}: ${descriptor.schema}: ${e2}`));
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
var import__5 = __toESM(require__(), 1);
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
var ajv4 = new import__5.Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
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
var SMOKE_GREETING = "Hello! Show me what you can do.";
function smokeWords(card) {
  const example = card.skills?.[0]?.examples?.[0];
  return typeof example === "string" && example.trim() !== "" ? example : SMOKE_GREETING;
}
var isObject6 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function a2uiMessagesIn(data) {
  if (!isObject6(data))
    return [];
  if (typeof data.version === "string")
    return [data];
  if (Array.isArray(data.messages)) {
    return data.messages.filter((m2) => isObject6(m2) && typeof m2.version === "string");
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
    if (!isObject6(update) || !Array.isArray(update.components)) {
      rest.push(message);
      continue;
    }
    first ??= { at: rest.length, message, update };
    for (const component of update.components) {
      if (isObject6(component) && typeof component.id === "string")
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
  const tree = byId.has(ROOT_ID) ? [...byId.values()].filter((c2) => drawn.has(c2.id)) : [...byId.values()];
  const components = [...tree, ...loose];
  rest.splice(first.at, 0, { ...first.message, updateComponents: { ...first.update, components } });
  return rest;
}
function checkPaint(messages, check) {
  const findings = [];
  const surfaces = /* @__PURE__ */ new Map();
  for (const message of messages) {
    const create = message.createSurface;
    if (isObject6(create) && typeof create.surfaceId === "string") {
      const catalogId = typeof create.catalogId === "string" ? create.catalogId : void 0;
      surfaces.set(create.surfaceId, { catalogId, messages: [] });
    }
    const operation = OPERATIONS.map((key) => message[key]).find(isObject6);
    const surfaceId = isObject6(operation) ? operation.surfaceId : void 0;
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
        refs = buildComponentRefMap(Catalog.fromJson(schema, "0.9", catalogId), V09_CHILD_REF_OPTIONS);
      } catch (error) {
        findings.push(`${at}: the catalog does not load: ${error.message}`);
        continue;
      }
      refMaps.set(catalogId, refs);
    }
    findings.push(...validator.validate(settled(own, refs)).map((f2) => `${at}: ${formatA2uiFinding(f2)}`));
    let declared = options.get(catalogId);
    if (!declared) {
      declared = catalogId === BASIC_CATALOG_ID ? basicCatalogOptions() : catalogOptions(schema);
      options.set(catalogId, declared);
    }
    for (const message of own) {
      const update = message.updateComponents;
      if (!isObject6(update) || !Array.isArray(update.components))
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
var lent = () => `the host lends ${HOST_SPECIFIERS.map((s2) => JSON.stringify(s2)).join(", ")}`;
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
      findings: [...copied.findings, ...result.errors.map((m2) => findingOf(packageDir, entryRel, m2))],
      lazy: lazySheets(result.metafile.inputs)
    };
  } catch (error) {
    const messages = error.errors;
    const findings = messages === void 0 ? [{ file: entryRel, reason: error.message }] : messages.map((m2) => findingOf(packageDir, entryRel, m2));
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
var sorted = (files) => new Map([...files].sort(([a2], [b2]) => a2 < b2 ? -1 : a2 > b2 ? 1 : 0));
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
  const signal2 = AbortSignal.timeout(timeoutMs);
  let response;
  try {
    response = await fetchImpl(cardUrl, { signal: signal2, headers: { accept: "application/json" } });
  } catch (err) {
    if (signal2.aborted) throw new Error(`did not answer within ${timeoutMs / 1e3} s`);
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
  const c2 = card;
  if (typeof c2.url !== "string" || typeof c2.name !== "string") {
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
  const s2 = scheme;
  const bearer = { Authorization: `Bearer ${secret}` };
  switch (s2.type) {
    case "oauth2": {
      const flows = s2.flows;
      return flows?.authorizationCode ? bearer : void 0;
    }
    case "openIdConnect":
      return bearer;
    case "http":
      return typeof s2.scheme === "string" && s2.scheme.toLowerCase() === "bearer" ? bearer : void 0;
    case "apiKey":
      return s2.in === "header" && typeof s2.name === "string" && s2.name !== "" ? { [s2.name]: secret } : void 0;
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
  return data.map((item, i2) => {
    const read = validateIndexEntry(item);
    if (!read.ok) {
      throw new Error(
        `${MARKETPLACE_ROUTES.index}[${i2}] is not an entry: ${read.errors.join("; ")}`
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
  if (typeof body === "object" && body !== null && Array.isArray(body.findings) && body.findings.every((f2) => typeof f2 === "string")) {
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
    const signal2 = AbortSignal.timeout(timeoutMs);
    const fetchImpl = async (input, init) => {
      const merged = new Headers(init?.headers);
      for (const [name, value] of Object.entries(headers ?? {})) merged.set(name, value);
      const response = await base(input, { ...init, headers: merged, signal: signal2 });
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
    try {
      const client = await factory.createFromAgentCard(card);
      const stream = client.sendMessageStream(
        { message },
        {
          signal: signal2,
          serviceParameters: ServiceParameters.create(
            withA2AExtensions(A2UI_EXTENSION_URI, A2UI_EXTENSION_URI_V09)
          )
        }
      );
      for await (const event of stream) {
        const parts = partsOf(event);
        messages.push(...a2uiMessagesOf(parts));
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
      if (signal2.aborted) {
        return { kind: "error", message: `the agent did not answer within ${timeoutMs / 1e3} s` };
      }
      return { kind: "error", message: err.message };
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
  else findings.push(...read.errors.map((e2) => `the card's ${e2}`));
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
        const held = entries.find((e2) => e2.publisher === options.publisher && id in e2.catalogs);
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
        findings: read.errors.map((e2) => `the preview is not a preview document: ${e2}`)
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
    const notes = Array.isArray(outcome.notes) ? outcome.notes.filter((n2) => typeof n2 === "string") : [];
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
  artifactFiles,
  claim,
  defineConfig,
  describeNotice,
  listPublished,
  preview,
  publish,
  stellify,
  unpublish,
  writeArtifact
};
