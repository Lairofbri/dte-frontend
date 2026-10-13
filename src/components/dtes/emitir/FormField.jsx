// src/components/dtes/emitir/FormField.jsx
// Envoltura del sistema de campos shadcn/ui (Field + FieldLabel + FieldContent)
// Reduce el ruido de los formularios: dato-invalid + error opcional + nota.

import { cn } from '@/lib/utils';
import {
  Field, FieldLabel, FieldContent, FieldDescription, FieldError,
} from '@/components/shadcn/field';

const FormField = ({
  label, req = false, error, note, children, className, htmlFor,
}) => (
  <Field data-invalid={!!error} className={cn('gap-2', className)}>
    {label && (
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {req && <span className="text-destructive" aria-hidden="true"> *</span>}
      </FieldLabel>
    )}
    <FieldContent>
      {children}
      {note && !error && <FieldDescription>{note}</FieldDescription>}
      {error && <FieldError errors={[error]} />}
    </FieldContent>
  </Field>
);

export default FormField;