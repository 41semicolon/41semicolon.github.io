const SYMBOL = {
  not: '!', and: '&', nand: '@',
  or: '|', nor: '#', xor: '^',
  then: '->', equiv: '==',
};

const nodeOf = kw => ({ type: 'connective', value: kw });
const isPrime = obj => obj.type === 'prime';
const isLiteral = obj => {
  if (isPrime(obj)) return true;
  if (obj[0].value === 'not' && isPrime(obj[1])) return true;
  return false;
};
const isClause = obj => { // disjunctive clause. i.e. p|!q|r
  if (isLiteral(obj)) return true;
  const [op, ...args] = obj;
  switch (op.value) {
    case 'or': return args.every(isClause);
    default: return false;
  }
};

// rewriting stuff for converting CNF
function nao(tree) {
  if (isLiteral(tree)) return tree;
  const [op, ...args] = tree;
  switch (op.value) {
    case 'not':
      return [op, nao(args[0])];
    case 'and':
    case 'or':
      return [op, ...args.map(nao)];
		case 'nand':
			return [op, [nodeOf('not'), [nodeOf('and'), ...args.map(nao)]]];
		case 'nor':
			return [op, [nodeOf('not'), [nodeOf('or'), ...args.map(nao)]]];
		case 'xor':
      if (args.length !== 2) throw Error('oops');
      return [nodeOf('or'), 
        [nodeOf('and'), nao(args[0]), [nodeOf('not'), nao(args[1])]],
        [nodeOf('and'), [nodeOf('not'), nao(args[0])], nao(args[1])]];
    case 'then':
      if (args.length !== 2) throw Error('oops');
      return [nodeOf('or'),
        [nodeOf('not'), nao(args[0])],
        nao(args[1])];
    case 'equiv':
      if (args.length !== 2) throw Error('oops');
      return nao([nodeOf('and'),
        [nodeOf('then'), args[0], args[1]],
        [nodeOf('then'), args[1], args[0]]]);
  }
  throw Error('should not reach here');
}

// rewrite:
function lit(_tree) {
  const rfn = tree => {
    if (isPrime(tree)) return tree;
    const [op, ...args] = tree;
    // and or
    if (['and', 'or'].includes(op.value)) {
      return [op, ...args.map(lit)];
    }
    // not
    const a = args[0];
    if (isPrime(a)) return tree; // negative literal
    const [opp, ...aargs] = a;
    switch (opp.value) {
      case 'not': return lit(aargs[0]); // !!a to a
      case 'and': // !(a&b) to !a|!b
        return [nodeOf('or'), ...aargs.map(x => lit([nodeOf('not'), x]))];
      case 'or': // !(a|b) to !a&!b
        return [nodeOf('and'), ...aargs.map(x => lit([nodeOf('not'), x]))];
    }
    throw Error('should not reach here');
  };
  const tree = nao(_tree);
  return rfn(tree);
}

function cnf(_tree){
  const rfn = tree => {
    if (isClause(tree)) return tree;
    const [op, ...args] = tree;
    if (op.value === 'and') {
        return [op, ...args.map(cnf)];
    } else if (op.value === 'or') {
      // (|aXbc...)->(|a(&z1 z2 ...)bc...)->(& (|z1abc...) (|z2abc...)...)
      const X = args.find(x => !isClause(x)); // should always success
      const Ys = args.filter(x => x !== X);
      const [oop, ...Zs] = rfn(X);
      if(oop.value !== 'and') throw Error(`oops ${oop.value}`);
      return [nodeOf('and'), ...Zs.map(z => cnf([nodeOf('or'), z, ...Ys]))];
    }
    throw Error('oops');
  };
	const tree = lit(_tree);
	return rfn(tree);
}

function flatAO(tree) {
  if (isPrime(tree)) return tree;
  const [op, ...args] = tree;
  if (op.value !== 'and' && op.value  !== 'or') return [op, ...args.map(flatAO)];
  // case for AND/OR
  const result = [];
  const xs = args.map(flatAO);
  for (const x of xs) {
    if(isPrime(x)) {
      result.push(x);
    } else if (x[0].value !== op.value) {
      result.push(x);
    } else {
      x.slice(1).forEach(y => result.push(y));
    }
  }
  return [op, ...result];
}

const repr = (tree, prepr= x=> x) => {
  const rfn = obj => {
    if (isPrime(obj)) return prepr(obj.value);
    const [op, ...args] = obj;
		// !(!(f)) -> !!(f)
    if (op.value === 'not') {
      const A = args[0];
      if (isLiteral(A)) return '!' + repr(A);
      return '!(' + repr(A) + ')';
    } else { // n-ary connectives (and or then equiv)
      const pstr = x => isLiteral(x) ? repr(x) : `(${repr(x)})`;
      const result = args.map(pstr).join(SYMBOL[op.value]);
      return `(${result})`;
    }
  };
  const result = rfn(flatAO(tree));
	// trim outermost paren, if exists.
  return result[0] === '(' ? result.slice(1, result.length - 1) : result;
};

module.exports = {
	SYMBOL,
  nao,
  lit,
  toCNF: cnf,
	repr,
  isLiteral,
  isClause,
  flatAO,
}
