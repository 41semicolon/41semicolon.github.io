'use strict';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var nearley = createCommonjsModule(function (module) {
(function(root, factory) {
    if (module.exports) {
        module.exports = factory();
    } else {
        root.nearley = factory();
    }
}(commonjsGlobal, function() {

    function Rule(name, symbols, postprocess) {
        this.id = ++Rule.highestId;
        this.name = name;
        this.symbols = symbols;        // a list of literal | regex class | nonterminal
        this.postprocess = postprocess;
        return this;
    }
    Rule.highestId = 0;

    Rule.prototype.toString = function(withCursorAt) {
        function stringifySymbolSequence (e) {
            return e.literal ? JSON.stringify(e.literal) :
                   e.type ? '%' + e.type : e.toString();
        }
        var symbolSequence = (typeof withCursorAt === "undefined")
                             ? this.symbols.map(stringifySymbolSequence).join(' ')
                             : (   this.symbols.slice(0, withCursorAt).map(stringifySymbolSequence).join(' ')
                                 + " ● "
                                 + this.symbols.slice(withCursorAt).map(stringifySymbolSequence).join(' ')     );
        return this.name + " → " + symbolSequence;
    };


    // a State is a rule at a position from a given starting point in the input stream (reference)
    function State(rule, dot, reference, wantedBy) {
        this.rule = rule;
        this.dot = dot;
        this.reference = reference;
        this.data = [];
        this.wantedBy = wantedBy;
        this.isComplete = this.dot === rule.symbols.length;
    }

    State.prototype.toString = function() {
        return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
    };

    State.prototype.nextState = function(child) {
        var state = new State(this.rule, this.dot + 1, this.reference, this.wantedBy);
        state.left = this;
        state.right = child;
        if (state.isComplete) {
            state.data = state.build();
        }
        return state;
    };

    State.prototype.build = function() {
        var children = [];
        var node = this;
        do {
            children.push(node.right.data);
            node = node.left;
        } while (node.left);
        children.reverse();
        return children;
    };

    State.prototype.finish = function() {
        if (this.rule.postprocess) {
            this.data = this.rule.postprocess(this.data, this.reference, Parser.fail);
        }
    };


    function Column(grammar, index) {
        this.grammar = grammar;
        this.index = index;
        this.states = [];
        this.wants = {}; // states indexed by the non-terminal they expect
        this.scannable = []; // list of states that expect a token
        this.completed = {}; // states that are nullable
    }


    Column.prototype.process = function(nextColumn) {
        var states = this.states;
        var wants = this.wants;
        var completed = this.completed;

        for (var w = 0; w < states.length; w++) { // nb. we push() during iteration
            var state = states[w];

            if (state.isComplete) {
                state.finish();
                if (state.data !== Parser.fail) {
                    // complete
                    var wantedBy = state.wantedBy;
                    for (var i = wantedBy.length; i--; ) { // this line is hot
                        var left = wantedBy[i];
                        this.complete(left, state);
                    }

                    // special-case nullables
                    if (state.reference === this.index) {
                        // make sure future predictors of this rule get completed.
                        var exp = state.rule.name;
                        (this.completed[exp] = this.completed[exp] || []).push(state);
                    }
                }

            } else {
                // queue scannable states
                var exp = state.rule.symbols[state.dot];
                if (typeof exp !== 'string') {
                    this.scannable.push(state);
                    continue;
                }

                // predict
                if (wants[exp]) {
                    wants[exp].push(state);

                    if (completed.hasOwnProperty(exp)) {
                        var nulls = completed[exp];
                        for (var i = 0; i < nulls.length; i++) {
                            var right = nulls[i];
                            this.complete(state, right);
                        }
                    }
                } else {
                    wants[exp] = [state];
                    this.predict(exp);
                }
            }
        }
    };

    Column.prototype.predict = function(exp) {
        var rules = this.grammar.byName[exp] || [];

        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            var wantedBy = this.wants[exp];
            var s = new State(r, 0, this.index, wantedBy);
            this.states.push(s);
        }
    };

    Column.prototype.complete = function(left, right) {
        var copy = left.nextState(right);
        this.states.push(copy);
    };


    function Grammar(rules, start) {
        this.rules = rules;
        this.start = start || this.rules[0].name;
        var byName = this.byName = {};
        this.rules.forEach(function(rule) {
            if (!byName.hasOwnProperty(rule.name)) {
                byName[rule.name] = [];
            }
            byName[rule.name].push(rule);
        });
    }

    // So we can allow passing (rules, start) directly to Parser for backwards compatibility
    Grammar.fromCompiled = function(rules, start) {
        var lexer = rules.Lexer;
        if (rules.ParserStart) {
          start = rules.ParserStart;
          rules = rules.ParserRules;
        }
        var rules = rules.map(function (r) { return (new Rule(r.name, r.symbols, r.postprocess)); });
        var g = new Grammar(rules, start);
        g.lexer = lexer; // nb. storing lexer on Grammar is iffy, but unavoidable
        return g;
    };


    function StreamLexer() {
      this.reset("");
    }

    StreamLexer.prototype.reset = function(data, state) {
        this.buffer = data;
        this.index = 0;
        this.line = state ? state.line : 1;
        this.lastLineBreak = state ? -state.col : 0;
    };

    StreamLexer.prototype.next = function() {
        if (this.index < this.buffer.length) {
            var ch = this.buffer[this.index++];
            if (ch === '\n') {
              this.line += 1;
              this.lastLineBreak = this.index;
            }
            return {value: ch};
        }
    };

    StreamLexer.prototype.save = function() {
      return {
        line: this.line,
        col: this.index - this.lastLineBreak,
      }
    };

    StreamLexer.prototype.formatError = function(token, message) {
        // nb. this gets called after consuming the offending token,
        // so the culprit is index-1
        var buffer = this.buffer;
        if (typeof buffer === 'string') {
            var nextLineBreak = buffer.indexOf('\n', this.index);
            if (nextLineBreak === -1) nextLineBreak = buffer.length;
            var line = buffer.substring(this.lastLineBreak, nextLineBreak);
            var col = this.index - this.lastLineBreak;
            message += " at line " + this.line + " col " + col + ":\n\n";
            message += "  " + line + "\n";
            message += "  " + Array(col).join(" ") + "^";
            return message;
        } else {
            return message + " at index " + (this.index - 1);
        }
    };


    function Parser(rules, start, options) {
        if (rules instanceof Grammar) {
            var grammar = rules;
            var options = start;
        } else {
            var grammar = Grammar.fromCompiled(rules, start);
        }
        this.grammar = grammar;

        // Read options
        this.options = {
            keepHistory: false,
            lexer: grammar.lexer || new StreamLexer,
        };
        for (var key in (options || {})) {
            this.options[key] = options[key];
        }

        // Setup lexer
        this.lexer = this.options.lexer;
        this.lexerState = undefined;

        // Setup a table
        var column = new Column(grammar, 0);
        var table = this.table = [column];

        // I could be expecting anything.
        column.wants[grammar.start] = [];
        column.predict(grammar.start);
        // TODO what if start rule is nullable?
        column.process();
        this.current = 0; // token index
    }

    // create a reserved token for indicating a parse fail
    Parser.fail = {};

    Parser.prototype.feed = function(chunk) {
        var lexer = this.lexer;
        lexer.reset(chunk, this.lexerState);

        var token;
        while (token = lexer.next()) {
            // We add new states to table[current+1]
            var column = this.table[this.current];

            // GC unused states
            if (!this.options.keepHistory) {
                delete this.table[this.current - 1];
            }

            var n = this.current + 1;
            var nextColumn = new Column(this.grammar, n);
            this.table.push(nextColumn);

            // Advance all tokens that expect the symbol
            var literal = token.text !== undefined ? token.text : token.value;
            var value = lexer.constructor === StreamLexer ? token.value : token;
            var scannable = column.scannable;
            for (var w = scannable.length; w--; ) {
                var state = scannable[w];
                var expect = state.rule.symbols[state.dot];
                // Try to consume the token
                // either regex or literal
                if (expect.test ? expect.test(value) :
                    expect.type ? expect.type === token.type
                                : expect.literal === literal) {
                    // Add it
                    var next = state.nextState({data: value, token: token, isToken: true, reference: n - 1});
                    nextColumn.states.push(next);
                }
            }

            // Next, for each of the rules, we either
            // (a) complete it, and try to see if the reference row expected that
            //     rule
            // (b) predict the next nonterminal it expects by adding that
            //     nonterminal's start state
            // To prevent duplication, we also keep track of rules we have already
            // added

            nextColumn.process();

            // If needed, throw an error:
            if (nextColumn.states.length === 0) {
                // No states at all! This is not good.
                var message = this.lexer.formatError(token, "invalid syntax") + "\n";
                message += "Unexpected " + (token.type ? token.type + " token: " : "");
                message += JSON.stringify(token.value !== undefined ? token.value : token) + "\n";
                var err = new Error(message);
                err.offset = this.current;
                err.token = token;
                throw err;
            }

            // maybe save lexer state
            if (this.options.keepHistory) {
              column.lexerState = lexer.save();
            }

            this.current++;
        }
        if (column) {
          this.lexerState = lexer.save();
        }

        // Incrementally keep track of results
        this.results = this.finish();

        // Allow chaining, for whatever it's worth
        return this;
    };

    Parser.prototype.save = function() {
        var column = this.table[this.current];
        column.lexerState = this.lexerState;
        return column;
    };

    Parser.prototype.restore = function(column) {
        var index = column.index;
        this.current = index;
        this.table[index] = column;
        this.table.splice(index + 1);
        this.lexerState = column.lexerState;

        // Incrementally keep track of results
        this.results = this.finish();
    };

    // nb. deprecated: use save/restore instead!
    Parser.prototype.rewind = function(index) {
        if (!this.options.keepHistory) {
            throw new Error('set option `keepHistory` to enable rewinding')
        }
        // nb. recall column (table) indicies fall between token indicies.
        //        col 0   --   token 0   --   col 1
        this.restore(this.table[index]);
    };

    Parser.prototype.finish = function() {
        // Return the possible parsings
        var considerations = [];
        var start = this.grammar.start;
        var column = this.table[this.table.length - 1];
        column.states.forEach(function (t) {
            if (t.rule.name === start
                    && t.dot === t.rule.symbols.length
                    && t.reference === 0
                    && t.data !== Parser.fail) {
                considerations.push(t);
            }
        });
        return considerations.map(function(c) {return c.data; });
    };

    return {
        Parser: Parser,
        Grammar: Grammar,
        Rule: Rule,
    };

}));
});

