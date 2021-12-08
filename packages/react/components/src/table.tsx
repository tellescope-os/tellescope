import React, { useCallback, useState, CSSProperties, JSXElementConstructor } from "react"

import {
  Button,
  Elevated,  
  Styled,
  Paper,
  Typography,

  NavigateBeforeIcon,
  NavigateNextIcon,
} from "./mui"
import {
  LabeledIconButton,
} from "./controls"
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
          justifyContent={textAlign === "right" ? 'flex-end' : 'flex-start'}
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

export interface PaginationOptions {
  paginated?: boolean; // defaults to true
  pageSize?: number;
  initialPage?: number;
}
export interface PaginationProps<T> extends PaginationOptions {
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
    previousDisabled: selectedPage === 0,
    nextDisabled: selectedPage === numPages - 1
  }
}

export interface TableFooterProps extends Styled, HorizontalPadded, ReturnType<typeof usePagination> {}
export const TableFooter = ({ horizontalPadding, style, previousDisabled, nextDisabled, selectedPage, numPages, goToNext, goToPrevious } : TableFooterProps) => {
  return (
    <Flex flex={1} alignItems="center"
      style={{ 
        paddingLeft: horizontalPadding, paddingRight: horizontalPadding, 
        borderTop: BORDER_STYLE,
        ...style,
      }}
    >
      {numPages > 1 && 
        <>
        <LabeledIconButton Icon={NavigateBeforeIcon} label="Previous" placement="bottom" color="primary"
          onClick={goToPrevious} disabled={previousDisabled} 
        />
        <LabeledIconButton Icon={NavigateNextIcon} label="Next" placement="bottom" color="primary"
          onClick={goToNext} disabled={nextDisabled}
        />
        </>
      }
      <Typography style={{ fontSize: 12, marginLeft: 'auto' }}>
        Page {selectedPage + 1} of {numPages}
      </Typography>
    </Flex>
  )
}

// returns diaply numbers, not index
const resolve_middle_page_numbers = (selectedPage: number, numPages: number): [undefined | number, undefined | number, undefined | number] => {
  if (numPages <= 2) return [undefined, undefined, undefined]
  if (numPages === 3) return [undefined, 2, undefined]
  if (numPages === 4) return [2, 3, undefined]

  if (selectedPage <= 2) return [2, 3, 4]
  if (selectedPage >= numPages - 2) return [numPages - 3, numPages - 2, numPages - 1]

  return [selectedPage, selectedPage + 1, selectedPage + 2]
}

const FOOTER_BUTTON_SIZE = 30
export const TableFooterNumbered = ({ horizontalPadding, style, previousDisabled, nextDisabled, selectedPage, numPages, goToNext, goToPrevious, goToPage } : TableFooterProps) => {
  const [middleLeft, middle, middleRight] = resolve_middle_page_numbers(selectedPage, numPages)

  const buttonProps = { 
    color: "primary" as "primary", 
    variant: "contained" as "contained", 
    style: { 
      minHeight: FOOTER_BUTTON_SIZE, 
      height: FOOTER_BUTTON_SIZE, 
      minWidth: FOOTER_BUTTON_SIZE, 
      width: FOOTER_BUTTON_SIZE, 
      marginTop: 3,
      marginBottom: 3,
      marginRight: 1,
    } 
  }
                    
  return (
    <Flex flex={1} alignItems="center"
      style={{ 
        paddingLeft: horizontalPadding, paddingRight: horizontalPadding, 
        borderTop: BORDER_STYLE,
        ...style,
      }}
    >
      {numPages > 1 && 
        <>
        <Button disabled={previousDisabled} {...buttonProps} onClick={goToPrevious}>
          <NavigateBeforeIcon/>
        </Button>
        <Button disabled={previousDisabled} { ...buttonProps } onClick={() => goToPage(0)}>
          1
        </Button>

        {/* index is 1 below display number */}
        {middleLeft !== undefined && 
          <Button disabled={selectedPage === middleLeft - 1} {...buttonProps} onClick={() => goToPage(middleLeft - 1)}>
            {middleLeft}
          </Button> 
        }
        {middle !== undefined && 
          <Button disabled={selectedPage === middle - 1} {...buttonProps} onClick={() => goToPage(middle - 1)}>
            {middle}
          </Button> 
        }
        {middleRight !== undefined && 
          <Button disabled={selectedPage === middleRight - 1} {...buttonProps} onClick={() => goToPage(middleRight - 1)}> 
            {middleRight}
          </Button> 
        }

        <Button disabled={nextDisabled} {...buttonProps} onClick={() => goToPage(numPages - 1)}>
          {numPages}
        </Button>

        <Button disabled={nextDisabled} {...buttonProps} onClick={goToNext}>
          <NavigateNextIcon/>
        </Button>
        </>
      }

      <Typography style={{ fontSize: 12, marginLeft: 'auto' }}>
        Page {selectedPage + 1} of {numPages}
      </Typography>
    </Flex>
  )
}

const BORDER_STYLE = `1px solid ${GRAY}`
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
  pageOptions?: PaginationOptions,
  paddingHorizontal?: number,
  headerFontSize?: CSSProperties['fontSize'],
  rowFontSize?: CSSProperties['fontSize'],
  footerStyle?: 'numbered' | 'prev-next' 
}
export const Table = <T extends Item>({
  items,
  pageOptions={ paginated: true },
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
  footerStyle='numbered',
  FooterComponent=footerStyle === 'numbered' ? TableFooterNumbered : TableFooter, 
}: TableProps<T> & Styled) => {
  const paginated = pageOptions.paginated !== false // default to true
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
          render={(item, { index }) => (
            <RowComponent key={item.id} item={item} fields={fields} fontSize={rowFontSize} hoverColor={hoverColor}
              horizontalPadding={horizontalPadding}
              style={{
                borderBottom: (
                  index < items.length - 1 && 
                  (pageOptions.pageSize === undefined || index < pageOptions.pageSize - 1)) 
                    ? BORDER_STYLE 
                    : undefined,
              }}
              onClick={onClick} onPress={onPress} 
            />
          )
        } />
        {paginated && FooterComponent && 
          <FooterComponent {...paginationProps } {...pageOptions} horizontalPadding={horizontalPadding}/>
        }
      </Flex>
    </Paper>
  )
}

