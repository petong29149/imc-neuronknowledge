import { create, all } from 'mathjs';
import type { BuiltinTool } from '@/lib/builtin-tools/types';

const MAX_EXPRESSION_LENGTH = 500;

// Expressions come from the model, which the user can steer, so evaluate them in a
// mathjs instance with the functions that can reach outside plain arithmetic removed
// (see https://mathjs.org/docs/expressions/security.html). Never eval()/Function().
const math = create(all);
const limitedEvaluate = math.evaluate;

const disabled = (name: string) => () => {
  throw new Error(`Function ${name} is disabled`);
};
math.import(
  Object.fromEntries(
    [
      // Parser and extension entry points
      'import', 'createUnit', 'reviver', 'evaluate', 'parse', 'compile', 'resolve',
      'simplify', 'simplifyConstant', 'simplifyCore', 'derivative', 'rationalize',
      // Matrix builders an expression could use to allocate huge amounts of memory
      'zeros', 'ones', 'identity', 'range', 'matrix', 'sparse', 'diag', 'resize',
    ].map((name) => [name, disabled(name)])
  ),
  { override: true }
);

export const calculatorTool: BuiltinTool = {
  name: 'calculator',
  label: 'เครื่องคิดเลข',
  definition: () => ({
    type: 'function',
    function: {
      name: 'calculator',
      description:
        'Evaluate a math expression exactly. Use this for ANY arithmetic instead of computing in your head. ' +
        'Supports + - * / ^ %, parentheses, sqrt, abs, round(x, n), floor, ceil, log, log10, exp, ' +
        'sin/cos/tan, pi, e, and unit conversion such as "5 km to mile". Percent: write 7% as 0.07.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The expression, e.g. "10000 * (1 + 0.05/12)^(12*3)"',
          },
        },
        required: ['expression'],
      },
    },
  }),
  execute: async (args) => {
    const expression = typeof args.expression === 'string' ? args.expression.trim() : '';
    if (!expression) {
      return { content: 'Error: "expression" is required.', isError: true };
    }
    if (expression.length > MAX_EXPRESSION_LENGTH) {
      return {
        content: `Error: expression is longer than ${MAX_EXPRESSION_LENGTH} characters. Split it into smaller steps.`,
        isError: true,
      };
    }

    try {
      const result = limitedEvaluate(expression, {});
      if (typeof result === 'function') {
        return { content: 'Error: the expression did not produce a value.', isError: true };
      }
      return { content: `${expression} = ${math.format(result, { precision: 14 })}`, isError: false };
    } catch (err: any) {
      return { content: `Error: ${err?.message || 'invalid expression'}`, isError: true };
    }
  },
};
