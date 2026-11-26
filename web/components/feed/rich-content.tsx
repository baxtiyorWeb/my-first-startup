"use client";

import React from "react";
import { FormattedContent } from "@/components/format";

interface RichContentProps {
  content: string;
  className?: string;
  searchQuery?: string;
}

/**
 * RichContent is unified with FormattedContent from the ContentFormatProvider.
 * Preserves backward compatibility across all call sites.
 */
export function RichContent({
  content,
  className = "",
  searchQuery,
}: RichContentProps) {
  return (
    <FormattedContent
      content={content}
      className={className}
      searchQuery={searchQuery}
    />
  );
}
