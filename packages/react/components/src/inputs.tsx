import React, { useCallback, useState } from "react"
import { useDropzone } from 'react-dropzone'

import {
  FileBlob,
} from "@tellescope/types-utilities"

import {
  Flex,
  Form,
} from "./layout"
import {
  // Button,
  Typography,
} from "./mui"
import {
  SubmitButtonOptions,
  SubmitButton,
} from "./forms"
import { 
  EnduserSession, 
  Session 
} from "@tellescope/sdk"

export interface FileSelector {
  file: FileBlob | undefined,
  onChange: (f: FileBlob | undefined) => void;
}

export const FileDropzone = ({ file, onChange } : FileSelector) => {
  const onDrop = useCallback(acceptedFiles => { 
    const newFile = acceptedFiles.pop()
    onChange(newFile)
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({onDrop})

  return (
    <Flex {...getRootProps()}>
      <input {...getInputProps({ multiple: false })}  />
      {
        <Typography> 
        {   isDragActive ? "Drop to select file"
          : file         ? `${file.name} selected!`
                          : "Select a File"}
        </Typography> 
      }
    </Flex>
  )
}

export interface FileUploaderProps extends SubmitButtonOptions {
  session: Session | EnduserSession,
  onUpload: (secureName: string) => void;
}
export const FileUploader = ({
  session,
  onUpload,
  submitText="Upload",
  submittingText="Upload",
}: FileUploaderProps) => {
  const [file, setFile] = useState<FileBlob | undefined>(undefined)
  const [uploading, setUploading] = useState(false)

  const handleUpload = useCallback(async () => {
    if (file === undefined) return
    const { name, size, type } = file

    setUploading(true)
    const { presignedUpload, file: { secureName } } = await session.api.files.prepare_file_upload({ name, size, type })
    await session.UPLOAD(presignedUpload, file)
    setUploading(false)

    onUpload(secureName)

  }, [file, onUpload, setUploading])

  return (
    <Flex column>
    <Form onSubmit={handleUpload}>
      <FileDropzone file={file} onChange={setFile}/>

      <SubmitButton 
        submitText={submitText} submittingText={submittingText} 
        disabled={file === undefined} submitting={uploading} 
      />
    </Form>
    </Flex>
  )
}