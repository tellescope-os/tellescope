import React, { useEffect, useRef, useState } from "react"

import { Avatar, AvatarProps, Styled } from "./mui"
import { useResolvedSession } from "./authentication"
import { Image, ImageDimensions } from "./layout"
import { APIErrorHandler } from "@tellescope/types-utilities"

// supports actual secureName as well as URL values
const useSecureImage = ({ 
  secureName, 
  onError,
  cacheKey=secureName 
}: { secureName: string, onError?: APIErrorHandler, cacheKey?: string }) => {
  const session = useResolvedSession()
  const [loadedImage, setLoadedImage] = useState({ uri: '', cacheKey: '' })
  const fetchRef = useRef({ } as { [index: string]: boolean })

  useEffect(() => {
    if (!secureName) return
    if (secureName.startsWith('http')) return // not actually a secureName

    if (loadedImage.cacheKey === cacheKey) return 
    if (fetchRef.current[cacheKey]) return // already fetching
    fetchRef.current[cacheKey] = true

    session?.api.files.file_download_URL({ secureName })
    .then(({ downloadURL }) => setLoadedImage({ uri: downloadURL, cacheKey }))
    .catch(err => {
      if (onError) onError?.(err)
      else console.warn("Error getting url for DisplayPicture", err)
    })
    
  }, [cacheKey, fetchRef, secureName, loadedImage, onError, session])

  return secureName.startsWith('http') ? secureName : loadedImage.uri
}


export const SecureImage = ({ secureName, placeholder, ...props } : { placeholder?: React.ReactElement, secureName: string, alt?: string } & ImageDimensions) => {
const loadedImage = useSecureImage({ secureName })

  // if user doesn't have picture, or it's still loading
  if (loadedImage === '') return placeholder ?? null

  return (
    <Image src={loadedImage} {...props} />
  )
}

export interface DisplayPictureProps extends AvatarProps {
  user?: { id: string, avatar?: string } | null;
  onError?: APIErrorHandler;
  alt?: string,
}
export const DisplayPicture = ({ user, onError, ...avatarProps } : DisplayPictureProps & Styled) => {
  const loadedImage = useSecureImage({ 
    secureName: user?.avatar ?? '',
    cacheKey: (user?.id ?? '') + (user?.avatar ?? ''),
  })

  // if user doesn't have picture, or it's still loading
  if (loadedImage === '') return <Avatar {...avatarProps}/>

  return (
    <Avatar {...avatarProps} src={loadedImage} />
  )
}
