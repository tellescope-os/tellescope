import React, { HTMLInputTypeAttribute, CSSProperties } from "react"

import { Formik, FormikProps  } from 'formik';
import * as Yup from 'yup';

import {
  Button,
  CircularProgress,
  Styled,
  TextField,
  Typography,
 } from "./mui"

import {
  Flex,
  Form,
  SUPPORTS_FORMS,
} from "./layout"


export interface HasValidator { validator: Yup.AnySchema }
export interface HasValidators { [index: string]: HasValidator }

export type InputSchema<T extends HasValidators, V=any> = {
  [K in (keyof T) & string]: {
    validator: T[K]['validator'];
    initialValue?: Yup.InferType<T[K]['validator']>,
    id?: string,
    name?: string,
    label?: string,
    type?: string,
    values?: V[],
    style?: CSSProperties,
  }
}

// for help with type inference, flexibility to add modifications later
export const create_input_schema = <T extends InputSchema<any>>(o: T): InputSchema<T> => o

export const validation_for_input_schema = <T extends InputSchema<any>>(schema: T) => {
  const validationObject = {} as { [K in keyof T]: T[K]['validator'] }
  for (const field in schema) {
    validationObject[field] = schema[field].validator
  }
  return Yup.object(validationObject)
}
export const initial_values_for_input_schema = <T extends InputSchema<any>>(schema: T, dynamicallySet={} as { [K in keyof T]?: Yup.InferType<T[K]['validator']> }) => {
  const initial_values = {} as { [K in keyof T]?: Yup.InferType<T[K]['validator']> }
  for (const field in schema) {
    initial_values[field] = dynamicallySet[field] ?? schema[field].initialValue
  }
  return initial_values
}

// formik requires string signature but will cast numbers appropriately
export const initial_values_for_formik = <T extends InputSchema<any>>(schema: T, dynamicallySet={} as { [K in keyof T]?: Yup.InferType<T[K]['validator']> }) => (
  initial_values_for_input_schema(schema, dynamicallySet) as {[ K in keyof T]: string }
)

export type AutoComplete = "name"
  | "honorific-prefix"
  | "given-name"
  | "additional-name"
  | "family-name"
  | "honorific-suffix"
  | "nickname"
  | "username"
  | "new-password"
  | "current-password"
  | "one-time-code"
  | "organization-title"
  | "organization"
  | "street-address"
  | "address-line1"
  | "address-line2"
  | "address-line3"
  | "address-level4"
  | "address-level3"
  | "address-level2"
  | "address-level1"
  | "country"
  | "country-name"
  | "postal-code"
  | "cc-name"
  | "cc-given-name"
  | "cc-additional-name"
  | "cc-family-name"
  | "cc-number"
  | "cc-exp"
  | "cc-exp-month"
  | "cc-exp-year"
  | "cc-csc"
  | "cc-type"
  | "transaction-currency"
  | "transaction-amount"
  | "language"
  | "bday"
  | "bday-day"
  | "bday-month"
  | "bday-year"
  | "sex"
  | "url"
  | "photo"

type YupValidator = ReturnType<typeof Yup.string>
type StringValidation = (o?: { max?: number, min?: number, required?: string }) => ReturnType<typeof Yup.string>
const stringValidation: StringValidation = (o) => 
  Yup.string()
     .max(o?.max ?? 1000)
     .min(o?.min ?? 0)
     .required(o?.required ?? "Required")

