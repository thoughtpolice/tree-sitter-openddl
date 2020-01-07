const
  // simple combinators

  sep1 = (sep, rule) => seq(rule, repeat(seq(sep, rule)))

  // the upstream openddl.org grammar leaves an ambiguity in in the way values
  // of specific types get parsed; there is no way for example, to disambiguate
  // floats and integers, other than the type that is found by parsing the
  // structure definition. therefore, this combinator composes several others:
  // it explicitly parses for a type, and from that choice, parses out the right
  // values with the right parsers.

  arrayForType  = ($, p) => field('datum', seq('{', sep1(',', p), '}')),

  parseByType = ($, type_parser, array_parser) => {
    return seq(
      field('type', type_parser),
      choice(
        // choice 1: an array declaration with sub-arrays
        seq(
          '[', field('size', $.integer), ']',
          field('name', optional($.name)),
          '{', sep1(',', field('data', alias(array_parser, $.array)), '}'), '}'
        ),

        // choice 2: normal, unbounded list of whatever size
        seq(
          field('name', optional($.name)),
          field('data', alias(array_parser, $.array)),
        )
      ),
    );
  }

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
  inline: $ => [ $.prim_struct, $.name ],

  rules: {

    // top-level stuff

    module: $ => repeat(field('struct', $.structure)),
    structure: $ => choice(
      // primitive types
      $.prim_struct,

      // derivative types
      seq(
        field('ident', $.identifier),
        field('name',  optional($.name)),
        field('props', optional(seq('(', sep1(',', $.property), ')'))),
        field('struct', seq('{', repeat($.structure), '}')),
      ),
    ),

    prim_struct: $ => choice(
      parseByType($, $.type_bool,    $.bool_array),
      parseByType($, $.type_int8,    $.integer_array),
      parseByType($, $.type_int16,   $.integer_array),
      parseByType($, $.type_int32,   $.integer_array),
      parseByType($, $.type_int64,   $.integer_array),
      parseByType($, $.type_uint8,   $.integer_array),
      parseByType($, $.type_uint16,  $.integer_array),
      parseByType($, $.type_uint32,  $.integer_array),
      parseByType($, $.type_uint64,  $.integer_array),
      parseByType($, $.type_float16, $.float_array),
      parseByType($, $.type_float32, $.float_array),
      parseByType($, $.type_float64, $.float_array),
      parseByType($, $.type_string,  $.string_array),
      parseByType($, $.type_ref,     $.ref_array),
      parseByType($, $.type_type,    $.type_array),
    ),

    // parser things
    bool_array:    $ => arrayForType($, $.bool),
    integer_array: $ => arrayForType($, $.integer),
    float_array:   $ => arrayForType($, $.float),
    string_array:  $ => arrayForType($, $.string),
    ref_array:     $ => arrayForType($, $.reference),
    type_array:    $ => arrayForType($, $.data_type),

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
      $.type_bool,
      $.type_int8,
      $.type_int16,
      $.type_int32,
      $.type_int64,
      $.type_uint8,
      $.type_uint16,
      $.type_uint32,
      $.type_uint64,
      $.type_float16,
      $.type_float32,
      $.type_float64,
      $.type_string,
      $.type_ref,
      $.type_type,
    ),

    type_bool:    $ => choice('bool', 'b'),

    type_int8:    $ => choice('int8',  'i8'),
    type_int16:   $ => choice('int16', 'i16'),
    type_int32:   $ => choice('int32', 'i32'),
    type_int64:   $ => choice('int64', 'i64'),

    type_uint8:   $ => choice('unsigned_int8',  'u8'),
    type_uint16:  $ => choice('unsigned_int16', 'u16'),
    type_uint32:  $ => choice('unsigned_int32', 'u32'),
    type_uint64:  $ => choice('unsigned_int64', 'u64'),

    type_float16: $ => choice('half',   'float16', 'h', 'f16'),
    type_float32: $ => choice('float',  'float32', 'f', 'f32'),
    type_float64: $ => choice('double', 'float64', 'd', 'f64'),

    type_string:  $ => choice('string', 's'),
    type_ref:     $ => choice('ref',    'r'),
    type_type:    $ => choice('type',   't'),

    // literals

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
