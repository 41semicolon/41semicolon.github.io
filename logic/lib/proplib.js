const nearley =  require('nearley');
const grammar = require( './propgrammar');

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

module.exports = {
  truthTableOf,
  cCNF,
  formulaID,
  equivalent,
};
