import React, { useCallback, useContext, useState } from "react"
import { useDropzone } from 'react-dropzone'

import {
  FileBlob,
} from "@tellescope/types-utilities"

import { 
  EnduserSession, 
  Session, 
} from "@tellescope/sdk"

import {
  Flex,
  Form,
} from "./layout"
import {
  Styled,
  // Button,
  Typography,
} from "./mui"
import {
  SubmitButtonOptions,
  SubmitButton,
} from "./forms"
import {
  useResolvedSession,
  EnduserSessionContext,
  SessionContext,
} from "./authentication"

export {
  FileBlob,
}

interface DropzoneContentProps extends Styled {
  isDragActive: boolean,
  file?: FileBlob,
}
export const DefaultDropzoneContent = ({ isDragActive, file } : DropzoneContentProps) => (
  <Typography style={{ cursor: 'pointer' }}>
  {   isDragActive ? "Drop to select file"
    : file         ? `${file.name} selected!`
                    : "Select a File"}
  </Typography> 
)

export interface FileSelector extends Styled {
  file: FileBlob | undefined,
  onChange: (f: FileBlob | undefined) => void;
  dropzoneStyle?: React.CSSProperties;
  DropzoneComponent?: React.JSXElementConstructor<DropzoneContentProps>
}
export const FileDropzone = ({ file, style, dropzoneStyle, onChange, DropzoneComponent=DefaultDropzoneContent } : FileSelector) => {
  const onDrop = useCallback(acceptedFiles => { 
    const newFile = acceptedFiles.pop()
    onChange(newFile)
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({onDrop})

  return (
    <div {...getRootProps()} style={style}>
      <input {...getInputProps({ multiple: false })} />
      <DropzoneComponent isDragActive={isDragActive} file={file} style={dropzoneStyle}/>
    </div>
  )
}


type FileUploadHandler = (file: FileBlob, options?: {}) => Promise<{ secureName: string }>
interface UseFileUploaderOptions {}
export const useFileUpload = (o={} as UseFileUploaderOptions) => {
  const session = useResolvedSession()

  const [uploading, setUploading] = useState(false)

  const handleUpload: FileUploadHandler = useCallback(async (file) => {
    setUploading(true)
    const { secureName } = await session.prepare_and_upload_file(file) 
    setUploading(false)

    return { secureName }
  }, [session, setUploading])

  return {
    handleUpload,
    uploading,
  }
}

export const useDisplayPictureUploadForSelf = (o={} as UseFileUploaderOptions) => {
  const session = useResolvedSession()
  const { setSession } = useContext(SessionContext)

  const { uploading, handleUpload: hookHandleUpload  } = useFileUpload(o)
  const [updating, setUpdating] = useState(false)

  const handleUpload: FileUploadHandler = useCallback(async (file, options) => {
    setUpdating(true)

    const { secureName } = await hookHandleUpload(file, options)
    if (session instanceof Session) {
      await session.api.users.updateOne(session.userInfo.id, { avatar: secureName })
      await session.refresh_session() // refresh session to include new avatar in userInfo, authToken
      setSession(s => ({ ...s })) // ensure state resets
    } else {
      // TODO: update self
      // await session.api.endusers.updateOne(session.userInfo.id, { avatar: secureName })
    }

    setUpdating(false)
    return { secureName }
  }, [session])

  return {
    handleUpload,
    updating,
  }
}

export interface FileUploaderProps extends SubmitButtonOptions, UseFileUploaderOptions {}
export const FileUploader = ({
  submitText="Upload",
  submittingText="Upload",
  ...uploadOptions
}: FileUploaderProps) => {
  const { handleUpload, uploading } = useFileUpload(uploadOptions)
  const [file, setFile] = useState<FileBlob | undefined>(undefined)

  return (
    <Flex column>
    <Form onSubmit={() => file && handleUpload(file)}>
      <FileDropzone file={file} onChange={setFile}/>

      <SubmitButton 
        submitText={submitText} submittingText={submittingText} 
        disabled={file === undefined} submitting={uploading} 
      />
    </Form>
    </Flex>
  )
}
