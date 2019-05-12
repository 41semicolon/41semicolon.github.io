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
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
