const A = require('./proplib.js');
const B = require('./common.js');

test('parse/unparse', () => {
  [
    '!a', 'a&b', 'a|b', 'a@b', 'a#b' , 'a^b', 'a->b', 'a==b',
  ].forEach(s => {
    const a = A.unparse(A.parse(s));
    const b = A.unparse(A.parse(a));
    expect(a === b).toBeTruthy();
  });
});

test('formula to string', () => {
  [
    ['a&(b&!c)', 'a&b&!c'],
    ['a->b->c', 'a->(b->c)'],
  ].forEach(([f, ans]) => {
    expect(A.reprProp(A.parse(f))).toBe(ans);
  });
});

test('make truth table', () => {
  [
    ['T', '1'], ['F', '0'], ['a', '10'], ['!a', '01'],
    ['a&b', '1000'], ['a|b', '1110'], ['a->b', '1011'], ['a==b', '1001'],
    ['a@b', '0111'], ['a#b', '0001'], ['a^b', '0110'],
  ].forEach(([f, ans]) => {
    const [, vals] = A.truthTableOf(f);
    const X = vals.map(v => v & 1).join('');
    expect(X).toBe(ans);
  });
  // tautology
  [
    '!(a&!a)', 'a|!a',
    'p->p', '(p->q)->(q->r)->p->r',
    '(p->q->r)->(q->p->r)', 'p->q->p',
    '(p->q->r)->(p->q)->p->r', '((p->q)->p)->p',
  ].forEach(f => {
    const [, vals] = A.truthTableOf(f);
    const X = vals.every(v => v & 1);
    expect(X).toBeTruthy();
  });
});

test('make semantic ID', () => {
  [
    ['a', 'a10'],
    ['a->b', 'ab1011'],
    ['b&a', 'ab1000'],
  ].forEach(([f, ans]) => {
    expect(A.formulaSID(f)).toBe(ans);
  });
});

test('make canonical CNF', () => {
  [
    ['a', '(a)'],
    ['a->b', '(a&b)|(!a&b)|(!a&!b)'],
    ['!(a->b->c->d->x)', '(a&b&c&d&!x)'],
  ].forEach(([f, ans]) => {
    expect(A.cCNF(f)).toBe(ans);
  });
});

test('sortedCNF', () => {
  [
    ['b|a|!c', 'a|b|!c'],
    ['!(b&a|!c)', '(!a|!b)&c'],
    ['!p->!(q|r)', '(p|!q)&(p|!r)'],
    ['(p&q)|(r&(s|(t&u)))', '(p|r)&(p|s|t)&(p|s|u)&(q|r)&(q|s|t)&(q|s|u)'],
  ].forEach(([f, ans]) => {
    expect(A.reprProp(A.sortedCNF(f))).toBe(ans);
  });
});



test('rewrite/nao', () => {
  [
    'a@b', 'a->b^c',
  ].forEach(f => {
    const ff = A.unparse(B.nao(A.parse(f)));
    expect(A.formulaSID(f) === A.formulaSID(ff)).toBeTruthy();
  });
});
