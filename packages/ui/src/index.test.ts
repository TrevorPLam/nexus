import { describe, it, expect } from 'vitest';

import { Button, Card, Input, Badge, Modal, Select, Checkbox, TextArea } from './index';

describe('UI Package', () => {
  describe('Barrel Exports', () => {
    it('exports Button component', () => {
      expect(Button).toBeDefined();
    });

    it('exports Card component', () => {
      expect(Card).toBeDefined();
    });

    it('exports Input component', () => {
      expect(Input).toBeDefined();
    });

    it('exports Badge component', () => {
      expect(Badge).toBeDefined();
    });

    it('exports Modal component', () => {
      expect(Modal).toBeDefined();
    });

    it('exports Select component', () => {
      expect(Select).toBeDefined();
    });

    it('exports Checkbox component', () => {
      expect(Checkbox).toBeDefined();
    });

    it('exports TextArea component', () => {
      expect(TextArea).toBeDefined();
    });

    it('exports all components from barrel file', () => {
      const components = { Button, Card, Input, Badge, Modal, Select, Checkbox, TextArea };
      Object.values(components).forEach((component) => {
        expect(component).toBeDefined();
      });
    });
  });
});
