const
  // combinators

  sep1 = (sep, rule) => seq(rule, repeat(seq(sep, rule)))

  // constant, non-production rules

  digit       = /[0-9]/,
  hexDigit    = /[0-9a-fA-F]/,
  octalDigit  = /[0-7]/,
  binaryDigit = /[0-1]/,

  decimals    = sep1('_', repeat1(digit)),
  hexidecimal = seq(choice('x', 'X'), sep1('_', repeat1(hexDigit))),
  octadecimal = seq(choice('o', 'O'), sep1('_', repeat1(octalDigit))),
  binary      = seq(choice('b', 'B'), sep1('_', repeat1(binaryDigit))),

  decimalLiteral = seq(digit, repeat(digit)),
  hexLiteral     = seq('0', hexidecimal),
  octalLiteral   = seq('0', octadecimal),
  binaryLiteral  = seq('0', binary),

  exponent = seq(
    choice('e', 'E'),
    optional(choice('+', '-')),
    repeat1(decimalLiteral)
  ),

  floatLiteral = seq(
    optional(choice('+', '-')),
    choice(
      seq(decimals, '.', decimals, optional(exponent)),
      seq('.', decimals, optional(exponent)),
      seq(decimals, optional(exponent)),
      hexLiteral,
      octalLiteral,
      binaryLiteral,
    )
  ),

module.exports = grammar({
  name: 'openddl',

  word:   $ => $.identifier,
  extras: $ => [ $.comment, /\s|\\n/ ],
  inline: $ => [ $.deriv_struct, $.prim_struct, $.name ],

  rules: {

    // top-level stuff

    module: $ => repeat(field('struct', $.structure)),

    structure: $ => choice(
      $.prim_struct,
      $.deriv_struct,
    ),

    prim_struct: $ => seq(
      field('type', $.data_type),
      choice(
        seq(
          '[', field('size', $.integer), ']',
          field('name', optional($.name)),
          '{', field('data', $.data_array_list), '}'
        ),
        seq(
          field('name', optional($.name)),
          '{', field('data', $.data_list), '}'
        ),
      )
    ),

    deriv_struct: $ => seq(
      field('ident', $.identifier),
      field('name',  optional($.name)),
      field('props', optional(seq('(', sep1(',', $.property), ')'))),
      field('entries', seq('{', repeat($.structure), '}')),
    ),

    // data lists

    data_list: $ => choice(
      sep1(',', $.bool),
      sep1(',', $.integer),
      sep1(',', $.float),
      sep1(',', $.string),
      sep1(',', $.reference),
      sep1(',', $.data_type),
    ),

    data_array_list: $ => choice(
      sep1(',', seq('{', sep1(',', $.bool), '}')),
      sep1(',', seq('{', sep1(',', $.integer), '}')),
      sep1(',', seq('{', sep1(',', $.float), '}')),
      sep1(',', seq('{', sep1(',', $.string), '}')),
      sep1(',', seq('{', sep1(',', $.reference), '}')),
      sep1(',', seq('{', sep1(',', $.data_type), '}')),
    ),

    // basics

    name: $ => seq(choice('$', '%'), $.identifier),
    identifier: $ => /[_a-zA-Z](\w|')*/,

    reference: $ => choice(
      'null',
      field('path', seq($.name, optional(repeat(seq('%', $.identifier))))),
    ),

    property: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', choice(
        $.bool,
        $.integer,
        $.float,
        $.string,
        $.reference,
        $.data_type,
      )),
    ),

    comment: $ => token(choice(
      seq('//', /.*/),
      seq(
        '/*',
        repeat(choice(
          /[^*]/,
          /\*[^/]/,
        )),
        '*/',
      )
    )),

    // types

    data_type: $ => choice(
      $._type_bool,
      $._type_int8,
      $._type_int16,
      $._type_int32,
      $._type_int64,
      $._type_uint8,
      $._type_uint16,
      $._type_uint32,
      $._type_uint64,
      $._type_float16,
      $._type_float32,
      $._type_float64,
      $._type_string,
      $._type_ref,
      $._type_type,
    ),

    _type_bool:    $ => choice('bool', 'b'),

    _type_int8:    $ => choice('int8',  'i8'),
    _type_int16:   $ => choice('int16', 'i16'),
    _type_int32:   $ => choice('int32', 'i32'),
    _type_int64:   $ => choice('int64', 'i64'),

    _type_uint8:   $ => choice('unsigned_int8',  'u8'),
    _type_uint16:  $ => choice('unsigned_int16', 'u16'),
    _type_uint32:  $ => choice('unsigned_int32', 'u32'),
    _type_uint64:  $ => choice('unsigned_int64', 'u64'),

    _type_float16: $ => choice('half',   'float16', 'h', 'f16'),
    _type_float32: $ => choice('float',  'float32', 'f', 'f32'),
    _type_float64: $ => choice('double', 'float64', 'd', 'f64'),

    _type_string:  $ => choice('string', 's'),
    _type_ref:     $ => choice('ref',    'r'),
    _type_type:    $ => choice('type',   't'),

    // literals

    literal: $ => choice(
      $.bool,
      $.integer,
      $.float,
      $.string,
    ),

    bool: $ => choice('true', 'false'),

    string: $ => token(seq(
      '"',
      repeat(
        choice(
          /[^\\"\n]/,
          /\\(\^)?(.|\n)/
        )
      ),
      '"'
    )),

    float: $ => token(floatLiteral),

    integer: $ => seq(
      optional(choice('+', '-')),
      choice(
        $._integer_literal,
        $._hexidecimal_literal,
        $._octal_literal,
        $._binary_literal,
        $._char_literal,
      ),
    ),

    _integer_literal:     $ => token(decimalLiteral),
    _hexidecimal_literal: $ => token(hexLiteral),
    _octal_literal:       $ => token(octalLiteral),
    _binary_literal:      $ => token(binaryLiteral),
    _char_literal:        $ => /'([A-Za-z0-9();\[\]`ʹ{}_!#$%&⋆+,./<=>?@^" |\-~:\\*]|\\[a-zA-Z0-9\\"'&]*|\\\^[0-9A-Z@\[\]\\\^_])'/,
  }
})
