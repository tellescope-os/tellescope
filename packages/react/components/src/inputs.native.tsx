import React from "react"

import {
  FileUploaderProps,
  useDisplayPictureUploadForSelf,
  useFileUpload,
} from "./inputs.js"

export { useDisplayPictureUploadForSelf, useFileUpload }

export const FileDropzone = () => {
  throw new Error("Dropzone is not supported in Native")
}

export const FileUploader = (p: FileUploaderProps) => {
  throw new Error("Unimplemented")
}