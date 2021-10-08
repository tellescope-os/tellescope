import React from "react";

type FlexByBreakpoint = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

interface Flex_T {
  flex?: number,
  direction?: "row" | "row-reverse" | "column" | "column-reverse",
  children?: React.ReactNode,
  xs?: FlexByBreakpoint;
  sm?: FlexByBreakpoint;
  md?: FlexByBreakpoint;
  lg?: FlexByBreakpoint;
  xl?: FlexByBreakpoint;
}

export const Flex = (props: Flex_T) => {
  const direction = props.direction ?? 'row'
  const flex = props.flex ?? 1
  const children = props.children ?? null

  return (
    <div style={{ flex, flexDirection: direction }}>
      {children}
    </div>
  )
}