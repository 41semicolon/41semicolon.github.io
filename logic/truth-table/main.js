import proplib from '../lib/proplib';

const select = cid => document.getElementById(cid);
const register = (s1, s2, s3) => {
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
    } catch (e) {
      alert(e.message);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  register('btn', 'formula', 'ttable');
  register('btn2', 'formula2', 'ttable2');
});
