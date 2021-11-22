import React, { useCallback, useState, CSSProperties, JSXElementConstructor } from "react"

import {
  Elevated,  
  Styled,
  Paper,
  Typography,
} from "./mui"
import {  
  Flex,
  withHover,
  Item,
  ItemClickable,
  List,
} from "./layout"

const LIGHT_GRAY = "#fafafa"
const GRAY = "#EFEFEF"
const DARK_GRAY = "#E8E8E8"
const DARKER_GRAY = "#52575C"

const ROW_HEIGHT = 45
export interface HorizontalPadded { horizontalPadding?: number }
export interface TableTitleProps extends Styled, HorizontalPadded {
  title: string,
  textStyle?: CSSProperties,
}
export const TableTitle = ({ title, style, textStyle={}, horizontalPadding } : TableTitleProps) => (
  <Flex flex={1} alignItems="center" style={{ 
    paddingLeft: horizontalPadding, paddingRight: horizontalPadding, 
    backgroundColor: LIGHT_GRAY,
    minHeight: 60,
    ...style 
  }}> 
    <Typography component="h3" style={{ fontWeight: 600, fontSize: 18, ...textStyle }}>{title}</Typography>
  </Flex>
)

const defaultWidthForFields = (n: number) => n <= 0 ? '100%' : `${Math.floor(100/n)}%`

type Renderer <T> = (value: T) => React.ReactElement | string | number
export type TableField <T> = {
  key: string,
  label: string,
  render?: Renderer<T>,
  width?: CSSProperties['width'],
  textAlign?: CSSProperties['textAlign'],
}
export interface TableHeaderProps<T extends Item> extends Styled, HorizontalPadded {
  fields: TableField<T>[],
  textStyle?: CSSProperties,
  fontSize?: CSSProperties['fontSize']
}
export const TableHeader = <T extends Item>({ fields, style, textStyle, horizontalPadding, fontSize=15 } : TableHeaderProps<T>) => (
  <Flex flex={1} alignItems="center" justifyContent="space-between" style={{ 
    paddingLeft: horizontalPadding, paddingRight: horizontalPadding,
    minHeight: ROW_HEIGHT,
    backgroundColor: DARK_GRAY,
    ...style 
  }}>
    {fields.map(({ key, label, textAlign, width=defaultWidthForFields(fields.length) }) => (
      <Typography key={key} component="h5" style={{ 
        width: width, textAlign, fontSize,
        fontWeight: 600,
        ...textStyle 
      }}>
        {label}
      </Typography>
    ))}
  </Flex>
)

const ROW_DIVIDER_STYLE = `1px solid ${DARK_GRAY}` 

const get_display_value = <T,>(item: T, key: string, render?: Renderer<T>) => {
  if (render) { return render(item) }

  const value = item[key as keyof T]
  if (!(key in item)) console.warn(`Value missing for key ${key} while rendering Table without a specified render function.`)
  if (value === null || value === undefined) { return null }
  if (React.isValidElement(value)) { return value }
  if (typeof value === 'number') { return value }
  if (typeof (value as any).toString === 'function') { return (value as any).toString() }

  throw new Error(`Missing renderer in renderFields for key ${key}. The given value is not a valid React Element and does not have a toString() method.`)
}
export interface TableRowProps<T extends Item> extends Styled, HorizontalPadded, ItemClickable<T> {
  item: T,
  fields: TableHeaderProps<T>['fields']
  hoverColor?: CSSProperties['color'],
  fontSize?: CSSProperties['fontSize']
  textStyle?: CSSProperties,
}
export const TableRow = <T extends Item>({ item, fields, onClick, onPress, hoverColor=GRAY, horizontalPadding, style, textStyle, fontSize=14 } : TableRowProps<T>) => (
  withHover({ hoverColor, disabled: !(onClick ?? onPress) }, hoverStyle => (
    <Flex flex={1} alignItems="center" justifyContent="space-between" 
      onClick={() => (onClick ?? onPress)?.(item)}
      style={{ 
        paddingLeft: horizontalPadding, paddingRight: horizontalPadding, 
        minHeight: ROW_HEIGHT,
        backgroundColor: LIGHT_GRAY,
        ...hoverStyle,
        ...style 
      }}
    >
      {fields.map(({ key, width=defaultWidthForFields(fields.length), textAlign='left', render }) => (
        <Flex flex={1} key={key} 
          style={{ 
            textAlign, width: width, 
            color: DARKER_GRAY, fontSize, 
            ...textStyle
          }}
        >
          {get_display_value(item, key, render)}
        </Flex>
      ))}
    </Flex>
  ))
)

