"use client";

/*
MIT License
Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


// shadcn/ui's Radix variant, styled by the application's brand tokens.
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { useState, type ComponentProps, type ReactNode } from "react";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
function CollapsibleContent({
  open,
  className = "",
  contentClassName = "",
  children,
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Content> & {
  open: boolean;
  contentClassName?: string;
}) {
  return (
    <CollapsiblePrimitive.Content
      {...props}
      forceMount
      hidden={false}
      inert={!open}
      aria-hidden={!open}
      className={`collapsible-content ${className}`}
    >
      {/* Radix disables transitions while measuring; the inner grid owns the reveal. */}
      <div className="collapsible-reveal">
        <div className={`collapsible-inner ${contentClassName}`}>{children}</div>
      </div>
    </CollapsiblePrimitive.Content>
  );
}

export function Disclosure({
  title,
  children,
  className,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  return (
    <Collapsible className={className} open={open} onOpenChange={(next) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    }}>
      <CollapsibleTrigger className="disclosure-trigger">
        <svg className="disclosure-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        <span className="disclosure-title">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent open={open}>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
