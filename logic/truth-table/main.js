import N from 'nearley';
import grammar from './grammar';

function parse(str) {
  const parser = new N.Parser(N.Grammar.fromCompiled(grammar));
  parser.feed(str);
  if (parser.results.length !== 1) error('invalid formula.')
  return parser.results[0];
}

// with desc order(i.e. [r,q,p] which is comport for valuation.
function varOf(root) {
  const rfn = (tree) => {
    if (tree.type === 'prime') return [tree.value];
    return tree.slice(1).reduce((a, x) => a.concat(rfn(x)), []);
  };
  return [...new Set(rfn(root))].filter(c => !['T', 'F'].includes(c)).sort().reverse();
}

function dicOf(vs, n) {
  const dic = { T: true, F: false };
  vs.forEach((v, i) => {
    dic[v] = (n & (1 << i)) ? true : false;
  });
  return dic;
}

function valueOf(n, dic, root) {
  const valOf = (tree) => {
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

function truthTableOf(str) {
  const tree = parse(str);
  const vs = varOf(tree);
  const result = [];
  result.push(['X', ...vs]);
  for (let n = (1 << vs.length) - 1; n >= 0; n -= 1) {
    const dic = dicOf(vs, n);
    const val = valueOf(n, dic, tree) ? '1' : '0';
    const varr = vs.map(v => dic[v] ? '1' : '0');
    result.push([val, ...varr]);
  }
  result.forEach(line => line.reverse()); // for human eye
  return result;
}

// UI stuff
const select = cid => document.getElementById(cid);
const error = msg => alert(msg);

const register = (s1, s2, s3) => {
  select(s1).addEventListener('click', () => {
    try {
      const f = select(s2).value;
      const s = truthTableOf(f)
        .map(arr => arr.join(' '))
        .join('\n');
      select(s3).value = s;
    } catch (e) {
      alert(e.message);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  register('btn', 'formula', 'ttable');
  register('btn2', 'formula2', 'ttable2');
});
