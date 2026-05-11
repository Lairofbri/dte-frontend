// src/components/ui/Input.jsx
// Input reutilizable con label, error y accesibilidad completa
// Compatible con React Hook Form via prop register

const Input = ({
  id,
  label,
  type        = 'text',
  placeholder = '',
  error,
  helperText,
  required    = false,
  disabled    = false,
  className   = '',
  register,   // objeto de React Hook Form
  ...rest
}) => {
  const errorId  = error     ? `${id}-error`  : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;

  // aria-describedby une el input con su mensaje de error o ayuda
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        aria-required={required}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...(register ?? {})}
        {...rest}
      />

      {helperText && !error && (
        <p id={helperId} className="text-xs text-gray-400 mt-1">
          {helperText}
        </p>
      )}

      {error && (
        <p id={errorId} className="error-msg" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
