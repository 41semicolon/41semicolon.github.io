const A = require('./proplib.js');

test('prim', () => {
  [
    ['T', '1'], ['F', '0'], ['a', '10'], ['!a', '01'],
    ['a&b', '1000'], ['a|b', '1110'], ['a->b', '1011'], ['a==b', '1001'],
    ['a@b', '0111'], ['a#b', '0001'], ['a^b', '0110'],
  ].forEach(([f, ans]) => {
    const [, vals] = A.truthTableOf(f);
    const X = vals.map(v => v & 1).join('');
    expect(X).toBe(ans);
  });
});

test('taut', () => {
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