var grammar = createCommonjsModule(function (module) {
// Generated automatically by nearley, version 2.16.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const toObj = str => {
  switch (str) {
    case '!': return { type: 'connective', value: 'not' };
    case '&': return { type: 'connective', value: 'and' };
    case '@': return { type: 'connective', value: 'nand' };
    case '|': return { type: 'connective', value: 'or' };
    case '^': return { type: 'connective', value: 'xor' };
    case '#': return { type: 'connective', value: 'nor' };
    case '->': return { type: 'connective', value: 'then' };
    case '==': return { type: 'connective', value: 'equiv' };
    default:
      if (/^[a-zTF]$/.exec(str)) return { type: 'prime', value: str };
      throw Error('invalid prime name');
  }
};
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id},
    {"name": "formula", "symbols": ["_", "equ", "_"], "postprocess": d => d[1]},
    {"name": "equ", "symbols": ["equ", "eq", "imp"], "postprocess": ([a1,op,a2]) => [op, a1, a2]},
    {"name": "equ", "symbols": ["imp"], "postprocess": id},
    {"name": "imp", "symbols": ["xj", "then", "imp"], "postprocess": ([a1,op,a2]) => [op, a1, a2]},
    {"name": "imp", "symbols": ["xj"], "postprocess": id},
    {"name": "xj", "symbols": ["xj", "xor", "norj"], "postprocess": ([a1,op,a2]) => [op, a1, a2]},
    {"name": "xj", "symbols": ["norj"], "postprocess": id},
    {"name": "norj", "symbols": ["norj", "nor", "disj"], "postprocess": ([a1,op,a2]) => [op, a1, a2]},
    {"name": "norj", "symbols": ["disj"], "postprocess": id},
    {"name": "disj", "symbols": ["disj", "or", "nanj"], "postprocess": ([a1,op,a2]) => [op, a1, a2]},
    {"name": "disj", "symbols": ["nanj"], "postprocess": id},
    {"name": "nanj", "symbols": ["nanj", "nand", "conj"], "postprocess": ([a1,op,a2]) => [op, a1, a2]},
    {"name": "nanj", "symbols": ["conj"], "postprocess": id},
    {"name": "conj", "symbols": ["conj", "and", "lit"], "postprocess": ([a1,op,a2]) => [op, a1, a2]},
    {"name": "conj", "symbols": ["lit"], "postprocess": id},
    {"name": "lit", "symbols": ["not", "lit"], "postprocess": ([op,a]) => [op, a]},
    {"name": "lit", "symbols": ["prime"], "postprocess": id},
    {"name": "prime", "symbols": [/[a-zTF]/], "postprocess": d => toObj(d[0])},
    {"name": "prime", "symbols": ["pf"], "postprocess": id},
    {"name": "pf", "symbols": [{"literal":"("}, "formula", {"literal":")"}], "postprocess": d => d[1]},
    {"name": "not", "symbols": [{"literal":"!"}, "_"], "postprocess": ([op]) => toObj(op)},
    {"name": "and", "symbols": ["_", {"literal":"&"}, "_"], "postprocess": ([,op]) => toObj(op)},
    {"name": "nand", "symbols": ["_", {"literal":"@"}, "_"], "postprocess": ([,op]) => toObj(op)},
    {"name": "or", "symbols": ["_", {"literal":"|"}, "_"], "postprocess": ([,op]) => toObj(op)},
    {"name": "nor", "symbols": ["_", {"literal":"#"}, "_"], "postprocess": ([,op]) => toObj(op)},
    {"name": "xor", "symbols": ["_", {"literal":"^"}, "_"], "postprocess": ([,op]) => toObj(op)},
    {"name": "then$string$1", "symbols": [{"literal":"-"}, {"literal":">"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "then", "symbols": ["_", "then$string$1", "_"], "postprocess": ([,op]) => toObj(op)},
    {"name": "eq$string$1", "symbols": [{"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "eq", "symbols": ["_", "eq$string$1", "_"], "postprocess": ([,op]) => toObj(op)}
]
  , ParserStart: "formula"
};
{
   module.exports = grammar;
}
})();
});

