import { IsCPFConstraint } from './is-cpf.validator';

describe('IsCPFConstraint', () => {
  let validator: IsCPFConstraint;

  beforeEach(() => {
    validator = new IsCPFConstraint();
  });

  describe('validate', () => {
    it('should return true for valid unformatted CPF', () => {
      expect(validator.validate('11144477735')).toBe(true);
    });

    it('should return true for valid formatted CPF', () => {
      expect(validator.validate('111.444.777-35')).toBe(true);
    });

    it('should return false for invalid checksum', () => {
      expect(validator.validate('11144477736')).toBe(false);
    });

    it('should return false for repeated digits (blacklisted)', () => {
      expect(validator.validate('11111111111')).toBe(false);
      expect(validator.validate('00000000000')).toBe(false);
      expect(validator.validate('99999999999')).toBe(false);
    });

    it('should return false for invalid lengths', () => {
      expect(validator.validate('123')).toBe(false);
      expect(validator.validate('111444777351')).toBe(false);
    });

    it('should return false for null/undefined/empty input', () => {
      expect(validator.validate('')).toBe(false);
      expect(validator.validate(null as unknown as string)).toBe(false);
      expect(validator.validate(undefined as unknown as string)).toBe(false);
    });

    it('should validate generated real CPFs', () => {
      expect(validator.validate('52998224725')).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('should return default error message', () => {
      expect(validator.defaultMessage()).toBe('Invalid CPF checksum');
    });
  });
});
