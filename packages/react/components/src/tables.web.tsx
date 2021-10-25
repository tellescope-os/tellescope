import {
  Flex,
} from "./layout.web"

type Item = { id?: string }
type ItemRenderer <T extends Item> = (item: T) => React.ReactElement
interface ListOptions <T extends Item>{
  render?: ItemRenderer<T>,
}
interface ItemOptions <T extends Item>{
  item: T,
}

export const ObjectHeader = <T extends Item>({ item }: ItemOptions<T>) => {
  return (
    <Flex>
    {  
      Object.keys(item).map(k => {
        return (
          <Flex>{k}</Flex> 
        )  
      })
    }
    </Flex>
  )
}
export const ObjectRow = <T extends Item>({ item }: ItemOptions<T>) => {
  return (
    <Flex>
    {
      Object.keys(item).map(_k => {
        const key = _k as keyof T
        return (
          <Flex>
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

interface ListItem_T <T extends Item> extends ListOptions<T>, ItemOptions<T> {}
export const ListItem = <T extends Item>({ item, render }: ListItem_T<T>) => {
  if (render) return render(item)

  return <ObjectRow item={item}/>
}

interface List_T <T extends Item> extends ListOptions<T> {
  items: T[],
  header?: React.ReactNode,
}
export const List = <T extends Item>({ items, render }: List_T<T>) => {
  return (
    <Flex>
      {items.map((item, i) => <ListItem key={item.id ?? i}  item={item} render={render}/>)}
    </Flex>
  )
}