import React, { HTMLInputTypeAttribute, CSSProperties } from "react"

import Button from "@mui/material/Button"
import CircularProgress from '@mui/material/CircularProgress';
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

import { Formik, FormikProps, FormikHelpers  } from 'formik';
import * as Yup from 'yup';

import {
  Flex,
} from "./layout.web"

type AutoComplete = "name"
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
  onChange: (e: { target: { value: V } } ) => void,
  onBlur: (e: any) => void,
  required: boolean,
  type?: HTMLInputTypeAttribute,
  style?: CSSProperties,
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
  Component: (props: CFormik & P) => React.ReactElement,
  componentProps?: Partial<CMui & P>,
}

export const emailInput = <T, ID extends keyof T>(
  { id, name=id, label=id, initialValue='', required=true, autoComplete="username" }: FormFieldInfo<T, ID, string> & Partial<MuiComponentProps<string>> 
): FormField<T, ID, React.ComponentProps<typeof TextField>, string>  => ({
  id, name, label, initialValue,
  validation: validators.email,
  Component: TextField,
  componentProps: {
    autoComplete,
    type: 'email',
    required,
  }
})
export const passwordInput = <T, ID extends keyof T>(
  { id, name=id, label=id, initialValue='', required=true, autoComplete="current-password" }: FormFieldInfo<T, ID, string> & Partial<MuiComponentProps<string>> 
): FormField<T, ID, React.ComponentProps<typeof TextField>, string>  => ({
  id, name, label, initialValue,
  validation: validators.password,
  Component: TextField,
  componentProps: {
    autoComplete,
    type: 'password',
    required,
  }
})

interface SubmitButtonOptions {
  submitText?: string,
  submittingText?: string,
  style?: CSSProperties,
}

interface SubmitButton_T extends SubmitButtonOptions {
  formik: FormikProps<any>,

}
const SubmitButton = ({ formik, submitText="Submit", style={ marginTop: 5 } }: SubmitButton_T) => {
  return (
    <Button color="primary" variant="contained" fullWidth type="submit" disabled={formik.isSubmitting || !formik.isValid || !formik.dirty} style={style}>
      <Flex alignContent="center" alignItems="center">
        <Typography component="span"> {submitText} </Typography>
        {formik.isSubmitting && <CircularProgress size={13} style={{ marginLeft: 5 }}/>}
      </Flex>
    </Button>
  )
}

interface FormBuilder_T <T> extends SubmitButtonOptions {
  fields: {
    [K in keyof T]: FormField<T, K>
  },
  onSubmit: (v: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (e: any) => void;
}
export const FormBuilder = <T,>({ fields, onSubmit, onSuccess, onError, ...options } : FormBuilder_T<T>) => {
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
        <div>
        <form onSubmit={formik.handleSubmit}>
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
              margin: "5px 0",
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
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched[id] && Boolean(formik.errors[id])}
                helperText={formik.touched[id] && formik.errors[id]}
              />
            )
          })}

          <SubmitButton formik={formik} {...options}/>
          {error && <Typography color="error">{error}</Typography>}
        </form>
        </div>

     )}
   </Formik>
  )
}
