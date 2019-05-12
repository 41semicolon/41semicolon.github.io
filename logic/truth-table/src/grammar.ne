@builtin "whitespace.ne"

@{%
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
%}

formula -> _ equ _      {% d => d[1] %}
equ -> equ eq imp       {% ([a1,op,a2]) => [op, a1, a2] %}
  | imp                 {% id %}
imp -> xj then imp      {% ([a1,op,a2]) => [op, a1, a2] %}
  | xj                  {% id %}
xj -> xj xor norj       {% ([a1,op,a2]) => [op, a1, a2] %}
  | norj                {% id %}
norj -> norj nor disj   {% ([a1,op,a2]) => [op, a1, a2] %}
  | disj                {% id %}
disj -> disj or nanj    {% ([a1,op,a2]) => [op, a1, a2] %}
  | nanj                {% id %}
nanj -> nanj nand conj  {% ([a1,op,a2]) => [op, a1, a2] %}
  | conj                {% id %}
conj -> conj and lit    {% ([a1,op,a2]) => [op, a1, a2] %}
  | lit                 {% id %}
lit -> not lit          {% ([op,a]) => [op, a] %}
  | prime               {% id %}
prime -> [a-zTF]        {% d => toObj(d[0]) %}
  | pf                  {% id %}
pf -> "(" formula ")"   {% d => d[1] %}

# op
not -> "!" _     {% ([op]) => toObj(op) %}
and -> _ "&" _   {% ([,op]) => toObj(op) %}
nand -> _ "@" _  {% ([,op]) => toObj(op) %}
or -> _ "|"  _   {% ([,op]) => toObj(op) %}
nor -> _ "#"  _  {% ([,op]) => toObj(op) %}
xor -> _ "^"  _  {% ([,op]) => toObj(op) %}
then -> _ "->" _ {% ([,op]) => toObj(op) %}
eq -> _ "==" _   {% ([,op]) => toObj(op) %}
