import {
  LoadedData,
} from "@tellescope/types-utilities"

import LinearProgress from '@mui/material/LinearProgress';

interface LoadingElement <T>{
  data: LoadedData<T>,
  render: (data: T) => React.ReactElement,
}

export const LoadingLinear = <T,>({ data, render }: LoadingElement<T>) => {
  if (data === 'loading') return <LinearProgress/>
  return render(data)
}