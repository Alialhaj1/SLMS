/**
 * BarcodeDisplay — Renders a scannable barcode using JsBarcode (SVG).
 * Supports EAN-13, EAN-8, UPC-A, CODE-128, CODE-39, ITF.
 */
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeDisplayProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  showText?: boolean;
  fontSize?: number;
  className?: string;
  textMargin?: number;
  margin?: number;
  lineColor?: string;
  background?: string;
}

// Map barcode_type from DB to JsBarcode format
function resolveFormat(format: string | undefined, value: string): string {
  if (!format) return autoDetectFormat(value);
  const map: Record<string, string> = {
    'EAN-13': 'EAN13',
    'EAN-8': 'EAN8',
    'UPC-A': 'UPC',
    'CODE-128': 'CODE128',
    'CODE-39': 'CODE39',
    'CODE128': 'CODE128',
    'CODE39': 'CODE39',
    'ITF': 'ITF',
    'QR': 'CODE128', // fallback — QR not supported by JsBarcode
  };
  return map[format.toUpperCase()] || map[format] || 'CODE128';
}

function autoDetectFormat(value: string): string {
  if (!value) return 'CODE128';
  const digits = /^\d+$/.test(value);
  if (digits && value.length === 13) return 'EAN13';
  if (digits && value.length === 12) return 'UPC';
  if (digits && value.length === 8) return 'EAN8';
  return 'CODE128';
}

export default function BarcodeDisplay({
  value,
  format,
  width = 1.5,
  height = 40,
  showText = true,
  fontSize = 12,
  className = '',
  textMargin = 2,
  margin = 4,
  lineColor = '#000000',
  background = 'transparent',
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      const fmt = resolveFormat(format, value);
      JsBarcode(svgRef.current, value, {
        format: fmt,
        width,
        height,
        displayValue: showText,
        fontSize,
        textMargin,
        margin,
        lineColor,
        background,
        flat: false,
        valid: () => {},
      });
    } catch {
      // If barcode format fails, fallback to CODE128
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue: showText,
          fontSize,
          textMargin,
          margin,
          lineColor,
          background,
          flat: false,
        });
      } catch {
        // failed completely — SVG will remain empty
      }
    }
  }, [value, format, width, height, showText, fontSize, textMargin, margin, lineColor, background]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}

/**
 * Compact barcode for table cells — small with text below
 */
export function BarcodeCompact({
  value,
  format,
  className = '',
}: {
  value: string;
  format?: string;
  className?: string;
}) {
  return (
    <BarcodeDisplay
      value={value}
      format={format}
      width={1}
      height={28}
      showText={true}
      fontSize={10}
      textMargin={1}
      margin={2}
      className={className}
    />
  );
}

/**
 * Large barcode for detail view / print — fully scannable
 */
export function BarcodeLarge({
  value,
  format,
  className = '',
}: {
  value: string;
  format?: string;
  className?: string;
}) {
  return (
    <BarcodeDisplay
      value={value}
      format={format}
      width={2}
      height={60}
      showText={true}
      fontSize={14}
      textMargin={4}
      margin={8}
      className={className}
    />
  );
}
