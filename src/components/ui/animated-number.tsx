"use client";

/*
MIT License
Copyright (c) 2026 Saurabh Chauhan

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


// Adapted from https://beui.dev/r/number: local styles and a stable accessible value.
import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (reduce) {
      if (element.current) element.current.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (current) => {
        if (element.current) element.current.textContent = format(current);
      },
    });
    return () => controls.stop();
  }, [value, format, reduce]);

  return (
    <span className="animated-number">
      <span className="visually-hidden">{format(value)}</span>
      <span ref={element} aria-hidden="true">{format(value)}</span>
    </span>
  );
}
