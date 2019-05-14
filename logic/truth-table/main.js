import proplib from '../lib/proplib';

const select = cid => document.getElementById(cid);
const register = (s1, s2, s3, s4, s5, s6, s7, s8) => {
  select(s1).addEventListener('click', () => {
    try {
      // s2: formula, s3: table
      const f = select(s2).value;
      const [names, values] = proplib.truthTableOf(f);
      let s = names.join(' ') + '\n';
      values.forEach(v => {
        s += [...v.toString(2).padStart(names.length, '0')].join(' ');
        s += '\n';
      });
      select(s3).value = s;
      // s4: flash
      const istaut = values.every(v => v & 1);
      const iscont = values.every(v => (v & 1) === 0);
      select(s4).innerHTML = istaut ? 'tautology!' : iscont ? 'contradiction!' : '';
      // s5: CNF
      select(s5).value = proplib.CNF(f)
      // s6, s7: canonicalCNF/CNF
      select(s6).value = proplib.cCNF(f)
      select(s7).value = proplib.cDNF(f)
      // s8
      select(s8).value = proplib.formulaSID(f)
    } catch (e) {
      alert(e.message);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  register('btn', 'formula', 'ttable', 'flash', 'cnf', 'ccnf', 'cdnf', 'fid');
  register('btn2', 'formula2', 'ttable2', 'flash2', 'cnf2', 'ccnf2', 'cdnf2', 'fid2');
});