function parse(str) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  parser.feed(str);
  if (parser.results.length !== 1) throw Error('invalid formula.');
  return parser.results[0];
}

function varOf(root) {
  const rfn = (tree) => {
    if (tree.type === 'prime') return [tree.value];
    return tree.slice(1).reduce((a, x) => a.concat(rfn(x)), []);
  };
  return [...new Set(rfn(root))].filter(c => !['T', 'F'].includes(c)).sort();
}

function dicOf(vs, n) {
  const dic = { T: 1, F: 0 };
  vs.forEach((v, i) => {
    const j = vs.length - i - 1;
    dic[v] = (n & (1 << j)) ? 1 : 0;
  });
  return dic;
}

function valueOf(n, dic, root) {
  const valOf = tree => {
    if (tree.type === 'prime') return dic[tree.value];
    const [op, a1, a2] = tree;
    switch (op.value) {
      case 'not': return !valOf(a1);
      case 'and': return valOf(a1) && valOf(a2);
      case 'nand': return !(valOf(a1) && valOf(a2));
      case 'or': return valOf(a1) || valOf(a2);
      case 'nor': return !(valOf(a1) || valOf(a2));
      case 'xor': return (valOf(a1) && !valOf(a2)) || (!valOf(a1) && valOf(a2));
      case 'then': return !valOf(a1) || valOf(a2);
      case 'equiv': return (valOf(a1) && valOf(a2)) || (!valOf(a1) && !valOf(a2));
      default: throw Error(`${op.value}, cannnot reach here`);
    }
  };
  return valOf(root);
}

