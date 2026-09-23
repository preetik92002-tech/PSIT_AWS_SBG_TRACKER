/**
 * AWSLogo — Canonical AWS logo component.
 *
 * Uses the official brand asset at /assets/aws-logo.png.
 * Preserves aspect ratio at all sizes. No distortion, no effects.
 *
 * Sizes:
 *   xs  — 32 px tall  (sidebar collapsed / mobile header)
 *   sm  — 44 px tall  (auth page header compact)
 *   md  — 56 px tall  (auth page header standard)
 *   lg  — 72 px tall  (onboarding / landing)
 *   xl  — 96 px tall  (hero / marketing)
 *
 * variant="inverted" applies a CSS filter to render the logo
 * white-on-dark, suitable for dark sidebar backgrounds.
 */
import React from 'react'

const SIZE_MAP = {
  xs: 32,
  sm: 44,
  md: 56,
  lg: 72,
  xl: 96,
} as const

export type AWSLogoSize    = keyof typeof SIZE_MAP
export type AWSLogoVariant = 'default' | 'inverted'

interface AWSLogoProps {
  size?:      AWSLogoSize
  variant?:   AWSLogoVariant
  className?: string
  /** Override height in px (width stays auto to preserve ratio) */
  height?:    number
  alt?:       string
}

export const AWSLogo: React.FC<AWSLogoProps> = ({
  size      = 'sm',
  variant   = 'default',
  className = '',
  height,
  alt       = 'AWS',
}) => {
  const h = height ?? SIZE_MAP[size]

  return (
    <img
      src="/assets/aws-logo.png"
      alt={alt}
      height={h}
      style={{
        height: h,
        width: 'auto',
        display: 'block',
        objectFit: 'contain',
        // On dark backgrounds the logo needs to be brightened so it stays visible.
        // The original logo has a transparent background.
        filter: variant === 'inverted' ? 'brightness(0) invert(1)' : undefined,
        flexShrink: 0,
      }}
      className={className}
      draggable={false}
    />
  )
}
