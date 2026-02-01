import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId } from 'react';
import clsx from 'clsx';

interface BaseProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseProps {
  multiline?: false;
  rows?: never;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseProps {
  multiline: true;
  rows?: number;
}

type Props = InputProps | TextareaProps;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  (
    { label, error, helperText, required, containerClassName, className, id, multiline, rows, ...props },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const inputClassName = clsx(
      'input',
      error && 'input-error',
      className
    );

    return (
      <div className={clsx('space-y-1', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {multiline ? (
          <textarea
            ref={ref as any}
            id={inputId}
            rows={rows || 4}
            className={inputClassName}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            value={(props as TextareaHTMLAttributes<HTMLTextAreaElement>).value ?? ''}
          />
        ) : (
          <input
            ref={ref as any}
            id={inputId}
            className={inputClassName}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
            value={(props as InputHTMLAttributes<HTMLInputElement>).value ?? ''}
          />
        )}

        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