export interface PaginantionOptions {
  pageSize?: number;
  initialPage?: number;
}
export interface PaginationProps<T> extends PaginantionOptions {
  items: T[];
}
export const usePagination = <T,>({ items, pageSize=10, initialPage }: PaginationProps<T>) => {
  if (pageSize < 1) throw new Error("pageSize must be greater than 0")
  if (initialPage && initialPage < 0) throw new Error("initialPage must be a positive number")

  const count = items.length
  const numPages = Math.ceil(count / pageSize)

  const [selectedPage, setSelectedPage] = useState(initialPage ?? 0)

  const goToPage = useCallback((page: number) => {
    setSelectedPage(s => (s !== page && page <= numPages && page >= 0) ? page : s)
  }, [setSelectedPage, numPages])
  const goToNext = useCallback(() => {
    setSelectedPage(s => s <= numPages ? s + 1 : s)
  }, [setSelectedPage, numPages])
  const goToPrevious = useCallback(() => {
    setSelectedPage(s => s > 0 ? s - 1 : s)
  }, [setSelectedPage])
  const mapSelectedItems = useCallback(<R,>(apply: (item: T, info: { index: number, isLast: boolean }) => R) => {
    const mapped: R[] = []
    for (let i=selectedPage * pageSize; i < (selectedPage + 1) * pageSize && i < count; i++) {
      mapped.push(apply(items[i], { index: i, isLast: i === count -1 || i === (selectedPage + 1) * pageSize - 1 }))
    }
    return mapped
  }, [selectedPage, numPages, pageSize])

  return {
    selectedPage,
    numPages,
    goToNext,
    goToPrevious,
    goToPage,
    mapSelectedItems,
  }
}

export interface TableFooterProps extends Styled, HorizontalPadded, ReturnType<typeof usePagination> {}
export const TableFooter = ({ horizontalPadding, style } : TableFooterProps) => {
  return (
    <Flex flex={1} style={{ paddingLeft: horizontalPadding, paddingRight: horizontalPadding, ...style }}>

    </Flex>
  )
}

export type WithTitle = {
  title?: string; 
  TitleComponent?: JSXElementConstructor<TableTitleProps>;
} 
export type WithHeader<T extends Item> = {
  fields?: TableHeaderProps<T>['fields']; 
  HeaderComponent?: JSXElementConstructor<TableHeaderProps<T>>;
} 
export type WithRows <T extends Item> = {
  fields?: TableRowProps<T>['fields']; 
  hoverColor?: TableRowProps<T>['hoverColor']; 
  RowComponent?: JSXElementConstructor<TableRowProps<T>>;
} 
export type WithFooter = {
  paginated?: boolean;
  FooterComponent?: JSXElementConstructor<TableFooterProps>;
}
export interface TableProps<T extends Item> extends WithTitle, WithHeader<T>, WithFooter, WithRows<T>, 
  HorizontalPadded, Elevated, ItemClickable<T> 
{
  items: T[],
  fields: TableHeaderProps<T>['fields']; // make fields required
  pageOptions?: PaginantionOptions,
  paddingHorizontal?: number,
  headerFontSize?: CSSProperties['fontSize'],
  rowFontSize?: CSSProperties['fontSize'],
}
export const Table = <T extends Item>({
  items,
  pageOptions,
  style={},
  horizontalPadding=20,
  elevation=3,
  headerFontSize,
  rowFontSize,
  onClick,
  onPress,

  title,
  TitleComponent=TableTitle,
  fields,
  HeaderComponent=TableHeader,
  hoverColor,
  RowComponent=TableRow,
  FooterComponent=TableFooter,
}: TableProps<T> & Styled) => {
  const { ...paginationProps } = usePagination({ items, ...pageOptions, })
  RowComponent = RowComponent ?? TableRow // don't allow to be undefined 

  return (
    <Paper style={style} elevation={elevation}>
      <Flex column flex={1}>
        {title && TitleComponent && <TitleComponent title={title} horizontalPadding={horizontalPadding}/>}
        {fields && HeaderComponent && fields.length > 0 && 
          <HeaderComponent fields={fields} horizontalPadding={horizontalPadding} fontSize={headerFontSize}/>
        }
        <List items={paginationProps.mapSelectedItems(i => i)} 
          renderProps={{ horizontalPadding }}
          render={(item, index) => (
            <RowComponent key={item.id} item={item} fields={fields} fontSize={rowFontSize} hoverColor={hoverColor}
              horizontalPadding={horizontalPadding}
              style={{
                // borderTop
              }}
              onClick={onClick} onPress={onPress} 
            />
          )
        } />
        {FooterComponent && <FooterComponent {...paginationProps } horizontalPadding={horizontalPadding}/>}
      </Flex>
    </Paper>
  )
}

