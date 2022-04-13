import React, { useCallback, useContext, useState } from "react"
import { useDropzone } from 'react-dropzone'

import {
  FileBlob,
  FileDetails,
  ReactNativeFile,
} from "@tellescope/types-utilities"

import {
  File as FileClientType,
} from "@tellescope/types-client"

import { 
  Session, 
} from "@tellescope/sdk"

import {
  Flex,
} from "./layout"
import {
  Styled,
  // Button,
  Typography,
} from "./mui"
import {
  SubmitButtonOptions,
} from "./forms"
import {
  useResolvedSession,
  EnduserSessionContext,
  SessionContext,
} from "./authentication"
import { LoadingButton } from "."

export {
  FileBlob,
}

interface DropzoneContentProps extends Styled {
  isDragActive: boolean,
  file?: FileDetails,
}
export const DefaultDropzoneContent = ({ isDragActive, file, style } : DropzoneContentProps & Styled) => (
  <Flex flex={1} style={{ 
    ...style,  
    ...isDragActive ? { border: '1px dashed gray' } : {}
  }}>
    <Typography style={{ cursor: 'pointer' }}>
    {   isDragActive ? "Drop to select file"
      : file         ? `${file.name} selected!`
                      : "Select a File"}
    </Typography> 
  </Flex>
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

export const useFileDropzone = ({ DropzoneComponent=DefaultDropzoneContent, style={} as React.CSSProperties } ) => {
  const [file, setFile] = useState(undefined as FileBlob | undefined)

  return {
    file, setFile,
    dropzone: <FileDropzone file={file} onChange={setFile} DropzoneComponent={DropzoneComponent} dropzoneStyle={style}/>
  }
}

type FileUploadHandler = (details: FileDetails, file: Blob | Buffer | ReactNativeFile, options?: {}) => Promise<FileClientType>
interface UseFileUploaderOptions {
  enduserId?: string
}
export const useFileUpload = (o={} as UseFileUploaderOptions) => {
  const { enduserId } = o
  const session = useResolvedSession()

  const [uploading, setUploading] = useState(false)

  const handleUpload: FileUploadHandler = useCallback(async (details, file) => {
    setUploading(true)
    try {
      const createdFile = await session.prepare_and_upload_file({ ...details, enduserId }, file) 
      return createdFile
    } catch(err) {
      throw err
    } finally {
      setUploading(false)
    }
  }, [session, setUploading])

  return {
    handleUpload,
    uploading,
  }
}

export const UploadButton = ({ file, details, handleUpload, uploading } : { file : FileBlob | undefined, handleUpload: FileUploadHandler, uploading: boolean, details: FileDetails }) => (
  <LoadingButton disabled={!file || uploading} submitText="Upload" submittingText="Uploading"
    onClick={() => {
      if (!file) return
      handleUpload(
        { name: details.name, size: details.size, type: details.type }, // allows passing a File as details without issue
        file
      )
    }}
  />
)

export const useDisplayPictureUploadForSelf = (o={} as UseFileUploaderOptions) => {
  const session = useResolvedSession()
  const { updateUserInfo } = useContext(SessionContext)
  const { updateUserInfo: updateEnduserInfo } = useContext(EnduserSessionContext)

  const { uploading, handleUpload: hookHandleUpload  } = useFileUpload(o)
  const [updating, setUpdating] = useState(false)

  const handleUpload: FileUploadHandler = useCallback(async (details, file, options) => {
    setUpdating(true)

    const { secureName, ...fileInfo } = await hookHandleUpload(details, file, options)
    try {
      if (session instanceof Session) {
        await updateUserInfo({ avatar: secureName })
      } else {
        await updateEnduserInfo({ avatar: secureName })
      }
    } catch(err) {
      throw (err)
    } finally {
      setUpdating(false)
    }

    return { secureName, ...fileInfo }
  }, [session])

  return {
    handleUpload,
    updating: updating || uploading,
  }
}

export interface FileUploaderProps extends SubmitButtonOptions, UseFileUploaderOptions {
  onUpload?: (file: FileClientType) => void,
}
export const FileUploader = ({
  submitText="Upload",
  submittingText="Uploading",
  onUpload,
  style,
  enduserId,
  dropzoneStyle,
  variant,
  ...uploadOptions
}: FileUploaderProps & Styled & { dropzoneStyle?: React.CSSProperties }) => {
  const { handleUpload, uploading } = useFileUpload(uploadOptions)
  const [file, setFile] = useState<FileBlob | undefined>(undefined)

  return (
    <Flex column style={style}>
      <FileDropzone file={file} onChange={setFile} dropzoneStyle={dropzoneStyle}/>

      <LoadingButton variant={variant}
        onClick={async () => {
          if (!file) return
          const uploadedFile = await handleUpload({ 
            name: file.name, type: file.type, size: file.size, enduserId 
          }, file)
          onUpload?.(uploadedFile)
        }}
        submitText={submitText} submittingText={submittingText} 
        disabled={file === undefined} submitting={uploading} 
      />
    </Flex>
  )
}
