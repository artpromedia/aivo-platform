type ClassPrimitive = string | number | boolean | null | undefined;
type ClassArray = ClassPrimitive[] | ClassArray[];
type ClassValue = ClassPrimitive | ClassArray;

export function cn(...values: ClassValue[]): string {
  const flatten = (items: ClassValue[]): ClassPrimitive[] => {
    const result: ClassPrimitive[] = [];
    for (const item of items) {
      if (Array.isArray(item)) {
        result.push(...flatten(item as ClassValue[]));
      } else {
        result.push(item);
      }
    }
    return result;
  };

  return flatten(values)
    .filter((v): v is string => typeof v === 'string' && v !== '')
    .join(' ');
}