export const validators = {
  firstName: stringValidation({ max: 25 }),
  lastName: stringValidation({ max: 40 }),
  email: stringValidation({ max: 1000 }).email("Invalid email address"),
  password: stringValidation({ min: 8, max: 100, })
            .matches(/[a-z]/, "Must contain a lowercase letter")
            .matches(/[A-Z]/, "Must contain an uppercase letter")
            .matches(/[0-9@#!$%^&*(){}[\];:\\|'",<.>/?]/, "Must contain a number or special character"),
}

interface MuiComponentProps <V> {
  id: string,
  name: string,
  label: string,
  value: V,
  onChange: (e: V) => void,
  onBlur: (e: any) => void,
  required: boolean,
  type?: HTMLInputTypeAttribute,
  style?: any,
}

interface MuiFormikComponentProps <V> extends MuiComponentProps <V> {
  error: boolean,
  helperText: React.ReactNode,
}

interface FormFieldInfo <T, ID extends keyof T, V=T[ID]>{
  id: ID & string,
  autoComplete?: AutoComplete,
  name?: string,
  label?: string,
  initialValue?: V,
}

interface FormField <T, ID extends keyof T, P={}, V=T[ID],  CMui=MuiComponentProps<V>, CFormik=MuiFormikComponentProps<V>> extends FormFieldInfo<T, ID, V> {
  validation: ReturnType<typeof Yup.string>,
  Component: (props: any) => React.ReactElement,
  componentProps?: Partial<CMui & P>,
}

export const emailInput = <T, ID extends keyof T>(
  { 
    id, 
    name=id, 
    label=id, 
    initialValue='', 
    required=true, 
    autoComplete="username",
    ...props
  }: FormFieldInfo<T, ID, string> & Partial<MuiComponentProps<string>> 
): FormField<T, ID, Parameters<typeof TextField>[0], string>  => ({
  id, name, label, initialValue,
  validation: validators.email,
  Component: TextField,
  componentProps: {
    autoComplete,
    type: 'email',
    required,
    ...props,
  }
})
export const passwordInput = <T, ID extends keyof T>(
  { 
    id, 
    name=id, 
    label=id, 
    initialValue='', 
    required=true, 
    autoComplete="current-password",
    ...props
  }: FormFieldInfo<T, ID, string> & Partial<MuiComponentProps<string>> 
): FormField<T, ID, Parameters<typeof TextField>[0], string>  => ({
  id, name, label, initialValue,
  validation: validators.password,
  Component: TextField,
  componentProps: {
    autoComplete,
    type: 'password',
    required,
    ...props,
  }
})

export interface SubmitButtonOptions {
  submitText?: string,
  submittingText?: string,
}

interface FormikSubmitButtonProps extends SubmitButtonOptions, Styled {
  formik: { isValid: boolean, dirty: boolean, isSubmitting: boolean },
  onClick?: () => void, // to handle submit in environment where html form type handleSubmit is not supported
  disabledIfUnchanged?: boolean,
}
export const FormikSubmitButton = ({ formik, disabledIfUnchanged=true, onClick, submitText, submittingText, style }: FormikSubmitButtonProps) => (
  <SubmitButton onClick={onClick} submitText={submitText} submittingText={submittingText}
    disabled={!formik.isValid || (disabledIfUnchanged && !formik.dirty)} style={style}
    submitting={formik.isSubmitting}
  />
)

interface LoadingButtonProps extends SubmitButtonOptions {
  disabled?: boolean,
  submitting?: boolean,
  onClick?: () => void,
}
export const LoadingButton = ({ disabled, submitting, onClick, submitText="Submit", submittingText="Submitting", type, style={ marginTop: 5, width: '100%' } }: LoadingButtonProps & Styled & { type?: 'submit'}) => (
  <Button color="primary" variant="contained" type={type} onClick={onClick}
    style={style}
    disabled={submitting || disabled}
  >
    <Typography component="span">{submitting ? submittingText : submitText}</Typography>
    {submitting && <CircularProgress size={11} style={{ marginLeft: 5, marginBottom: 1 }}/>}
  </Button>
)

// onClick conditionally disabled, should be child of Form in browser to ensure handleSubmit is used correctly
export const SubmitButton = ({ onClick, ...props }: LoadingButtonProps & Styled) => (
  <LoadingButton { ...props } type="submit" onClick={SUPPORTS_FORMS ? undefined : onClick}/>
)

interface FormBuilder_T <T> extends SubmitButtonOptions, Styled {
  fields: {
    [K in keyof T]: FormField<T, K>
  },
  onSubmit: (v: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (e: any) => void;
}
export const FormBuilder = <T,>({ fields, onSubmit, onSuccess, onError, style, ...options } : FormBuilder_T<T>) => {
  const [error, setError] = React.useState('')

  const validationSchema = {} as { [K in keyof T]: YupValidator } 
  const initialValues = {} as { [K in keyof T]: any } // todo, stricter typing 

  for (const id in fields) {
    validationSchema[id] = fields[id].validation
    initialValues[id] = fields[id].initialValue
  }

  return (
    <Formik initialValues={initialValues} validationSchema={Yup.object(validationSchema)} onSubmit={async (v, o) => {
      setError('')
      o.setSubmitting(true)
      try {
        await onSubmit(v)
      } catch(e: any) {
        if (typeof e === 'string') setError(e)
        else if (typeof e?.message === 'string') setError(e.message)
        else setError("An error occurred")  

        onSuccess?.()
        onError?.(e)
      }
    }}>
      {formik => (
        <Flex column flex={1} style={style}>
          <Form onSubmit={formik.handleSubmit}>
          <Flex column>
            {Object.keys(fields).map(fieldName => {
              const id = fieldName as (keyof T) & string
              const { 
                Component, 
                label,
                name,
                componentProps={},
              } = fields[id as keyof T]

              componentProps.style = componentProps.style ?? {
                width: '100%',
                marginTop: 5,
                marginBottom: 5,
              }

              return (
                <Component
                  {...componentProps}                
                  id={id}
                  key={id}
                  name={name ?? id}
                  label={label ?? id}
                  required={!!componentProps?.required}
                  value={formik.values[id]}
                  onChange={formik.handleChange(id)}
                  onBlur={formik.handleBlur(id)}
                  error={formik.touched[id] && Boolean(formik.errors[id])}
                  helperText={formik.touched[id] && formik.errors[id]}
                />
              )
            })}
          </Flex>

          <Flex column>
            <Flex>
              <FormikSubmitButton formik={formik} onClick={formik.handleSubmit} {...options}/>
            </Flex>
            <Flex>
            {error ? <Typography color="error">{error}</Typography> : null}
            </Flex>
          </Flex>
          </Form>
        </Flex>
     )}
   </Formik>
  )
}
