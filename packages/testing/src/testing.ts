import "@tellescope/types"

const SILENT = false // only log errors
const LOG_PASSING = true // logs all success messages, overridden by SILENT
const EXIT_ON_FIRST_ERROR = true

// see for console colors:
//  https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
const PASSED = 0
const FAILED = 1
const TS_WIDTH = 8
const MAX_NAME_LENGTH = 70 
const DEFAULT_BENCHMARK = 20
export const log_header = (n='') => console.log(
  "\x1b[35m", 'Test' + (n ? ` (${n})` : '') + ' '.repeat(MAX_NAME_LENGTH - n.length - 4) + 'Runtime    Benchmark' // jank based on TS_WIDTH and MAX_NAME_LENGTH
)
const log_and_return = ({ r=PASSED | FAILED, m='', runTime=-1, benchmark=DEFAULT_BENCHMARK }) => { 
  if (r === FAILED) {
    console.error("\x1b[31m", m) // always log errors, in red
    if (EXIT_ON_FIRST_ERROR) process.exit(1)
    return FAILED
  }
  
  let runtimeText = ' '.repeat(TS_WIDTH)
  let benchmarkText = ' '.repeat(TS_WIDTH)

  if (runTime >= 0) { // ensure default is < 0 to avoid reporting a value unless 1 is provided
    runtimeText = `(${runTime}ms)`
    if (runtimeText.length < TS_WIDTH) {
      runtimeText = runtimeText + ' '.repeat(TS_WIDTH - runtimeText.length)
    }
  }  
  if (benchmark) {
    benchmarkText = `[${benchmark}ms]`
    if (benchmarkText.length < TS_WIDTH) {
      benchmarkText = ' '.repeat(TS_WIDTH - benchmarkText.length) + benchmarkText
    }
  }

  if (runTime > benchmark) console.log("\x1b[33m", m, "\x1b[31m", runtimeText, "\x1b[36m", benchmarkText) 
  else if (LOG_PASSING && !SILENT) console.log("\x1b[32m", m, '', runtimeText, '', benchmarkText) // '' added to align with if case
  return r
}

export const asPromise = <T>(f: (...args: any[]) => T) => new Promise<T>((resolve, reject) => {
  try {
    resolve(f())
  } catch(err) {
    reject(err)
  }
})

type async_test_options_T <T>= {
  shouldError?: false;
  expectedResult?: T;
  onResult?: (r: T) => boolean;
  benchmark?: number;
}
type async_test_options_error_T <E=APIError>= {
  shouldError: true;
  onError?: (e: E) => boolean;
  benchmark?: number;
}

const handle_unexpected_error = (e: any) => {
  console.error(e)
  return false
}

const with_title_spacing = (name='') => {
  if (name.length < MAX_NAME_LENGTH) {
    name += ' '.repeat(MAX_NAME_LENGTH - name.length)
  } else {
    name = name.substring(0, MAX_NAME_LENGTH - 3) + '...'
  }
  return name
}

export const async_test = async <T, E=APIError>(
  name: string, 
  run_test: () => Promise<T>, 
  options: async_test_options_T<T> | async_test_options_error_T<E>
) =>  
{
  const { 
    expectedResult, 
    onResult=(r: T) => r === expectedResult, 
    onError=handle_unexpected_error,
    shouldError=false, 
    benchmark=50,
  } = options as async_test_options_T<T> & async_test_options_error_T<E>

  const startTime = Date.now()

  name = with_title_spacing(name)

  return (
    run_test()
    .then((r: any) => log_and_return(
      shouldError 
        ? { r: FAILED, m: `${name} passed with result ${JSON.stringify(r)} but was expecting error ${expectedResult}` }
        : onResult(r)
          ? { r: PASSED, m: `${name}`, runTime: Date.now() - startTime, benchmark }
          : { r: FAILED, m: `${name} failed with the wrong result. Expected ${expectedResult} but got ${JSON.stringify(r)}` }
    ))
    .catch((e: E) => log_and_return(
      !shouldError 
        ? { r: FAILED, m: `${name} failed with error ${JSON.stringify(e)} while expecting ${expectedResult}` }
        : onError(e)
          ? { r: PASSED, m: `${name}`, runTime: Date.now() - startTime, benchmark  }
          : { r: FAILED, m: `${name} failed with the wrong error. Expected ${expectedResult} but got ${JSON.stringify(e)}`}
    ))
  )
}

export const assert = (assertion: boolean, message: string, title='') => {
  log_and_return({ 
    r: assertion ? PASSED : FAILED,
    m: assertion === true ? with_title_spacing(title) : message,
    runTime: 0,
    benchmark: 1,
  })
}

export const wait = (f?: Promise<void>, ms=1000) => new Promise<void>((resolve, reject) => {
  setTimeout(() => f ? f.then(resolve).catch(reject) : resolve(), ms)
})
