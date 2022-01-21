import React, { useEffect, useRef, useState } from "react"

import { Avatar, AvatarProps, Styled } from "./mui"
import { useResolvedSession } from "./authentication"
import { APIError } from "."


interface DisplayPictureProps extends AvatarProps {
  user?: { id: string, avatar?: string };
  onError?: (e: APIError) => void;
}
export const DisplayPicture = ({ user, onError, ...avatarProps } : DisplayPictureProps & Styled) => {
  const session = useResolvedSession()

  const [loadedImage, setLoadedImage] = useState({ uri: '', cacheKey: '' })
  const fetchRef = useRef({ } as { [index: string]: boolean })

  const cacheKey = (user?.id ?? '') + (user?.avatar ?? '')

  useEffect(() => {
    if (!user?.avatar) return

    if (loadedImage.cacheKey === cacheKey) return 
    if (fetchRef.current[cacheKey]) return // already fetching
    fetchRef.current[cacheKey] = true

    session?.api.files.file_download_URL({ secureName: user.avatar })
    .then(({ downloadURL }) => setLoadedImage({ uri: downloadURL, cacheKey }))
    .catch(err => {
      if (onError) onError?.(err)
      else console.warn("Error getting url for DisplayPicture", err)
    })
    
  }, [cacheKey, fetchRef, user, loadedImage, onError, session])

  // if user doesn't have picture, or it's still loading
  if (loadedImage.cacheKey === '') return <Avatar {...avatarProps}/>

  return (
    <Avatar {...avatarProps} src={loadedImage.uri}/>
  )
}
