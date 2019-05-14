const nearley =  require('nearley');
const grammar = require('./propgrammar');
const C = require('./common.js');

function parse(str) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  parser.feed(str);
  if (parser.results.length !== 1) throw Error('invalid formula.');
  return parser.results[0];
}

function unparse(tree) { // use reprProp() for human eyes.
  if (tree.type === 'prime') return tree.value;
  const [op, ...args] = tree;
  switch(op.value) {
    case 'not':
      return '!(' + unparse(args[0]) + ')';
    case 'and':
    case 'nand':
    case 'or':
    case 'nor':
    case 'xor':
    case 'then':
    case 'equiv':
      return args.map(a => `(${unparse(a)})`).join(C.SYMBOL[op.value]);
  }
  throw Error('oops');
}

const reprProp = x => C.repr(x, y=>y);

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
function cDNF(str) {
  const [names, vals] = truthTableOf(str);
  return vals
    .filter(v => v & 1)
    .map(v => (v >> 1).toString(2).padStart(names.length - 1, '0'))
    .map(s => '(' + [...s].map((b, i) => (b === '0' ? '!' : '') + names[i]).join('&')  + ')')
    .join('|');
}

function cCNF(str) {
  const [names, vals] = truthTableOf(str);
  return vals
    .filter(v => (v & 1) === 0)
    .map(v => (v >> 1).toString(2).padStart(names.length - 1, '0'))
    .map(s => '(' + [...s].map((b, i) => (b === '1' ? '!' : '') + names[i]).join('|')  + ')')
    .join('&');
}

function formulaSID(str) { // SID: semantic ID
  const [names, vals] = truthTableOf(str);
  return names.slice(0, -1).join('') + vals.map(v => v & 1).join('');
}

function sortedCNF (str) { // for human eye
  // comparator
  const cmp = (lx, ly) => {
    const x = (lx.type === 'prime') ? lx.value : lx[1].value;
    const y = (ly.type === 'prime') ? ly.value : ly[1].value;
    return (x < y) ? -1 : 1;
  };
  const dnf = C.flatAO(C.toCNF(parse(str)));
  // 1-Clause
  if (C.isClause(dnf)){
    if(C.isLiteral(dnf)) return dnf;
    return [dnf[0], ...dnf.slice(1).sort(cmp)];
  }
  // N-Clause
  return [dnf[0], ...dnf.slice(1).map(cl => {
    if(C.isLiteral(cl)) return cl;
    return [cl[0], ...cl.slice(1).sort(cmp)];
  })];
}

module.exports = {
  parse,
  unparse,
  reprProp,
  truthTableOf,
  cDNF,
  cCNF,
  formulaSID,
  sortedCNF,
  CNF: x => reprProp(sortedCNF(x)),
};