// returns [[a,b], [0b111, 0b100, 0b010, 0b000]] for a&b
function truthTableOf(str) {
  const tree = parse(str);
  const vs = varOf(tree);
  if (vs.length > 20) throw new Error('too big');
  const result = [];
  for (let n = (1 << vs.length) - 1; n >= 0; n -= 1) { // desc
    const dic = dicOf(vs, n);
    const v = (n & ((1 << vs.length) - 1));
    const x = (v << 1) | valueOf(n, dic, tree);
    result.push(x);
  }
  return [[...vs, 'X'], result];
}

// returns valid formula string
function cCNF(str) {
  const [names, vals] = truthTableOf(str);
  return vals
    .filter(v => v & 1)
    .map(v => (v >> 1).toString(2).padStart(names.length - 1, '0'))
    .map(s => '(' + [...s].map((b, i) => (b === '0' ? '!' : '') + names[i]).join('&')  + ')')
    .join('|');
}

function formulaID(str) {
  const [names, vals] = truthTableOf(str);
  return names.slice(0, -1).join('') + vals.map(v => v & 1).join('');
}

function equivalent(str1, str2) {
  return formulaID(str1) === formulaID(str2);
}

var proplib = {
  truthTableOf,
  cCNF,
  formulaID,
  equivalent,
};

const select = cid => document.getElementById(cid);
const register = (s1, s2, s3, s4, s5, s6) => {
  select(s1).addEventListener('click', () => {
    try {
      const f = select(s2).value;
      const [names, values] = proplib.truthTableOf(f);
      let s = names.join(' ') + '\n';
      values.forEach(v => {
        s += [...v.toString(2).padStart(names.length, '0')].join(' ');
        s += '\n';
      });
      select(s3).value = s;
      // s4
      const istaut = values.every(v => v & 1);
      const iscont = values.every(v => (v & 1) === 0);
      select(s4).innerHTML = istaut ? 'tautology!' : iscont ? 'contradiction!' : '';
      // s5
      select(s5).value = proplib.cCNF(f);
      // s6
      select(s6).value = proplib.formulaID(f);
    } catch (e) {
      alert(e.message);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  register('btn', 'formula', 'ttable', 'flash', 'cnf', 'fid');
  register('btn2', 'formula2', 'ttable2', 'flash2', 'cnf2', 'fid2');
});
