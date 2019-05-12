import proplib from '../lib/proplib';

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
      select(s5).value = proplib.cCNF(f)
      // s6
      select(s6).value = proplib.formulaID(f)
    } catch (e) {
      alert(e.message);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  register('btn', 'formula', 'ttable', 'flash', 'cnf', 'fid');
  register('btn2', 'formula2', 'ttable2', 'flash2', 'cnf2', 'fid2');
});
