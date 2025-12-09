import { describe, it, expect } from 'vitest';
import { parser } from './src/index';

describe('@tandem-lang/grammar', () => {
  it('parses a simple module declaration', () => {
    const tree = parser.parse('module domain.user');
    const cursor = tree.cursor();
    expect(cursor.name).toBe('Program');
    
    // Move to the first child
    cursor.firstChild();
    
    expect(cursor.name).toBe('ModuleDecl');

    // Ensure there are no more siblings
    expect(cursor.nextSibling()).toBe(false);
  });
});
