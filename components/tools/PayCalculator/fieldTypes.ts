import type { FieldValues } from "./options";

export type FieldsProps = {
  values: FieldValues;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
};
