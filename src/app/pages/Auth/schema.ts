import * as Yup from 'yup'

export interface AuthFormValues {
  identifier: string
  password: string
}

export const schema = Yup.object().shape({
  identifier: Yup.string()
    .trim()
    .required('Email is required'),
  password: Yup.string()
    .trim()
    .required('Password is required'),
})
