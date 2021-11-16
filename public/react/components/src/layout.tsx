import React, { CSSProperties } from "react";
import { ViewStyle } from "react-native"

import {
  ClickableWeb,
  Styled,
} from "./mui"

interface ConditionalWrap_T <P extends {}>{
  condition: boolean,
  Wrapper: React.JSXElementConstructor<P>,
  wrapperProps: P,
  children: React.ReactNode
}
export const ConditionalWrap = <P,>({ condition, Wrapper, wrapperProps, children } : ConditionalWrap_T<P>) => {
  if (condition) return <Wrapper {...wrapperProps}>{children}</Wrapper>
  return <>{children}</>
}

// type FlexByBreakpoint = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export interface Flex_T {
  row?: boolean,
  column?: boolean,
  flex?: number,
  shrink?: number,
  children?: React.ReactNode,
  reverse?: boolean,
  wrap?: CSSProperties['flexWrap'] & ViewStyle['flexWrap'],
  alignItems?: CSSProperties['alignItems'] & ViewStyle['alignItems'],
  alignContent?: CSSProperties['alignContent'] & ViewStyle['alignContent'],
  justifyContent?: CSSProperties['justifyContent'] & ViewStyle['justifyContent'],
  alignSelf?: CSSProperties['alignSelf'] & ViewStyle['alignSelf'],
}

interface Flex_Web extends Flex_T, Styled, ClickableWeb {
  // xs?: FlexByBreakpoint;
  // sm?: FlexByBreakpoint;
  // md?: FlexByBreakpoint;
  // lg?: FlexByBreakpoint;
  // xl?: FlexByBreakpoint;
}

export const resolve_direction_for_props = (row?: boolean, col?: boolean) => (
    row ? 'row' 
  : col ? 'column' 
  : 'row' // default to row, like web
)

export const compute_flex_direction_with_props = <T extends string>(direction: T, reverse?: boolean) => (
  reverse === true
    ? direction + '-reverse' as `${T}-reverse`
    : direction
)

export const Flex = (props: Flex_Web) => {
  const direction = resolve_direction_for_props(props.row, props.column)
  const flexDirection = compute_flex_direction_with_props(direction, props.reverse)
  const flex = props.flex ?? 0
  const flexShrink = props.shrink ?? 1 // same default as web
  const children = props.children ?? null
  const wrap = props.wrap  ?? 'wrap'

  return (
    <div style={{
        alignItems: props.alignItems, 
        alignContent: props.alignContent ?? 'stretch', // web default 
        justifyContent: props.justifyContent, 
        alignSelf: props.alignSelf, 
        flex, 
        flexDirection,
        flexWrap: wrap,
        display: 'flex', 
        flexShrink,
        ...props.style, 
      }} 
      onClick={props.onClick ?? props.onPress}
    >
      {children}
    </div>
  )
}

export interface FormProps {
  onSubmit: () => void;
  children?: React.ReactNode;
}
export const Form = ({ onSubmit, children }: FormProps) =>  {
  return <form onSubmit={onSubmit}>{children}</form>
}
export const SUPPORTS_FORMS = true


export type Item = { id: string }
export type ItemRenderer <T extends Item> = (item: T, props: { onClick?: (s: string) => void, index: number }) => React.ReactElement
export interface ListOptions <T extends Item>{
  render: ItemRenderer<T>,
}
export interface ItemOptions <T extends Item>{
  item: T,
  index: number,
  onClick?: (id: string) => void;
}

export const ObjectHeader = <T extends Item>({ item }: ItemOptions<T>) => {
  return (
    <Flex row>
    {  
      Object.keys(item).map(k => {
        return (
          <Flex key={k}>{k}</Flex> 
        )  
      })
    }
    </Flex>
  )
}
export const ObjectRow = <T extends Item>({ item, onClick, index }: ItemOptions<T>) => {
  return (
    <Flex row>
    {
      Object.keys(item).map((_k, i) => {
        const key = _k as keyof T
        return (
          <Flex column key={_k ?? i} onClick={() => onClick?.(item.id ?? index.toString())}>
            {typeof item[key] === 'object' 
              ? JSON.stringify(item[key])
              : item[key]
            }
          </Flex> 
        )
      })
    }
    </Flex>
  )
}

export interface ListItem_T <T extends Item> extends ListOptions<T>, ItemOptions<T> {}
export const ListItem = <T extends Item>({ item, index, render, onClick }: ListItem_T<T>) => {
  if (render) return render(item, { index, onClick })

  return <ObjectRow item={item} index={index} onClick={onClick}/>
}

export interface List_T <T extends Item> extends ListOptions<T> {
  items: T[],
  header?: React.ReactNode,
  onClick?: (id: string) => void;
  reverse?: boolean
}
export const List = <T extends Item>({ items, render, onClick, reverse, style }: List_T<T> & Styled) => {
  return (
    <Flex flex={1} column reverse={reverse} style={style}>
      {items.map((item, i) => <ListItem key={item.id ?? i} index={i} item={item} render={render} onClick={onClick}/>)}
    </Flex>
  )
}